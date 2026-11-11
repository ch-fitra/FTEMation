<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\User;
use App\Models\WorkloadImport;
use App\Services\Workload\WorkloadWorkbookReader;
use Database\Seeders\ActivityGroupSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

class WorkloadImportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->actingAs(User::factory()->create());
    }

    private function reference(string $name = 'FTEMation_Workload_Dataset_v1.xlsx'): UploadedFile
    {
        return new UploadedFile(base_path('samples/'.$name), $name, null, null, true);
    }

    private function workbook(array $rows, ?array $headers = null): UploadedFile
    {
        $workbook = new Spreadsheet;
        $workbook->getActiveSheet()->setTitle('Workload')->fromArray([$headers ?? WorkloadWorkbookReader::HEADERS, ...$rows], null, 'A1', true);
        $path = tempnam(sys_get_temp_dir(), 'fte-test-');
        (new Xlsx($workbook))->save($path);
        $workbook->disconnectWorksheets();
        $file = UploadedFile::fake()->createWithContent('workload.xlsx', file_get_contents($path));
        unlink($path);

        return $file;
    }

    private function row(): array
    {
        return ['ACT-1', 'EMP-1', 'Demo Employee', 'Operations', 'Input record', 'Input data terstruktur dari formulir yang terverifikasi.', 'daily', 10, 9];
    }

    public function test_reference_workbook_passes_counts_precision_and_aggregation_acceptance(): void
    {
        $response = $this->postJson('/api/imports', ['file' => $this->reference()]);
        $response->assertCreated()->assertJsonPath('summary.activities_count', 60)->assertJsonPath('summary.employees_count', 12)->assertJsonPath('summary.departments_count', 3)->assertJsonPath('summary.warnings', [])->assertJsonPath('summary.estimated_fte_saving', null)->assertJsonMissingPath('import.file_path');
        $this->assertEqualsWithDelta(4.4671875, $response->json('summary.total_fte'), 1e-12);
        $this->assertDatabaseCount('activities', 60);
        $this->assertDatabaseCount('employees', 12);
        $this->assertSame('0.187500000000', Activity::where('activity_code', 'ACT-0001')->firstOrFail()->fte);
        $this->assertEqualsWithDelta(4.4671875, (float) Activity::sum('fte'), 1e-10);
        $import = WorkloadImport::firstOrFail();
        Storage::disk('local')->assertExists($import->file_path);
        $this->getJson('/api/imports/'.$import->id)->assertOk()->assertJsonPath('summary.analysis_status', 'not_started');
    }

    public function test_same_file_can_be_imported_as_separate_history(): void
    {
        $first = $this->postJson('/api/imports', ['file' => $this->reference()])->assertCreated()->json('import.id');
        $second = $this->postJson('/api/imports', ['file' => $this->reference()])->assertCreated()->json('import.id');
        $this->assertNotSame($first, $second);
        $this->assertDatabaseCount('employees', 24);
        $this->assertDatabaseCount('activities', 120);
    }

    #[DataProvider('invalidValues')]
    public function test_invalid_cells_have_row_errors_and_leave_no_partial_data(int $column, mixed $value, string $field): void
    {
        $row = $this->row();
        $row[$column] = $value;
        $this->postJson('/api/imports', ['file' => $this->workbook([$this->row(), $row])])->assertUnprocessable()->assertJsonValidationErrors("rows.3.$field");
        $this->assertDatabaseCount('activities', 0);
        $this->assertDatabaseCount('employees', 0);
        $this->assertDatabaseHas('imports', ['status' => 'failed']);
    }

    public static function invalidValues(): array
    {
        return [
            'zero' => [7, 0, 'volume'], 'negative' => [8, -2, 'duration_minutes'],
            'not numeric' => [7, 'sepuluh', 'volume'], 'too precise' => [8, 0.1234567, 'duration_minutes'],
            'invalid frequency' => [6, 'yearly', 'frequency'], 'empty description' => [5, '', 'description'],
            'formula' => [7, '=5+5', 'volume'], 'duplicate id' => [0, 'act-1', 'activity_id'],
            'inconsistent employee' => [2, 'Different Name', 'employee_id'],
            'inconsistent department' => [3, 'Finance', 'employee_id'],
        ];
    }

    public function test_invalid_headers_and_evaluation_workbook_are_rejected(): void
    {
        $headers = WorkloadWorkbookReader::HEADERS;
        $headers[0] = 'wrong_header';
        $this->postJson('/api/imports', ['file' => $this->workbook([$this->row()], $headers)])->assertUnprocessable()->assertJsonValidationErrors('header');
        $this->postJson('/api/imports', ['file' => $this->reference('FTEMation_AI_Evaluation_v1.xlsx')])->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->assertDatabaseCount('activities', 0);
    }

    public function test_empty_workbook_is_rejected_and_small_valid_workbook_has_warning(): void
    {
        $this->postJson('/api/imports', ['file' => $this->workbook([])])->assertUnprocessable();
        $this->postJson('/api/imports', ['file' => $this->workbook([$this->row()])])->assertCreated()->assertJsonCount(1, 'summary.warnings');
    }

    public function test_extra_columns_corrupt_and_oversized_uploads_are_rejected(): void
    {
        $headers = [...WorkloadWorkbookReader::HEADERS, 'extra'];
        $this->postJson('/api/imports', ['file' => $this->workbook([$this->row()], $headers)])->assertUnprocessable();
        $this->postJson('/api/imports', ['file' => UploadedFile::fake()->createWithContent('invalid.xlsx', 'Not an Excel file')])->assertUnprocessable();
        $this->postJson('/api/imports', ['file' => UploadedFile::fake()->create('large.xlsx', 5121, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')])->assertUnprocessable();
    }

    public function test_department_and_frequency_are_normalized_consistently(): void
    {
        $first = $this->row();
        $first[3] = '  Human   Resources ';
        $first[6] = ' Daily ';
        $second = $first;
        $second[0] = 'ACT-2';
        $second[3] = 'human resources';
        $this->postJson('/api/imports', ['file' => $this->workbook([$first, $second])])->assertCreated()->assertJsonPath('summary.departments_count', 1);
        $this->assertDatabaseHas('employees', ['department' => 'Human Resources']);
        $this->assertDatabaseHas('activities', ['frequency' => 'daily']);
    }

    public function test_database_failure_rolls_back_employees_and_activities(): void
    {
        $count = 0;
        Event::listen('eloquent.creating: '.Activity::class, function () use (&$count) {
            if (++$count === 2) {
                throw new RuntimeException('Simulated storage failure');
            }
        });
        try {
            $this->postJson('/api/imports', ['file' => $this->reference()])->assertStatus(503);
        } finally {
            Event::forget('eloquent.creating: '.Activity::class);
        }
        $this->assertDatabaseCount('activities', 0);
        $this->assertDatabaseCount('employees', 0);
        $this->assertDatabaseHas('imports', ['status' => 'failed']);
    }

    public function test_imports_are_private_and_activity_filters_are_paginated(): void
    {
        $id = $this->postJson('/api/imports', ['file' => $this->reference()])->assertCreated()->json('import.id');
        $this->getJson("/api/imports/$id/activities?search=ACT-0001")->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.activity_code', 'ACT-0001');
        $this->getJson("/api/imports/$id/activities?department=Operations&per_page=5&page=2")->assertOk()->assertJsonCount(5, 'data')->assertJsonPath('total', 20)->assertJsonPath('current_page', 2);
        $this->getJson("/api/imports/$id/activities?frequency=daily")->assertOk()->assertJsonPath('total', 15);
        $this->getJson("/api/imports/$id/activities?per_page=1000")->assertUnprocessable();
        $this->getJson('/api/imports')->assertOk()->assertJsonPath('total', 1)->assertJsonMissingPath('data.0.file_path');
        $this->actingAs(User::factory()->create());
        $this->getJson('/api/imports')->assertOk()->assertJsonPath('total', 0);
        $this->getJson("/api/imports/$id")->assertNotFound();
        $this->getJson("/api/imports/$id/activities")->assertNotFound();
    }

    public function test_taxonomy_seeds_exactly_twenty_fixed_groups_idempotently(): void
    {
        $this->seed(ActivityGroupSeeder::class);
        $this->seed(ActivityGroupSeeder::class);
        $this->assertDatabaseCount('activity_groups', 20);
        $this->assertDatabaseHas('activity_groups', ['code' => 'high_impact_decision']);
    }
}
