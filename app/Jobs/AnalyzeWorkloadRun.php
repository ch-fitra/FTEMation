<?php

namespace App\Jobs;

use App\Models\AnalysisRun;
use App\Services\Analysis\AnalysisRunService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;
use Throwable;

class AnalyzeWorkloadRun implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 360;

    public bool $failOnTimeout = true;

    public function __construct(public int $runId) {}

    public function handle(AnalysisRunService $service): void
    {
        $lock = Cache::lock('analysis-run:'.$this->runId, 400);
        if (! $lock->get()) {
            $this->release(15);

            return;
        }
        try {
            $run = AnalysisRun::find($this->runId);
            if ($run) {
                $service->step($run);
            }
        } finally {
            $lock->release();
        }
    }

    public function failed(?Throwable $exception): void
    {
        if ($run = AnalysisRun::find($this->runId)) {
            app(AnalysisRunService::class)->fail($run, 'Worker terhenti atau batas waktu terlampaui. Periksa worker/log server lalu retry.');
        }
    }
}
