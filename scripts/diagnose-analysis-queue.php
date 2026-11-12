<?php

use App\Models\AnalysisRun;
use App\Services\Analysis\AnalysisQueueHealth;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

// Read-only diagnostics. Never reserves a job or calls an AI provider.
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$config = [];
foreach (['queue.default', 'queue.connections.database.queue', 'queue.connections.database.retry_after', 'cache.default', 'ftemation.ai.timeout', 'ftemation.ai.attempts'] as $key) {
    $config[$key] = config($key);
}
$config['api_key_present'] = filled(config('ftemation.ai.api_key'));
$config['ca_bundle_exists'] = is_file(base_path(config('ftemation.ai.ca_bundle') ?? 'missing')) || is_file(config('ftemation.ai.ca_bundle') ?? 'missing');
$config['config_cached'] = app()->configurationIsCached();
$config['pcntl_available'] = extension_loaded('pcntl');
$run = AnalysisRun::findOrFail((int) ($argv[1] ?? 5));
$jobs = DB::connection(config('queue.connections.database.connection'))->table(config('queue.connections.database.table'))->get(['id', 'queue', 'attempts', 'reserved_at', 'available_at', 'created_at', 'payload'])->map(function ($job) {
    $payload = json_decode($job->payload, true);
    preg_match('/s:5:"runId";i:(\d+);/', $payload['data']['command'] ?? '', $match);

    return ['id' => $job->id, 'queue' => $job->queue, 'attempts' => $job->attempts, 'reserved_at' => $job->reserved_at, 'available_at' => $job->available_at, 'created_at' => $job->created_at, 'class' => $payload['displayName'] ?? null, 'run_id' => isset($match[1]) ? (int) $match[1] : null];
});
$failed = DB::table('failed_jobs')->get(['id', 'connection', 'queue', 'failed_at', 'exception'])->map(fn ($j) => ['id' => $j->id, 'connection' => $j->connection, 'queue' => $j->queue, 'failed_at' => $j->failed_at, 'failure_type' => str_contains($j->exception, 'MaxAttemptsExceededException') ? 'max_attempts' : (str_contains($j->exception, 'TimeoutExceededException') ? 'timeout' : 'other')]);
$locks = config('cache.default') === 'database' ? DB::table('cache_locks')->where('key', 'like', '%analysis-run:'.$run->id)->get(['expiration']) : [];
$logs = [];
foreach (glob(storage_path('logs/*.log')) as $file) {
    $lines = file($file);
    $events = [];
    foreach ($lines as $line) {
        if (preg_match('/^\[([^\]]+)\] \w+\.(ERROR|WARNING|CRITICAL):/', $line, $m)) {
            $events[] = ['time' => $m[1], 'level' => $m[2], 'kind' => str_contains($line, 'SQLSTATE') ? 'database' : (str_contains($line, 'MaxAttempts') ? 'max_attempts' : (str_contains($line, 'Timeout') ? 'timeout' : 'other'))];
        }
    }
    $logs[] = ['file' => basename($file), 'modified' => date('c', filemtime($file)), 'recent_events' => array_slice($events, -15)];
}
$hashes = [];
foreach (['analysis_runs', 'activity_analyses', 'jobs', 'failed_jobs'] as $table) {
    $hashes[$table] = hash('sha256', json_encode(DB::table($table)->orderBy('id')->get()));
}
$result = ['at' => now()->toIso8601String(), 'config' => $config, 'run' => $run->only(['id', 'import_id', 'status', 'started_at', 'heartbeat_at', 'created_at', 'requests_count', 'input_tokens', 'output_tokens']), 'queue_health' => app(AnalysisQueueHealth::class)->forRun($run), 'progress' => $run->analyses()->selectRaw('status, COUNT(*) as count')->groupBy('status')->pluck('count', 'status'), 'jobs' => $jobs, 'failed_jobs' => $failed, 'run_lock' => $locks, 'logs' => $logs, 'hashes' => $hashes];
$result['historical_hashes'] = $hashes;
$result['historical_hashes']['analysis_runs'] = hash('sha256', json_encode(DB::table('analysis_runs')->orderBy('id')->get()->map(fn ($row) => collect((array) $row)->except(['execution_version', 'cancellation_requested_at', 'cancelled_at', 'resumed_at', 'lifecycle_events'])->all())));
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES).PHP_EOL;
