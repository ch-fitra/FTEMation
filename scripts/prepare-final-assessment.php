<?php

// Read-only database verification and application JSON export. Never calls AI or queues work.
use App\Models\AnalysisRun;
use App\Services\Analysis\AnalysisExportService;
use App\Services\Analysis\AnalysisReportService;
use App\Services\Workload\WorkloadWorkbookReader;
use Illuminate\Contracts\Console\Kernel;
use PhpOffice\PhpSpreadsheet\IOFactory;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

function requireFinal(bool $condition, string $message): void
{
    if (! $condition) {
        throw new RuntimeException($message);
    }
}

$run = AnalysisRun::with('import')->findOrFail(1);
requireFinal($run->prompt_version === 'activity-v1' && $run->config_snapshot['summary_version'] === 'summary-v1', 'Final selection must remain the historical v1 run.');
$reports = app(AnalysisReportService::class);
$reports->assertComplete($run);
$report = $reports->build($run);
$source = base_path('samples/FTEMation_Workload_Dataset_v1.xlsx');
$imported = storage_path('app/private/'.$run->import->file_path);
requireFinal(is_file($imported) && hash_file('sha256', $source) === hash_file('sha256', $imported), 'Workbook bytes do not match the selected import.');
$rows = app(WorkloadWorkbookReader::class)->read($source)['rows'];
$activities = collect($report['activities'])->keyBy('activity_id');
requireFinal(count($rows) === 60 && $activities->count() === 60 && count($report['activities']) === 60, 'Expected exactly 60 unique activity results.');
requireFinal($report['totals']['employees_count'] === 12 && $report['totals']['departments_count'] === 3, 'Unexpected dataset population.');
foreach ($rows as $row) {
    $result = $activities->get($row['activity_id']);
    requireFinal(is_array($result) && $result['status'] === 'success', 'Missing successful activity: '.$row['activity_id']);
    foreach (WorkloadWorkbookReader::HEADERS as $field) {
        $matches = in_array($field, ['volume', 'duration_minutes'])
            ? (float) $row[$field] === (float) $result[$field]
            : $row[$field] === $result[$field];
        requireFinal($matches, 'Source mismatch: '.$row['activity_id'].' '.$field);
    }
    $calculation = $report['calculation'];
    $fte = $row['volume'] * $row['duration_minutes'] * $calculation['annual_factors'][$row['frequency']] / $calculation['annual_capacity_minutes'];
    requireFinal(abs($fte - $result['fte']) < 1e-10, 'FTE mismatch: '.$row['activity_id']);
    requireFinal(abs($fte * $calculation['saving_rates'][$result['automation_level']] - $result['estimated_fte_saving']) < 1e-10, 'Saving mismatch: '.$row['activity_id']);
}
$members = array_merge(...array_column($report['groups'], 'members'));
sort($members);
$ids = $activities->keys()->sort()->values()->all();
requireFinal($members === $ids, 'Group members must cover the source exactly once.');

$evaluationPath = base_path('samples/FTEMation_AI_Evaluation_v1.xlsx');
$book = IOFactory::load($evaluationPath);
$evaluationRows = array_slice($book->getSheetByName('Evaluation')->toArray(), 1);
$levelMatches = $groupMatches = $evaluated = 0;
$differences = [];
foreach ($evaluationRows as $row) {
    if (! $row[0]) {
        continue;
    }
    $actual = $activities->get($row[0]);
    requireFinal(is_array($actual), 'Unknown evaluation ID.');
    $evaluated++;
    $levelMatches += (int) ($actual['automation_level'] === $row[2]);
    $groupMatches += (int) ($actual['group_id'] === $row[3]);
    if ($actual['automation_level'] !== $row[2] || $actual['group_id'] !== $row[3]) {
        $differences[] = ['activity_id' => $row[0], 'reference_level' => $row[2], 'actual_level' => $actual['automation_level'], 'reference_group' => $row[3], 'actual_group' => $actual['group_id']];
    }
}
$pairMatches = $pairs = 0;
$pairDifferences = [];
foreach (array_slice($book->getSheetByName('GroupingPairs')->toArray(), 1) as $row) {
    if (! $row[0]) {
        continue;
    }
    requireFinal($activities->has($row[0]) && $activities->has($row[2]), 'Unknown pair ID.');
    requireFinal(in_array($row[4], ['same', 'different'], true), 'Unknown pair relation.');
    $actual = $activities[$row[0]]['group_id'] === $activities[$row[2]]['group_id'] ? 'same' : 'different';
    $pairs++;
    $pairMatches += (int) ($actual === $row[4]);
    if ($actual !== $row[4]) {
        $pairDifferences[] = ['activity_ids' => [$row[0], $row[2]], 'reference_relation' => $row[4], 'actual_relation' => $actual];
    }
}
$book->disconnectWorksheets();

// Use the exact production JSON serializer; do not construct or correct AI results manually.
$bytes = app(AnalysisExportService::class)->download($report, 'json')->getContent();
$json = json_decode($bytes, true, flags: JSON_THROW_ON_ERROR);
requireFinal($json['run_id'] === $run->id && count($json['activities']) === count($rows), 'Export population mismatch.');
foreach ($json['activities'] as $activity) {
    foreach (['activity_id', 'automation_level', 'reason', 'recommendation', 'group_id', 'fte', 'estimated_fte_saving', 'status'] as $field) {
        requireFinal(array_key_exists($field, $activity), 'Missing required export field: '.$field);
    }
    requireFinal($activity['status'] === 'success', 'Incomplete export activity.');
    requireFinal(abs($activity['fte'] - $activities[$activity['activity_id']]['fte']) <= 0.00000051, 'Export rounding mismatch.');
    requireFinal(abs($activity['estimated_fte_saving'] - $activities[$activity['activity_id']]['estimated_fte_saving']) <= 0.00000051, 'Export saving rounding mismatch.');
}

$folder = dirname(base_path()).'/FTEMation-Archive-2026-11-11/submission/final-run-1';
requireFinal(! file_exists($folder), 'Output already exists; refusing to overwrite: '.$folder);
requireFinal(mkdir($folder, 0755, true), 'Cannot create final folder.');
$write = function (string $name, string $content) use ($folder): void {
    requireFinal(file_put_contents($folder.'/'.$name, $content, LOCK_EX) === strlen($content), 'Cannot write '.$name);
};
$write(basename($source), file_get_contents($source));
$write('results.json', $bytes);
$write('FINAL_ASSESSMENT_REVIEW.md', file_get_contents(base_path('docs/FINAL_ASSESSMENT_REVIEW.md')));
$manifest = [
    'selected_run_id' => $run->id, 'selected_import_id' => $run->import_id,
    'model' => $run->model_name, 'actual_model' => $run->actual_model,
    'activity_prompt_version' => $run->prompt_version, 'summary_prompt_version' => $run->config_snapshot['summary_version'],
    'completed_at' => $run->completed_at->toIso8601String(),
    'verified_at' => now()->timezone('Asia/Jakarta')->toIso8601String(),
    'new_inference_performed' => false, 'historical_results_modified' => false,
    'totals' => array_diff_key($json['totals'], ['top_activities' => true]),
    'checks' => ['workbook_bytes_match_import' => true, 'all_nine_input_fields_match' => true, 'successful_unique_activities' => 60, 'fte_and_saving_recalculated' => true, 'group_members_exactly_once' => true, 'required_json_fields_present' => true],
    'evaluation' => ['sample_count' => $evaluated, 'level_matches' => $levelMatches, 'group_matches' => $groupMatches, 'level_or_group_differences' => $differences, 'pair_count' => $pairs, 'pair_matches' => $pairMatches, 'pair_differences' => $pairDifferences, 'interpretation' => 'Agreement with a synthetic reference fixture, not general model accuracy or domain expert approval.'],
    'sha256' => [],
];
foreach ([basename($source), 'results.json', 'FINAL_ASSESSMENT_REVIEW.md'] as $name) {
    $manifest['sha256'][$name] = hash_file('sha256', $folder.'/'.$name);
}
requireFinal($manifest['sha256'][basename($source)] === hash_file('sha256', $source), 'Copied workbook checksum mismatch.');
requireFinal(file_get_contents($folder.'/results.json') === $bytes, 'Saved JSON differs from application export.');
$manifest['evaluation_fixture_sha256'] = hash_file('sha256', $evaluationPath);
$write('manifest.json', json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR).PHP_EOL);
echo json_encode(['folder' => $folder, 'manifest' => $manifest], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR).PHP_EOL;
