<?php

use App\Models\AnalysisRun;
use App\Services\Analysis\AnalysisExportService;
use App\Services\Analysis\AnalysisReportService;
use Illuminate\Contracts\Console\Kernel;
use PhpOffice\PhpSpreadsheet\IOFactory;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$run = AnalysisRun::findOrFail((int) ($argv[1] ?? 4));
$reports = app(AnalysisReportService::class);
$reports->assertComplete($run);
$report = $reports->build($run);
$directory = storage_path('framework/testing/quality');
if (! is_dir($directory)) {
    mkdir($directory, 0755, true);
}
foreach (['json', 'xlsx', 'pdf'] as $format) {
    $response = app(AnalysisExportService::class)->download($report, $format);
    if ($format === 'xlsx') {
        ob_start();
        $response->sendContent();
        $bytes = ob_get_clean();
    } else {
        $bytes = $response->getContent();
    }
    file_put_contents($directory.'/run-'.$run->id.'-preview.'.$format, $bytes);
}
$book = IOFactory::load($directory.'/run-'.$run->id.'-preview.xlsx');
$json = json_decode(file_get_contents($directory.'/run-'.$run->id.'-preview.json'), true, flags: JSON_THROW_ON_ERROR);
$table = $book->getSheetByName('Activities')->toArray(null, false, false);
$headers = array_shift($table);
$checks = 0;
foreach ($json['activities'] as $i => $activity) {
    foreach ($headers as $column => $key) {
        $value = $activity[$key];
        $expected = is_array($value) ? json_encode($value, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) : (is_bool($value) ? ($value ? 'Yes' : 'No') : $value);
        if ($expected != $table[$i][$column]) {
            throw new RuntimeException('Workbook mismatch: '.$activity['activity_id'].' '.$key);
        }
        $checks++;
    }
    $fte = $activity['volume'] * $activity['duration_minutes'] * $json['calculation']['annual_factors'][$activity['frequency']] / $json['calculation']['annual_capacity_minutes'];
    if (abs($fte - $activity['fte']) > 0.00000051 || abs($fte * $json['calculation']['saving_rates'][$activity['automation_level']] - $activity['estimated_fte_saving']) > 0.00000051) {
        throw new RuntimeException('Calculation mismatch: '.$activity['activity_id']);
    }
}
$members = array_merge(...array_column($json['groups'], 'members'));
if (count($members) !== count($json['activities']) || count(array_unique($members)) !== count($members)) {
    throw new RuntimeException('Invalid grouping coverage.');
}
echo json_encode(['run_id' => $run->id, 'sheets' => $book->getSheetNames(), 'activities' => count($table), 'compared_cells' => $checks, 'group_members_unique' => count($members), 'overview_fte' => $book->getSheetByName('Overview')->getCell('D14')->getValue(), 'totals' => array_diff_key($json['totals'], ['top_activities' => true])], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR).PHP_EOL;
