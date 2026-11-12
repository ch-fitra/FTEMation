<?php

namespace App\Jobs;

use App\Models\AnalysisRun;
use App\Services\Analysis\AnalysisCancellation;
use App\Services\Analysis\AnalysisQueueHealth;
use App\Services\Analysis\AnalysisRunService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;
use Throwable;

class AnalyzeWorkloadRun implements ShouldQueue
{
    use Queueable;

    // release() consumes a database-queue attempt. Allow up to ten minutes of
    // contention, but fail immediately on an unhandled exception.
    public int $tries = 40;

    public int $maxExceptions = 1;

    public int $timeout = 360;

    public bool $failOnTimeout = true;

    // Class default keeps jobs serialized before this feature compatible with version 0.
    public int $executionVersion = 0;

    public function __construct(public int $runId, int $executionVersion = 0)
    {
        $this->executionVersion = $executionVersion;
    }

    public function handle(AnalysisRunService $service): void
    {
        $lock = Cache::lock('analysis-run:'.$this->runId, 400);
        if (! $lock->get()) {
            $this->release(15);

            return;
        }
        try {
            $run = AnalysisRun::find($this->runId);
            if ($run && $run->execution_version === $this->executionVersion) {
                $service->step($run);
            }
        } finally {
            $lock->release();
        }
    }

    public function failed(?Throwable $exception): void
    {
        // An exhausted duplicate must never fail a run being processed by
        // another worker. A stale run remains recoverable through manual retry.
        $lock = Cache::lock('analysis-run:'.$this->runId, 400);
        if (! $lock->get()) {
            return;
        }
        try {
            if ($run = AnalysisRun::find($this->runId)) {
                if ($run->execution_version !== $this->executionVersion || app(AnalysisCancellation::class)->checkpoint($run)) {
                    return;
                }
                if (app(AnalysisQueueHealth::class)->hasWaitingJob($run)) {
                    return;
                }
                app(AnalysisRunService::class)->fail($run, 'Worker terhenti atau batas waktu terlampaui. Periksa worker/log server lalu retry.');
            }
        } finally {
            $lock->release();
        }
    }
}
