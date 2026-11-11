<?php

use App\Models\AnalysisRun;
use App\Services\Analysis\AnalysisReportService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

// Read-only application data audit. Never invokes a provider or a queue job.
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$connection = DB::connection();
$snapshot = $connection->transaction(function () {
    $tables = [];
    foreach (['imports', 'employees', 'activities', 'activity_groups', 'analysis_runs', 'activity_analyses'] as $table) {
        $rows = DB::table($table)->orderBy('id')->get()->toArray();
        $tables[$table] = ['count' => count($rows), 'sha256' => hash('sha256', json_encode($rows, JSON_THROW_ON_ERROR))];
    }
    $runs = [];
    foreach (AnalysisRun::where('status', 'completed')->orderBy('id')->get() as $run) {
        $report = app(AnalysisReportService::class)->build($run);
        $runs[] = ['id' => $run->id, 'prompt_version' => $run->prompt_version, 'totals' => array_diff_key($report['totals'], ['top_activities' => true]), 'report_sha256' => hash('sha256', json_encode($report, JSON_THROW_ON_ERROR))];
    }

    return ['tables' => $tables, 'completed_runs' => $runs];
});
$files = [];
$directory = storage_path('app/private/exports');
if (is_dir($directory)) {
    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS)) as $file) {
        if ($file->isFile()) {
            $files[str_replace('\\', '/', substr($file->getPathname(), strlen($directory) + 1))] = hash_file('sha256', $file->getPathname());
        }
    }
}
ksort($files);
$snapshot['export_files'] = $files;
echo json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR).PHP_EOL;
