<?php

// Read-only workload verification. Never dispatches jobs or calls the provider.
use App\Models\AnalysisRun;
use App\Services\Analysis\AnalysisReportService;
use App\Services\Workload\WorkloadSummaryService;
use Illuminate\Contracts\Console\Kernel;
use PhpOffice\PhpSpreadsheet\IOFactory;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$reports = app(AnalysisReportService::class);
$checks = [];
foreach (AnalysisRun::orderBy('id')->get() as $run) {
    $entry = ['id' => $run->id, 'status' => $run->status, 'requests' => $run->requests_count,
        'fingerprint' => hash('sha256', json_encode([$run->getAttributes(), $run->analyses()->orderBy('id')->get()->map->getAttributes()->all()]))];
    if ($run->status === 'completed') {
        $reports->assertComplete($run);
        $report = $reports->build($run);
        $rows = collect($report['activities']);
        if ($rows->count() !== $rows->pluck('activity_id')->unique()->count()) {
            throw new RuntimeException('Duplicate activity');
        }
        $members = collect($report['groups'])->flatMap(fn ($group) => $group['members']);
        if ($members->sort()->values()->all() !== $rows->pluck('activity_id')->sort()->values()->all()) {
            throw new RuntimeException('Group membership mismatch');
        }
        $entry['totals'] = $report['totals'];
        $entry['act_0001_fte'] = $rows->firstWhere('activity_id', 'ACT-0001')['fte'] ?? null;
        $summary = app(WorkloadSummaryService::class)->summarize($run->import);
        if ($summary['analysis_run_id'] === $run->id && (abs($summary['total_fte'] - $report['totals']['total_fte']) > 1e-12 || $summary['calculation'] !== $report['calculation'])) {
            throw new RuntimeException('Dashboard/report mismatch');
        }
    }
    $checks[] = $entry;
}
$path = storage_path('app/private/exports/run-1/FTEMation.xlsx');
$book = IOFactory::load($path);
$sheet = $book->getSheetByName('Activities');
if ($sheet->getHighestDataRow() !== 61) {
    throw new RuntimeException('Workbook activity count mismatch');
}
foreach ($book->getAllSheets() as $worksheet) {
    foreach ($worksheet->getCellCollection()->getCoordinates() as $coordinate) {
        if ($worksheet->getCell($coordinate)->getDataType() === 'f') {
            throw new RuntimeException('Formula in export');
        }
    }
}
echo json_encode(['runs' => $checks, 'xlsx_sheets' => $book->getSheetNames(), 'xlsx_activities' => 60, 'formula_cells' => 0], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE).PHP_EOL;
