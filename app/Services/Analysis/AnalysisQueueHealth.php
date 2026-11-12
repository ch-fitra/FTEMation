<?php

namespace App\Services\Analysis;

use App\Jobs\AnalyzeWorkloadRun;
use App\Models\AnalysisRun;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AnalysisQueueHealth
{
    public const WORKER_KEY = 'analysis:worker:last-seen';

    public function workerSeen(string $connection, ?string $queues): void
    {
        if ($connection === 'database' && in_array('analysis', explode(',', $queues ?? config('queue.connections.database.queue')), true)) {
            Cache::put(self::WORKER_KEY, now()->timestamp, 420);
        }
    }

    public function jobs(AnalysisRun $run): array
    {
        // Read JSON metadata only. Never unserialize a database job payload.
        return DB::connection(config('queue.connections.database.connection'))
            ->table(config('queue.connections.database.table'))->where('queue', 'analysis')->get()
            ->filter(function ($job) use ($run) {
                $payload = json_decode($job->payload, true);
                preg_match('/s:16:"executionVersion";i:(\d+);/', $payload['data']['command'] ?? '', $version);

                return ($payload['displayName'] ?? null) === AnalyzeWorkloadRun::class
                    && (int) ($version[1] ?? 0) === $run->execution_version
                    && preg_match('/s:5:"runId";i:'.(int) $run->id.';/', $payload['data']['command'] ?? '') === 1;
            })->all();
    }

    public function hasWaitingJob(AnalysisRun $run): bool
    {
        // Expired reservations can be reclaimed by Laravel without another dispatch.
        return collect($this->jobs($run))->contains(fn ($job) => $job->reserved_at === null
            || $job->reserved_at <= now()->timestamp - config('queue.connections.database.retry_after'));
    }

    public function forRun(AnalysisRun $run): array
    {
        $jobs = collect($this->jobs($run));
        $lastSeen = Cache::get(self::WORKER_KEY);
        $recent = is_numeric($lastSeen) && (int) $lastSeen >= now()->timestamp - 420;
        $lastProgress = $run->heartbeat_at ?? $run->created_at;
        $stalled = in_array($run->status, ['queued', 'processing']) && $lastProgress->lte(now()->subMinutes(10));
        $waiting = $jobs->whereNull('reserved_at');
        $reserved = $jobs->whereNotNull('reserved_at');

        return [
            'worker_status' => $recent ? 'recently_seen' : 'not_detected',
            'pending_jobs' => $waiting->count(),
            'reserved_jobs' => $reserved->count(),
            'delayed_jobs' => $waiting->filter(fn ($job) => $job->available_at > now()->timestamp)->count(),
            'stalled' => $stalled,
            'waiting_seconds' => $run->status === 'queued' ? max(0, now()->timestamp - $lastProgress->timestamp) : 0,
            'can_recover' => $stalled && $jobs->isEmpty(),
        ];
    }
}
