<?php

namespace App\Services\Analysis;

use App\Models\AnalysisRun;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AnalysisCancellation
{
    public function request(AnalysisRun $run, int $actorId, int $expectedVersion): AnalysisRun
    {
        // Do not wait for the long-lived worker mutex to record the user's intent.
        DB::transaction(function () use ($run, $actorId, $expectedVersion) {
            $current = AnalysisRun::whereKey($run->id)->lockForUpdate()->firstOrFail();
            abort_unless($current->execution_version === $expectedVersion, 409, 'Analisis sudah diperbarui. Muat status terbaru sebelum membatalkan.');
            if (in_array($current->status, ['cancel_requested', 'cancelled'])) {
                return;
            }
            abort_unless(in_array($current->status, ['queued', 'processing']), 409, 'Hanya analisis aktif yang dapat dibatalkan.');
            $events = $current->lifecycle_events ?? [];
            $events[] = ['type' => 'cancel_requested', 'at' => now()->toIso8601String(), 'actor_id' => $actorId, 'execution_version' => $current->execution_version];
            $current->forceFill(['status' => 'cancel_requested', 'cancellation_requested_at' => now(), 'lifecycle_events' => $events])->save();
        });
        $lock = Cache::lock('analysis-run:'.$run->id, 400);
        if ($lock->get()) {
            try {
                $this->checkpoint($run);
            } finally {
                $lock->release();
            }
        }

        return $run->refresh();
    }

    /** Called only while holding the worker mutex (including recovery/failure). */
    public function checkpoint(AnalysisRun $run): bool
    {
        $run->refresh();
        if ($run->status === 'cancel_requested') {
            DB::transaction(function () use ($run) {
                $current = AnalysisRun::whereKey($run->id)->lockForUpdate()->firstOrFail();
                if ($current->status !== 'cancel_requested') {
                    return;
                }
                // Only unfinished work is reset; successes, failures and billing remain intact.
                $current->analyses()->where('status', 'processing')->update(['status' => 'pending']);
                $events = $current->lifecycle_events ?? [];
                $events[] = ['type' => 'cancelled', 'at' => now()->toIso8601String(), 'execution_version' => $current->execution_version];
                $current->forceFill(['status' => 'cancelled', 'cancelled_at' => now(), 'heartbeat_at' => now(), 'lifecycle_events' => $events,
                    'summary_status' => $current->summary_status === 'processing' ? 'pending' : $current->summary_status])->save();
            });
            $run->refresh();
        }

        return in_array($run->status, ['cancel_requested', 'cancelled']);
    }

    /** Short row lock: cancellation and request admission have a defined ordering. */
    public function admitRequest(AnalysisRun $run): void
    {
        DB::transaction(function () use ($run) {
            $current = AnalysisRun::whereKey($run->id)->lockForUpdate()->firstOrFail();
            if (! in_array($current->status, ['queued', 'processing']) || $current->execution_version !== $run->execution_version) {
                throw new AnalysisCancelled('Analisis tidak lagi menerima request AI.');
            }
            $current->increment('requests_count');
            $current->forceFill(['heartbeat_at' => now()])->save();
        });
        $run->refresh();
    }

    /** Never let a stale worker save overwrite a concurrent cancellation. */
    public function updateActive(AnalysisRun $run, array $values): bool
    {
        return DB::transaction(function () use ($run, $values) {
            $current = AnalysisRun::whereKey($run->id)->lockForUpdate()->firstOrFail();
            if (! in_array($current->status, ['queued', 'processing']) || $current->execution_version !== $run->execution_version) {
                return false;
            }
            $current->forceFill($values)->save();
            $run->refresh();

            return true;
        });
    }
}
