<?php

namespace Tests\Feature;

use App\Jobs\AnalyzeWorkloadRun;
use App\Models\User;
use App\Models\WorkloadImport;
use App\Services\Analysis\AiOutputValidator;
use App\Services\Analysis\AnalysisException;
use App\Services\Analysis\AnalysisExportService;
use App\Services\Analysis\AnalysisReportService;
use App\Services\Analysis\AnalysisRunService;
use App\Services\Workload\WorkloadSummaryService;
use Database\Seeders\ActivityGroupSeeder;
use Illuminate\Contracts\Queue\Job;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\UploadedFile;
use Illuminate\Queue\WorkerOptions;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Tests\TestCase;

class AnalysisTest extends TestCase
{
    use RefreshDatabase;

    private function dataset(): WorkloadImport
    {
        Storage::fake('local');
        config(['ftemation.ai.api_key' => 'test-only', 'ftemation.ai.retry_delay_ms' => 0, 'ftemation.ai.ca_bundle' => null]);
        Queue::fake();
        Cache::flush();
        $this->seed(ActivityGroupSeeder::class);
        $this->actingAs(User::factory()->create());
        $this->postJson('/api/imports', ['file' => new UploadedFile(base_path('samples/FTEMation_Workload_Dataset_v1.xlsx'), 'reference.xlsx', null, null, true)])->assertCreated();

        return WorkloadImport::firstOrFail();
    }

    private function answer(array $input): array
    {
        if (isset($input['activities'])) {
            return ['activities' => array_map(fn ($a) => [
                'activity_id' => $a['activity_id'], 'automation_level' => 'medium', 'group_id' => 'assisted_classification',
                'reason' => 'Test fixture: proses memerlukan pemeriksaan manusia.', 'recommendation' => 'Test fixture: bantu klasifikasi dan pertahankan review manusia.',
                'factors' => ['repetitiveness' => 'high', 'rule_clarity' => 'medium', 'data_structure' => 'medium', 'human_judgment' => 'medium', 'operational_risk' => 'medium'],
                'implementation_effort' => 'medium', 'automation_scope' => 'partial_steps', 'human_oversight_required' => true, 'oversight_note' => 'Petugas memeriksa hasil sebelum keputusan akhir.',
            ], $input['activities'])];
        }
        $result = [];
        foreach (['employees' => 'employee_id', 'departments' => 'department'] as $type => $key) {
            $result[$type] = array_map(fn ($e) => [$key => $e[$key], 'summary' => 'Test fixture: workload administratif dapat dibantu sistem dengan pemeriksaan manusia.', 'opportunities' => 'Mulai dari bantuan klasifikasi dokumen terstruktur.', 'oversight_note' => 'Persetujuan final tetap dilakukan petugas berwenang.'], $input[$type]);
        }

        return $result;
    }

    private function fakeProvider(): void
    {
        Http::swap(new Factory);
        Http::fake(function ($request) {
            $this->assertSame(['type' => 'disabled'], $request['thinking']);
            $input = json_decode($request['messages'][1]['content'], true);

            return Http::response(['model' => 'test-fixture', 'choices' => [['finish_reason' => 'stop', 'message' => ['content' => json_encode($this->answer($input))]]], 'usage' => ['prompt_tokens' => 10, 'completion_tokens' => 20]]);
        });
    }

    private function finish($run): void
    {
        for ($i = 0; $i < 15 && in_array($run->refresh()->status, ['queued', 'processing']); $i++) {
            app(AnalysisRunService::class)->step($run);
        }
    }

    public function test_database_worker_retries_lock_contention_without_repeating_successes(): void
    {
        $realQueue = app('queue');
        $import = $this->dataset();
        $this->fakeProvider();
        $service = app(AnalysisRunService::class);
        $run = $service->start($import);
        $service->step($run);
        $first = $run->analyses()->where('status', 'success')->pluck('attempts', 'id')->all();
        // Use the real database queue and Worker: direct handle() misses the attempts bug.
        Queue::swap($realQueue);
        $queue = app('queue')->connection('database');
        $queue->pushOn('regression', new AnalyzeWorkloadRun($run->id));
        $lock = Cache::lock('analysis-run:'.$run->id, 400);
        $this->assertTrue($lock->get());
        $worker = app('queue.worker');
        $options = new WorkerOptions(sleep: 0);
        $worker->runNextJob('database', 'regression', $options);
        $this->assertSame(1, DB::table('jobs')->where('queue', 'regression')->value('attempts'));
        $this->assertSame(5, $run->analyses()->where('status', 'success')->count());
        Http::assertSentCount(1);
        $lock->release();
        $this->travel(16)->seconds();
        $worker->runNextJob('database', 'regression', $options);
        $this->assertSame('processing', $run->refresh()->status);
        $this->assertSame(10, $run->analyses()->where('status', 'success')->count());
        $this->finish($run);
        $this->assertSame('completed', $run->refresh()->status);
        $this->assertSame($first, $run->analyses()->whereIn('id', array_keys($first))->pluck('attempts', 'id')->all());
        Http::assertSentCount(13);
    }

    public function test_summary_uses_latest_completed_snapshot_even_when_new_run_is_processing(): void
    {
        $import = $this->dataset();
        $summary = app(WorkloadSummaryService::class);
        $baseline = $summary->summarize($import);
        $this->assertNull($baseline['analysis_run_id']);
        $this->assertEqualsWithDelta(4.4671875, $baseline['total_fte'], 1e-12);
        $this->fakeProvider();
        $service = app(AnalysisRunService::class);
        $first = $service->start($import);
        $this->finish($first);
        $this->assertSame($first->id, $summary->summarize($import)['analysis_run_id']);
        foreach ([['ftemation.annual_capacity_minutes' => 230400], ['ftemation.saving_rates.medium' => .2]] as $change) {
            config($change);
            $actual = $summary->summarize($import);
            $report = app(AnalysisReportService::class)->build($first);
            $this->assertEqualsWithDelta($report['totals']['total_fte'], $actual['total_fte'], 1e-12);
            $this->assertSame($report['calculation'], $actual['calculation']);
            $this->assertSame($report['departments'], $actual['departments']->all());
            $this->assertEqualsWithDelta($report['totals']['remaining_fte'], $actual['remaining_fte'], 1e-12);
            $this->assertEqualsWithDelta($report['totals']['estimated_fte_saving'], $actual['estimated_fte_saving'], 1e-12);
        }
        $second = $service->start($import);
        $this->finish($second);
        $this->assertSame($second->id, $summary->summarize($import)['analysis_run_id']);
        $third = $service->start($import);
        $service->step($third);
        $actual = $summary->summarize($import);
        $this->assertSame('processing', $actual['analysis_status']);
        $this->assertSame($second->id, $actual['analysis_run_id']);
        $this->assertEqualsWithDelta(4.4671875 / 2, $actual['total_fte'], 1e-12);
        $this->assertEqualsWithDelta(4.4671875 / 2 * .2, $actual['estimated_fte_saving'], 1e-12);
    }

    public function test_fatal_worker_failure_preserves_success_and_stops_after_one_exception(): void
    {
        $realQueue = app('queue');
        $import = $this->dataset();
        $this->fakeProvider();
        $service = app(AnalysisRunService::class);
        $run = $service->start($import);
        $service->step($run);
        $this->mock(AnalysisRunService::class, function ($mock) use ($service) {
            $mock->shouldReceive('step')->once()->andThrow(new \RuntimeException('isolated fatal fixture'));
            $mock->shouldReceive('fail')->once()->andReturnUsing(fn ($run, $message) => $service->fail($run, $message));
        });
        Queue::swap($realQueue);
        $realQueue->connection('database')->pushOn('fatal', new AnalyzeWorkloadRun($run->id));
        app('queue.worker')->setCache(Cache::store());
        app('queue.worker')->runNextJob('database', 'fatal', new WorkerOptions(sleep: 0));
        $this->assertSame('partial_failed', $run->refresh()->status);
        $this->assertSame(5, $run->analyses()->where('status', 'success')->count());
        $this->assertSame(55, $run->analyses()->where('status', 'failed')->count());
        $this->assertSame(0, DB::table('jobs')->where('queue', 'fatal')->count());
    }

    public function test_second_worker_cannot_enter_batch_while_first_provider_request_is_in_flight(): void
    {
        $import = $this->dataset();
        $service = app(AnalysisRunService::class);
        $run = $service->start($import);
        $second = new AnalyzeWorkloadRun($run->id);
        $queueJob = \Mockery::mock(Job::class);
        $queueJob->shouldReceive('release')->once()->with(15);
        $second->setJob($queueJob);
        Http::fake(function ($request) use ($second, $service) {
            // Deterministic worker interleaving while the first holds its lock.
            $second->handle($service);
            $input = json_decode($request['messages'][1]['content'], true);

            return Http::response(['model' => 'test-fixture', 'choices' => [['finish_reason' => 'stop', 'message' => ['content' => json_encode($this->answer($input))]]]]);
        });
        (new AnalyzeWorkloadRun($run->id))->handle($service);
        Http::assertSentCount(1);
        $this->assertSame(5, $run->analyses()->where('status', 'success')->count());
        $this->assertSame(5, $run->analyses()->sum('attempts'));
    }

    public function test_contention_has_a_finite_database_queue_attempt_budget(): void
    {
        $realQueue = app('queue');
        $import = $this->dataset();
        Http::preventStrayRequests();
        $run = app(AnalysisRunService::class)->start($import);
        Queue::swap($realQueue);
        $realQueue->connection('database')->pushOn('bounded', new AnalyzeWorkloadRun($run->id));
        $lock = Cache::lock('analysis-run:'.$run->id, 400);
        $lock->get();
        DB::table('jobs')->where('queue', 'bounded')->update(['attempts' => 40]);
        app('queue.worker')->runNextJob('database', 'bounded', new WorkerOptions(sleep: 0));
        $this->assertSame(0, DB::table('jobs')->where('queue', 'bounded')->count());
        $this->assertSame('queued', $run->refresh()->status);
        $lock->release();
        $this->travel(11)->minutes();
        $this->getJson("/api/analyses/{$run->id}")->assertOk()->assertJsonPath('can_retry', true);
        Http::assertNothingSent();
    }

    public function test_exhausted_duplicate_cannot_fail_locked_or_completed_run(): void
    {
        $import = $this->dataset();
        $this->fakeProvider();
        $run = app(AnalysisRunService::class)->start($import);
        $job = new AnalyzeWorkloadRun($run->id);
        $this->assertSame(40, $job->tries);
        $lock = Cache::lock('analysis-run:'.$run->id, 400);
        $lock->get();
        $job->failed(new \RuntimeException('duplicate'));
        $this->assertSame('queued', $run->refresh()->status);
        $lock->release();
        $this->finish($run);
        $job->failed(new \RuntimeException('late duplicate'));
        $this->assertSame('completed', $run->refresh()->status);
    }

    public function test_full_pipeline_exports_and_cache_use_laravel_calculations(): void
    {
        $import = $this->dataset();
        $this->fakeProvider();
        $service = app(AnalysisRunService::class);
        $run = $service->start($import);
        $this->assertSame($run->id, $service->start($import)->id);
        $this->getJson("/api/analyses/{$run->id}/export/json")->assertStatus(409);
        $this->finish($run);
        $this->assertSame('completed', $run->refresh()->status);
        Http::assertSentCount(13);
        $r = $this->getJson("/api/analyses/{$run->id}")->assertOk()->json('report');
        $this->assertCount(60, $r['activities']);
        $this->assertCount(12, $r['employees']);
        $this->assertCount(3, $r['departments']);
        $this->assertEqualsWithDelta(4.4671875, $r['totals']['total_fte'], 1e-12);
        $this->assertEqualsWithDelta(4.4671875 * .3, $r['totals']['estimated_fte_saving'], 1e-12);
        $this->getJson("/api/analyses/{$run->id}/export/json")->assertOk()->assertDownload('results.json')->assertJsonCount(60, 'activities');
        $this->get("/api/analyses/{$run->id}/export/pdf")->assertOk()->assertHeader('content-type', 'application/pdf');
        $xlsx = $this->get("/api/analyses/{$run->id}/export/xlsx")->assertOk()->streamedContent();
        $this->assertStringStartsWith('PK', $xlsx);
        $second = $service->start($import);
        $this->finish($second);
        $this->assertSame('completed', $second->refresh()->status);
        $this->assertSame(60, $second->analyses()->where('cache_hit', true)->count());
        Http::assertSentCount(13);
        $this->actingAs(User::factory()->create());
        $this->getJson("/api/analyses/{$run->id}")->assertNotFound();
        $this->postJson("/api/analyses/{$run->id}/retry")->assertNotFound();
        $this->getJson("/api/analyses/{$run->id}/export/json")->assertNotFound();
        $this->getJson("/api/analyses/{$run->id}/export/xlsx")->assertNotFound();
        $this->getJson("/api/analyses/{$run->id}/export/pdf")->assertNotFound();
        $this->postJson("/api/imports/{$import->id}/analyses")->assertNotFound();
    }

    public function test_retry_recovers_failed_batch_without_repeating_successes(): void
    {
        $import = $this->dataset();
        Http::fake(['*' => Http::response([], 503)]);
        $service = app(AnalysisRunService::class);
        $run = $service->start($import);
        $service->step($run);
        $this->assertSame(5, $run->analyses()->where('status', 'failed')->count());
        Http::assertSentCount(3);
        $this->fakeProvider();
        $this->finish($run);
        $this->assertSame('partial_failed', $run->refresh()->status);
        $this->assertSame(55, $run->analyses()->where('status', 'success')->count());
        $this->getJson("/api/analyses/{$run->id}/export/json")->assertStatus(409);
        $service->retry($run);
        $this->finish($run);
        $this->assertSame('completed', $run->refresh()->status);
        $this->assertSame(2, $run->analyses()->first()->attempts);
    }

    public function test_invalid_json_is_retried_and_authentication_failure_stops_run(): void
    {
        $import = $this->dataset();
        $service = app(AnalysisRunService::class);
        $run = $service->start($import);
        Http::fake(['*' => Http::response(['choices' => [['finish_reason' => 'stop', 'message' => ['content' => '{bad']]]])]);
        $service->step($run);
        Http::assertSentCount(3);
        $this->assertSame(5, $run->analyses()->where('status', 'failed')->count());
        Http::swap(new Factory);
        Http::fake(['*' => Http::response([], 401)]);
        $service->step($run);
        $this->assertSame('failed', $run->refresh()->status);
        $this->assertSame(60, $run->analyses()->where('status', 'failed')->count());
    }

    public function test_validator_rejects_unknown_ids_groups_numbers_and_missing_oversight(): void
    {
        $validator = app(AiOutputValidator::class);
        $valid = $this->answer(['activities' => [['activity_id' => 'A']]]);
        foreach (['id', 'group', 'oversight', 'numeric', 'scope'] as $case) {
            $data = $valid;
            match ($case) {
                'id' => $data['activities'][0]['activity_id'] = 'UNKNOWN',
                'group' => $data['activities'][0]['group_id'] = 'invented',
                'oversight' => [$data['activities'][0]['factors']['operational_risk'] = 'high', $data['activities'][0]['human_oversight_required'] = false],
                'numeric' => $data['activities'][0]['fte'] = 99,
                'scope' => $data['activities'][0]['automation_scope'] = 'assist_only',
            };
            try {
                $validator->activities($data, ['A'], ['assisted_classification']);
                $this->fail($case);
            } catch (AnalysisException) {
                $this->assertTrue(true);
            }
        }
    }

    public function test_cache_reuse_recalculates_saving_when_assumptions_change(): void
    {
        $import = $this->dataset();
        $this->fakeProvider();
        $service = app(AnalysisRunService::class);
        $first = $service->start($import);
        $this->finish($first);
        config(['ftemation.saving_rates.medium' => .2]);
        $second = $service->start($import);
        $this->finish($second);
        $this->assertSame(60, $second->analyses()->where('cache_hit', true)->count());
        $report = $this->getJson("/api/analyses/{$second->id}")->assertOk()->json('report');
        $this->assertEqualsWithDelta(4.4671875 * .2, $report['totals']['estimated_fte_saving'], 1e-12);
        // Activity cache is reusable; the changed aggregates require a fresh summary.
        Http::assertSentCount(14);
    }

    public function test_summary_failure_can_retry_without_reanalyzing_activities(): void
    {
        $import = $this->dataset();
        $this->fakeProvider();
        $service = app(AnalysisRunService::class);
        $run = $service->start($import);
        for ($i = 0; $i < 12; $i++) {
            $service->step($run);
        }
        Http::swap(new Factory);
        Http::fake(['*' => Http::response(['choices' => [['finish_reason' => 'length', 'message' => ['content' => '{}']]]])]);
        $service->step($run);
        $this->assertSame('partial_failed', $run->refresh()->status);
        $this->assertSame('failed', $run->summary_status);
        $this->assertSame(60, $run->analyses()->where('status', 'success')->count());
        $this->getJson("/api/analyses/{$run->id}/export/json")->assertStatus(409);
        $this->fakeProvider();
        $service->retry($run);
        $this->finish($run);
        $this->assertSame('completed', $run->refresh()->status);
        Http::assertSentCount(1);
    }

    public function test_summary_validator_rejects_missing_entities_and_fabricated_numbers(): void
    {
        $v = app(AiOutputValidator::class);
        $valid = $this->answer(['employees' => [['employee_id' => 'E']], 'departments' => [['department' => 'D']]]);
        foreach (['missing', 'number'] as $case) {
            $data = $valid;
            if ($case === 'missing') {
                $data['employees'] = [];
            } else {
                $data['departments'][0]['summary'] .= ' Saving 99 FTE.';
            }
            try {
                $v->summaries($data, ['E'], ['D']);
                $this->fail($case);
            } catch (AnalysisException) {
                $this->assertTrue(true);
            }
        }
    }

    public function test_spreadsheet_exports_user_text_as_literal_not_formula(): void
    {
        $response = app(AnalysisExportService::class)->download([
            'run_id' => 1, 'totals' => ['total_fte' => 1.25], 'employees' => [], 'departments' => [], 'groups' => [],
            'activities' => [['activity_name' => '=HYPERLINK("https://example.com")', 'fte' => .1875]], 'calculation' => [],
        ], 'xlsx');
        ob_start();
        $response->sendContent();
        $bytes = ob_get_clean();
        $path = tempnam(sys_get_temp_dir(), 'fte-export-');
        file_put_contents($path, $bytes);
        try {
            $book = IOFactory::load($path);
            $this->assertSame('s', $book->getSheetByName('Activities')->getCell('A2')->getDataType());
            $this->assertSame(.1875, $book->getSheetByName('Activities')->getCell('B2')->getValue());
        } finally {
            unlink($path);
        }
    }
}
