<?php

namespace Tests\Feature;

use App\Jobs\AnalyzeWorkloadRun;
use App\Models\User;
use App\Models\WorkloadImport;
use App\Services\Analysis\AiOutputValidator;
use App\Services\Analysis\AnalysisCancellation;
use App\Services\Analysis\AnalysisCancelled;
use App\Services\Analysis\AnalysisException;
use App\Services\Analysis\AnalysisExportService;
use App\Services\Analysis\AnalysisReportService;
use App\Services\Analysis\AnalysisRunService;
use App\Services\Analysis\ConsistencyReview;
use App\Services\Analysis\DeepSeekClient;
use App\Services\Analysis\ReportGuidance;
use App\Services\Workload\WorkloadSummaryService;
use Database\Seeders\ActivityGroupSeeder;
use Illuminate\Contracts\Queue\Job;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\UploadedFile;
use Illuminate\Queue\Events\JobPopping;
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

    private function lifecyclePost($run, string $action, ?int $version = null)
    {
        return $this->postJson("/api/analyses/{$run->id}/{$action}", ['execution_version' => $version ?? $run->fresh()->execution_version]);
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

    private function fakeProvider(?callable $during = null): void
    {
        Http::swap(new Factory);
        Http::fake(function ($request) use ($during) {
            $this->assertSame(['type' => 'disabled'], $request['thinking']);
            if ($during) {
                $during($request);
            }
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

    public function test_dashboard_opportunities_match_completed_report_priority_and_snapshot(): void
    {
        $import = $this->dataset();
        $this->fakeProvider();
        $run = app(AnalysisRunService::class)->start($import);
        $this->finish($run);
        $report = app(AnalysisReportService::class)->build($run->refresh());
        $summary = app(WorkloadSummaryService::class)->summarize($import);
        $this->assertSame(array_slice($report['priorities'], 0, 3), array_column($summary['top_opportunities'], 'activity_id'));
        $this->assertSame($run->id, $summary['analysis_run_id']);
        $this->assertSame($report['totals']['estimated_fte_saving'], $summary['estimated_fte_saving']);
        $this->assertSame($report['totals']['oversight_count'], $summary['oversight_count']);
    }

    public function test_queued_cancellation_is_idempotent_and_preserves_jobs_without_ai_requests(): void
    {
        $import = $this->dataset();
        Http::preventStrayRequests();
        $run = app(AnalysisRunService::class)->start($import);
        $snapshot = $run->config_snapshot;
        $this->lifecyclePost($run, 'cancel')->assertAccepted()->assertJsonPath('run.status', 'cancelled');
        $this->lifecyclePost($run, 'cancel')->assertAccepted();
        $this->getJson("/api/analyses/{$run->id}")->assertJsonPath('can_resume', true)->assertJsonPath('can_cancel', false)->assertJsonPath('can_retry', false)->assertJsonPath('status', 'cancelled');
        (new AnalyzeWorkloadRun($run->id))->handle(app(AnalysisRunService::class));
        (new AnalyzeWorkloadRun($run->id))->failed(new \RuntimeException('late job'));
        $this->assertSame('cancelled', $run->refresh()->status);
        $this->assertSame(60, $run->analyses()->where('status', 'pending')->count());
        $this->assertSame(0, (int) $run->analyses()->sum('attempts'));
        $this->assertSame($snapshot, $run->config_snapshot);
        $this->assertCount(2, $run->lifecycle_events);
        Queue::assertPushed(AnalyzeWorkloadRun::class, 1);
        Http::assertNothingSent();
    }

    public function test_in_flight_cancellation_saves_response_tokens_cache_and_stops_before_next_batch(): void
    {
        $import = $this->dataset();
        $service = app(AnalysisRunService::class);
        $run = $service->start($import);
        $this->fakeProvider(function () use ($run, $import) {
            $this->lifecyclePost($run, 'cancel')->assertAccepted()->assertJsonPath('run.status', 'cancel_requested');
            $this->lifecyclePost($run, 'resume')->assertConflict();
            $this->postJson("/api/analyses/{$run->id}/retry")->assertConflict();
            $this->postJson("/api/imports/{$import->id}/analyses")->assertAccepted()->assertJsonPath('run.id', $run->id);
            $this->getJson("/api/analyses/{$run->id}")->assertJsonPath('status', 'cancel_requested')->assertJsonPath('can_resume', false);
        });
        (new AnalyzeWorkloadRun($run->id))->handle($service);
        $this->assertSame('cancelled', $run->refresh()->status);
        $this->assertSame(5, $run->analyses()->where('status', 'success')->count());
        $this->assertSame(55, $run->analyses()->where('status', 'pending')->count());
        $this->assertSame(1, $run->requests_count);
        $this->assertSame(10, $run->input_tokens);
        $this->assertSame(20, $run->output_tokens);
        foreach ($run->analyses()->where('status', 'success')->get() as $analysis) {
            $this->assertNotNull(Cache::get('ai:activity:'.$analysis->cache_key));
        }
        Http::assertSentCount(1);
        Queue::assertPushed(AnalyzeWorkloadRun::class, 1);
    }

    public function test_partial_resume_preserves_success_and_uses_original_snapshot_without_duplicate_dispatch(): void
    {
        $realQueue = app('queue');
        $import = $this->dataset();
        $service = app(AnalysisRunService::class);
        $run = $service->start($import);
        $snapshot = $run->config_snapshot;
        $this->fakeProvider(fn () => $this->lifecyclePost($run, 'cancel')->assertAccepted());
        (new AnalyzeWorkloadRun($run->id))->handle($service);
        $keys = ['id', 'activity_id', 'status', 'automation_level', 'reason', 'recommendation', 'factors', 'estimated_fte_saving', 'cache_key', 'cache_hit', 'attempts'];
        $saved = $run->analyses()->where('status', 'success')->get()->map->only($keys)->all();
        config(['ftemation.ai.prompt_version' => 'must-not-read-this-file', 'ftemation.ai.model' => 'must-not-use-this-model']);
        Queue::swap($realQueue);
        $this->lifecyclePost($run, 'resume')->assertAccepted()->assertJsonPath('run.id', $run->id)->assertJsonPath('run.status', 'queued');
        $this->lifecyclePost($run, 'resume')->assertAccepted();
        $this->assertSame(1, DB::table('jobs')->count());
        $this->assertSame(1, $run->refresh()->execution_version);
        $this->assertSame($snapshot, $run->config_snapshot);
        $this->fakeProvider(function ($request) use ($snapshot) {
            $input = json_decode($request['messages'][1]['content'], true);
            $this->assertSame($snapshot['model'], $request['model']);
            $this->assertSame($snapshot['prompts'][isset($input['activities']) ? 'activity' : 'summary'], $request['messages'][0]['content']);
        });
        $worker = app('queue.worker');
        for ($i = 0; $i < 15 && DB::table('jobs')->exists(); $i++) {
            $worker->runNextJob('database', 'analysis', new WorkerOptions(sleep: 0));
        }
        $this->assertSame('completed', $run->refresh()->status);
        $this->assertSame($saved, $run->analyses()->whereIn('id', array_column($saved, 'id'))->get()->map->only($keys)->all());
        $this->assertSame(13, $run->requests_count);
        Http::assertSentCount(12);
        $this->assertSame(['cancel_requested', 'cancelled', 'resumed'], array_column($run->lifecycle_events, 'type'));
    }

    public function test_old_duplicate_jobs_cannot_resume_after_cancellation_and_version_change(): void
    {
        $realQueue = app('queue');
        $import = $this->dataset();
        $service = app(AnalysisRunService::class);
        Queue::swap($realQueue);
        $run = $service->start($import);
        $realQueue->connection('database')->pushOn('analysis', new AnalyzeWorkloadRun($run->id));
        $this->lifecyclePost($run, 'cancel')->assertAccepted();
        $this->lifecyclePost($run, 'resume')->assertAccepted();
        $this->assertSame(3, DB::table('jobs')->count());
        $this->getJson("/api/analyses/{$run->id}")->assertJsonPath('queue_health.pending_jobs', 1);
        Http::preventStrayRequests();
        $worker = app('queue.worker');
        $worker->runNextJob('database', 'analysis', new WorkerOptions(sleep: 0));
        $worker->runNextJob('database', 'analysis', new WorkerOptions(sleep: 0));
        (new AnalyzeWorkloadRun($run->id))->failed(new \RuntimeException('old duplicate'));
        Http::assertNothingSent();
        $this->assertSame('queued', $run->refresh()->status);
        $this->assertSame(0, $run->requests_count);
        $this->fakeProvider();
        for ($i = 0; $i < 15 && DB::table('jobs')->exists(); $i++) {
            $worker->runNextJob('database', 'analysis', new WorkerOptions(sleep: 0));
        }
        $this->assertSame('completed', $run->refresh()->status);
        $this->assertSame(60, (int) $run->analyses()->sum('attempts'));
        Http::assertSentCount(13);
    }

    public function test_cancellation_during_failed_api_request_prevents_http_retry(): void
    {
        $import = $this->dataset();
        $service = app(AnalysisRunService::class);
        $run = $service->start($import);
        Http::swap(new Factory);
        Http::fake(function () use ($run) {
            $this->lifecyclePost($run, 'cancel')->assertAccepted()->assertJsonPath('run.status', 'cancel_requested');

            return Http::response([], 500);
        });
        (new AnalyzeWorkloadRun($run->id))->handle($service);
        $this->assertSame('cancelled', $run->refresh()->status);
        $this->assertSame(1, $run->requests_count);
        $this->assertSame(0, $run->analyses()->where('status', 'failed')->count());
        $this->assertSame(60, $run->analyses()->where('status', 'pending')->count());
        Http::assertSentCount(1);
    }

    public function test_cancellation_during_summary_preserves_summary_and_resume_does_not_repeat_it(): void
    {
        $import = $this->dataset();
        $service = app(AnalysisRunService::class);
        $run = $service->start($import);
        $this->fakeProvider();
        for ($i = 0; $i < 12; $i++) {
            $service->step($run);
        }
        $this->fakeProvider(fn () => $this->lifecyclePost($run, 'cancel')->assertAccepted());
        (new AnalyzeWorkloadRun($run->id))->handle($service);
        $this->assertSame('cancelled', $run->refresh()->status);
        $this->assertSame('completed', $run->summary_status);
        $summary = $run->summary_json;
        $this->lifecyclePost($run, 'resume')->assertAccepted();
        (new AnalyzeWorkloadRun($run->id, $run->refresh()->execution_version))->handle($service);
        $this->assertSame('completed', $run->refresh()->status);
        $this->assertSame($summary, $run->summary_json);
        $this->assertSame(13, $run->requests_count);
        Http::assertSentCount(1);
    }

    public function test_cancellation_and_resume_require_authentication_ownership_and_valid_state(): void
    {
        $import = $this->dataset();
        $run = app(AnalysisRunService::class)->start($import);
        $owner = auth()->user();
        $this->actingAs(User::factory()->create());
        $this->lifecyclePost($run, 'cancel')->assertNotFound();
        $this->lifecyclePost($run, 'resume')->assertNotFound();
        auth()->forgetGuards();
        $this->lifecyclePost($run, 'cancel')->assertUnauthorized();
        $this->lifecyclePost($run, 'resume')->assertUnauthorized();
        $this->actingAs($owner);
        $this->lifecyclePost($run, 'resume')->assertConflict();
        $this->fakeProvider();
        $this->finish($run);
        $before = $run->refresh()->getAttributes();
        $this->lifecyclePost($run, 'cancel')->assertConflict();
        $this->lifecyclePost($run, 'resume')->assertConflict();
        $this->assertSame($before, $run->refresh()->getAttributes());
    }

    public function test_stale_cancel_request_can_be_acknowledged_after_worker_lock_expires(): void
    {
        $import = $this->dataset();
        Http::preventStrayRequests();
        $run = app(AnalysisRunService::class)->start($import);
        $lock = Cache::lock('analysis-run:'.$run->id, 400);
        $lock->get();
        $this->lifecyclePost($run, 'cancel')->assertAccepted()->assertJsonPath('run.status', 'cancel_requested');
        $this->travel(11)->minutes();
        $this->getJson("/api/analyses/{$run->id}")->assertJsonPath('can_finalize_cancel', true)->assertJsonPath('status', 'cancel_requested');
        $this->lifecyclePost($run, 'cancel')->assertAccepted()->assertJsonPath('run.status', 'cancelled');
        $this->assertSame(60, $run->analyses()->where('status', 'pending')->count());
        Http::assertNothingSent();
    }

    public function test_stale_status_save_and_request_admission_cannot_overwrite_cancel_or_resume(): void
    {
        $import = $this->dataset();
        $run = app(AnalysisRunService::class)->start($import);
        $stale = $run->fresh();
        $this->lifecyclePost($run, 'cancel')->assertAccepted();
        $this->assertFalse(app(AnalysisCancellation::class)->updateActive($stale, ['status' => 'completed']));
        $this->lifecyclePost($run, 'resume')->assertAccepted();
        $this->assertFalse(app(AnalysisCancellation::class)->updateActive($stale, ['status' => 'failed']));
        $this->expectException(AnalysisCancelled::class);
        app(AnalysisCancellation::class)->admitRequest($stale);
    }

    public function test_resume_refuses_another_active_run_for_the_dataset(): void
    {
        $import = $this->dataset();
        $service = app(AnalysisRunService::class);
        $first = $service->start($import);
        $this->lifecyclePost($first, 'cancel')->assertAccepted();
        $second = $service->start($import);
        $this->assertNotSame($first->id, $second->id);
        $this->lifecyclePost($first, 'resume')->assertConflict();
        $this->assertSame('cancelled', $first->refresh()->status);
    }

    public function test_delayed_cancel_or_resume_from_an_old_execution_cannot_change_newer_run(): void
    {
        $import = $this->dataset();
        $run = app(AnalysisRunService::class)->start($import);
        $this->lifecyclePost($run, 'cancel', 0)->assertAccepted();
        $this->lifecyclePost($run, 'resume', 0)->assertAccepted();
        $this->lifecyclePost($run, 'cancel', 0)->assertConflict();
        $this->lifecyclePost($run, 'resume', 0)->assertAccepted();
        $this->assertSame('queued', $run->refresh()->status);
        $this->lifecyclePost($run, 'cancel', 1)->assertAccepted();
        $this->lifecyclePost($run, 'resume', 0)->assertConflict();
        $this->assertSame('cancelled', $run->refresh()->status);
        Queue::assertPushed(AnalyzeWorkloadRun::class, 2);
    }

    public function test_lifecycle_requests_validate_execution_version(): void
    {
        $import = $this->dataset();
        $run = app(AnalysisRunService::class)->start($import);
        $this->postJson("/api/analyses/{$run->id}/cancel")->assertUnprocessable();
        $this->postJson("/api/analyses/{$run->id}/resume", ['execution_version' => -1])->assertUnprocessable();
        $this->assertSame('queued', $run->refresh()->status);
    }

    public function test_legacy_serialized_job_without_execution_version_is_safe_after_resume(): void
    {
        $realQueue = app('queue');
        $import = $this->dataset();
        $service = app(AnalysisRunService::class);
        Queue::swap($realQueue);
        $run = $service->start($import);
        $class = AnalyzeWorkloadRun::class;
        $serialized = sprintf('O:%d:"%s":1:{s:5:"runId";i:%d;}', strlen($class), $class, $run->id);
        $legacy = unserialize($serialized); // Test fixture only; application never unserializes diagnostics.
        $this->assertSame(0, $legacy->executionVersion);
        $job = DB::table('jobs')->first();
        $payload = json_decode($job->payload, true);
        $payload['data']['command'] = $serialized;
        DB::table('jobs')->where('id', $job->id)->update(['payload' => json_encode($payload)]);
        $this->getJson("/api/analyses/{$run->id}")->assertJsonPath('queue_health.pending_jobs', 1);
        $this->lifecyclePost($run, 'cancel')->assertAccepted();
        $this->lifecyclePost($run, 'resume')->assertAccepted();
        Http::preventStrayRequests();
        $legacy->handle($service);
        $legacy->failed(new \RuntimeException('legacy exhausted'));
        $this->assertSame('queued', $run->refresh()->status);
        Http::assertNothingSent();
    }

    public function test_worker_failure_acknowledges_pending_cancellation_without_failing_activities(): void
    {
        $import = $this->dataset();
        $service = app(AnalysisRunService::class);
        $run = $service->start($import);
        $this->fakeProvider(function () use ($run) {
            $this->lifecyclePost($run, 'cancel')->assertAccepted()->assertJsonPath('run.status', 'cancel_requested');
            throw new \RuntimeException('worker exception after cancellation fixture');
        });
        $job = new AnalyzeWorkloadRun($run->id);
        try {
            $job->handle($service);
            $this->fail('Fixture must interrupt the worker');
        } catch (\RuntimeException $exception) {
            $job->failed($exception);
        }
        $this->assertSame('cancelled', $run->refresh()->status);
        $this->assertSame(60, $run->analyses()->where('status', 'pending')->count());
        $this->assertSame(0, $run->analyses()->where('status', 'failed')->count());
        $this->assertSame(1, $run->requests_count);
    }

    public function test_worker_offline_keeps_one_job_and_retry_preserves_queued_run(): void
    {
        $realQueue = app('queue');
        $import = $this->dataset();
        Http::preventStrayRequests();
        Queue::swap($realQueue);
        $run = app(AnalysisRunService::class)->start($import);
        $before = $run->refresh()->getAttributes();
        $this->travel(11)->minutes();
        $this->getJson("/api/analyses/{$run->id}")->assertOk()
            ->assertJsonPath('status', 'queued')->assertJsonPath('requests_count', 0)
            ->assertJsonPath('queue_health.worker_status', 'not_detected')
            ->assertJsonPath('queue_health.pending_jobs', 1)->assertJsonPath('queue_health.stalled', true)
            ->assertJsonPath('can_retry', false);
        for ($i = 0; $i < 3; $i++) {
            $this->postJson("/api/analyses/{$run->id}/retry")->assertAccepted();
        }
        $this->assertSame($before, $run->refresh()->getAttributes());
        $this->assertSame(1, DB::table('jobs')->count());
        $this->assertSame(60, $run->analyses()->where('status', 'pending')->count());
        Http::assertNothingSent();
    }

    public function test_queue_health_distinguishes_delayed_jobs_and_worker_heartbeats(): void
    {
        $realQueue = app('queue');
        $import = $this->dataset();
        Queue::swap($realQueue);
        $run = app(AnalysisRunService::class)->start($import);
        DB::table('jobs')->update(['available_at' => now()->addMinutes(5)->timestamp]);
        event(new JobPopping('database', 'default'));
        $this->getJson("/api/analyses/{$run->id}")->assertJsonPath('queue_health.worker_status', 'not_detected')->assertJsonPath('queue_health.delayed_jobs', 1);
        event(new JobPopping('database', 'default,analysis'));
        $this->getJson("/api/analyses/{$run->id}")->assertJsonPath('queue_health.worker_status', 'recently_seen');
        $this->travel(421)->seconds();
        $this->getJson("/api/analyses/{$run->id}")->assertJsonPath('queue_health.worker_status', 'not_detected');
    }

    public function test_stalled_recovery_cannot_reset_locked_or_reserved_batch(): void
    {
        $realQueue = app('queue');
        $import = $this->dataset();
        $run = app(AnalysisRunService::class)->start($import);
        $run->forceFill(['status' => 'processing', 'heartbeat_at' => now()->subMinutes(11)])->save();
        $run->analyses()->first()->update(['status' => 'processing']);
        $lock = Cache::lock('analysis-run:'.$run->id, 400);
        $lock->get();
        $this->postJson("/api/analyses/{$run->id}/retry")->assertConflict();
        $lock->release();
        Queue::swap($realQueue);
        $realQueue->connection('database')->pushOn('analysis', new AnalyzeWorkloadRun($run->id));
        DB::table('jobs')->update(['reserved_at' => now()->timestamp]);
        $this->getJson("/api/analyses/{$run->id}")->assertJsonPath('can_retry', false);
        $this->postJson("/api/analyses/{$run->id}/retry")->assertConflict();
        $this->assertSame(1, $run->analyses()->where('status', 'processing')->count());
        $this->assertSame(1, DB::table('jobs')->count());
    }

    public function test_missing_job_recovery_preserves_success_and_enqueues_only_once(): void
    {
        $realQueue = app('queue');
        $import = $this->dataset();
        $this->fakeProvider();
        $service = app(AnalysisRunService::class);
        $run = $service->start($import);
        $service->step($run);
        $success = $run->analyses()->where('status', 'success')->get()->map->getAttributes()->all();
        $run->analyses()->where('status', 'pending')->first()->update(['status' => 'processing']);
        $this->travel(11)->minutes();
        $this->getJson("/api/analyses/{$run->id}")->assertJsonPath('can_retry', true);
        Queue::swap($realQueue);
        $this->postJson("/api/analyses/{$run->id}/retry")->assertAccepted()->assertJsonPath('run.id', $run->id);
        $this->postJson("/api/analyses/{$run->id}/retry")->assertAccepted();
        $this->assertSame(1, DB::table('jobs')->count());
        $this->assertSame($success, $run->analyses()->where('status', 'success')->get()->map->getAttributes()->all());
        $this->assertSame(0, $run->analyses()->where('status', 'processing')->count());
        $worker = app('queue.worker');
        for ($i = 0; $i < 14 && DB::table('jobs')->exists(); $i++) {
            $worker->runNextJob('database', 'analysis', new WorkerOptions(sleep: 0));
        }
        $this->assertSame('completed', $run->refresh()->status);
        Http::assertSentCount(13);
    }

    public function test_existing_duplicate_jobs_and_expired_reservation_do_not_repeat_requests(): void
    {
        $realQueue = app('queue');
        $import = $this->dataset();
        $this->fakeProvider();
        Queue::swap($realQueue);
        $run = app(AnalysisRunService::class)->start($import);
        $realQueue->connection('database')->pushOn('analysis', new AnalyzeWorkloadRun($run->id));
        DB::table('jobs')->orderBy('id')->limit(1)->update(['reserved_at' => now()->subSeconds(421)->timestamp, 'attempts' => 1]);
        $this->postJson("/api/analyses/{$run->id}/retry")->assertAccepted();
        $this->assertSame(2, DB::table('jobs')->count());
        $worker = app('queue.worker');
        for ($i = 0; $i < 20 && DB::table('jobs')->exists(); $i++) {
            $worker->runNextJob('database', 'analysis', new WorkerOptions(sleep: 0));
        }
        $this->assertSame('completed', $run->refresh()->status);
        $this->assertSame(60, $run->analyses()->where('status', 'success')->count());
        $this->assertSame(60, (int) $run->analyses()->sum('attempts'));
        $this->assertSame(0, DB::table('jobs')->count());
        Http::assertSentCount(13);
    }

    public function test_connection_timeouts_are_bounded_and_successful_results_survive_recovery(): void
    {
        $import = $this->dataset();
        $this->fakeProvider();
        $service = app(AnalysisRunService::class);
        $run = $service->start($import);
        $service->step($run);
        $successIds = $run->analyses()->where('status', 'success')->pluck('id');
        Http::swap(new Factory);
        Http::fake(fn () => Http::failedConnection());
        $this->finish($run);
        $this->assertSame('partial_failed', $run->refresh()->status);
        $this->assertSame(5, $run->analyses()->where('status', 'success')->count());
        $this->assertSame(34, $run->requests_count);
        $this->fakeProvider();
        $service->retry($run);
        $this->finish($run);
        $this->assertSame('completed', $run->refresh()->status);
        $this->assertSame(5, (int) $run->analyses()->whereIn('id', $successIds)->sum('attempts'));
    }

    public function test_worker_launcher_requires_explicit_cost_authorization(): void
    {
        $this->artisan('workload:work')->assertFailed();
        $this->assertLessThan(400, (new AnalyzeWorkloadRun(1))->timeout);
        $this->assertGreaterThan(400, config('queue.connections.database.retry_after'));
        $this->assertLessThan(360, config('ftemation.ai.timeout') * config('ftemation.ai.attempts') + 3);
    }

    public function test_exhausted_duplicate_does_not_fail_run_with_another_waiting_job(): void
    {
        $realQueue = app('queue');
        $import = $this->dataset();
        Http::preventStrayRequests();
        Queue::swap($realQueue);
        $run = app(AnalysisRunService::class)->start($import);
        (new AnalyzeWorkloadRun($run->id))->failed(new \RuntimeException('exhausted duplicate fixture'));
        $this->assertSame('queued', $run->refresh()->status);
        $this->assertSame(60, $run->analyses()->where('status', 'pending')->count());
        Http::assertNothingSent();
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

    public function test_v2_changes_cache_without_rewriting_v1_snapshot_or_results(): void
    {
        $import = $this->dataset();
        $this->fakeProvider();
        $service = app(AnalysisRunService::class);
        config(['ftemation.ai.prompt_version' => 'activity-v1', 'ftemation.ai.summary_version' => 'summary-v1']);
        $old = $service->start($import);
        $this->finish($old);
        $original = $old->refresh()->getAttributes();
        $analyses = $old->analyses()->orderBy('id')->get()->toJson();
        config(['ftemation.ai.prompt_version' => 'activity-v2', 'ftemation.ai.summary_version' => 'summary-v2']);
        $new = $service->start($import);
        $this->finish($new);
        $this->assertSame('activity-v2', $new->prompt_version);
        $this->assertSame('summary-v2', $new->config_snapshot['summary_version']);
        $this->assertNotSame($old->config_snapshot['ai_fingerprint'], $new->config_snapshot['ai_fingerprint']);
        $this->assertSame(file_get_contents(resource_path('prompts/activity-v2.txt')), $new->config_snapshot['prompts']['activity']);
        $this->assertSame(file_get_contents(resource_path('prompts/activity-v1.txt')), $old->config_snapshot['prompts']['activity']);
        $this->assertSame($original, $old->refresh()->getAttributes());
        $this->assertSame($analyses, $old->analyses()->orderBy('id')->get()->toJson());
        $this->assertSame(0, $new->analyses()->where('cache_hit', true)->count());
        Http::assertSentCount(26);
        // Snapshot retry/resume never reads the active prompt file.
        Http::assertSent(fn ($request) => $request['messages'][0]['content'] === $old->config_snapshot['prompts']['activity']);
        Http::assertSent(fn ($request) => $request['messages'][0]['content'] === $new->config_snapshot['prompts']['activity']);
    }

    public function test_offline_pairs_preserve_valid_disagreement_and_flag_advisory_candidates(): void
    {
        $import = $this->dataset();
        $run = app(AnalysisRunService::class)->start($import);
        $pairs = [
            ['Invoice matching Finance', 'Invoice dan PO dicocokkan; data penerimaan barang belum dikonfirmasi.', 'Rekonsiliasi Procurement', 'Invoice dan PO dengan perubahan termin dan persetujuan exception.', 'data_reconciliation', 'data_reconciliation', 'high', 'medium'],
            ['Input data Finance', 'Menyalin field terstruktur sesuai sumber.', 'Input data HR', 'Menyalin field terstruktur sesuai sumber.', 'structured_record_entry', 'structured_record_entry', 'high', 'high'],
            ['Laporan rutin', 'Kompilasi data rutin ke format tetap.', 'Investigasi', 'Investigasi penyebab selisih memerlukan interpretasi.', 'periodic_reporting', 'exception_investigation', 'high', 'low'],
            ['Administrasi pembayaran', 'Menyiapkan daftar pembayaran untuk persetujuan.', 'Persetujuan pembayaran', 'Pejabat memutuskan pembayaran final.', 'structured_record_entry', 'high_impact_decision', 'high', 'low'],
            ['Tugas berulang', 'Menyalin catatan rutin berisiko rendah.', 'Keputusan strategis', 'Memutuskan arah investasi strategis.', 'structured_record_entry', 'high_impact_decision', 'high', 'low'],
        ];
        foreach ($pairs as [$left, $leftDescription, $right, $rightDescription, $leftGroup, $rightGroup, $leftLevel, $rightLevel]) {
            $input = ['activities' => [
                ['activity_id' => 'LEFT', 'activity_name' => $left, 'description' => $leftDescription, 'department' => 'Finance'],
                ['activity_id' => 'RIGHT', 'activity_name' => $right, 'description' => $rightDescription, 'department' => $right === 'Input data HR' ? 'HR' : 'Procurement'],
            ]];
            // Authored rubric references, NOT model predictions or verified ground truth.
            $answer = $this->answer($input);
            foreach ([[$leftGroup, $leftLevel], [$rightGroup, $rightLevel]] as $i => [$group, $level]) {
                $row = &$answer['activities'][$i];
                $row['group_id'] = $group;
                $row['automation_level'] = $level;
                $row['automation_scope'] = ['high' => 'majority_steps', 'medium' => 'partial_steps', 'low' => 'assist_only'][$level];
                $row['reason'] = $input['activities'][$i]['description'];
                $row['factors']['human_judgment'] = $level === 'low' ? 'high' : ($level === 'high' ? 'low' : 'medium');
                $row['factors']['operational_risk'] = $level === 'low' ? 'high' : 'medium';
                if ($level === 'high') {
                    $row['factors']['rule_clarity'] = 'high';
                    $row['factors']['data_structure'] = 'high';
                }
                $row['recommendation'] = $group === 'data_reconciliation'
                    ? 'Mulai matching invoice dan PO dari field tersedia; toleransi harus dikonfirmasi. Jika data penerimaan barang tersedia dan tervalidasi, pertimbangkan three-way matching.'
                    : 'Bantu langkah administratif berdasarkan data tersedia. Konfirmasi prasyarat dan pertahankan kewenangan keputusan final pada pemilik proses.';
                unset($row);
            }
            Http::swap(new Factory);
            Http::preventStrayRequests();
            Http::fake(function ($request) use ($answer, $input) {
                $this->assertSame($input, json_decode($request['messages'][1]['content'], true));
                $prompt = $request['messages'][0]['content'];
                foreach (['two-way matching', 'three-way matching', 'belum dikonfirmasi', 'group_id sama tidak mewajibkan level identik', 'Perlu review pemilik proses', 'Routine human approval', 'Exception review', 'Human decision required'] as $instruction) {
                    $this->assertStringContainsString($instruction, $prompt);
                }

                return Http::response(['choices' => [['finish_reason' => 'stop', 'message' => ['content' => json_encode($answer)]]]]);
            });
            $rows = app(DeepSeekClient::class)->json($run, $run->config_snapshot['prompts']['activity'], $input, fn ($data) => app(AiOutputValidator::class)->activities($data, ['LEFT', 'RIGHT'], array_column($run->config_snapshot['taxonomy'], 'code')));
            $this->assertSame([$leftLevel, $rightLevel], array_column($rows, 'automation_level'));
            $before = $rows;
            $review = app(ConsistencyReview::class)->candidates($rows);
            $this->assertSame($before, $rows);
            $this->assertCount($leftGroup === $rightGroup && $leftLevel !== $rightLevel ? 1 : 0, $review);
            if ($review) {
                $this->assertSame('needs_review', $review[0]['status']);
                $this->assertSame($rightDescription, $review[0]['activities'][1]['reason']);
            }
            Http::assertSentCount(1);
        }
    }

    public function test_high_risk_controls_and_exception_only_presentation_remain_compatible(): void
    {
        $validator = app(AiOutputValidator::class);
        foreach (['Keputusan finansial', 'Perubahan rekening', 'Keputusan rekrutmen', 'Keputusan keselamatan'] as $name) {
            $data = $this->answer(['activities' => [['activity_id' => $name]]]);
            $row = &$data['activities'][0];
            $row['automation_level'] = 'low';
            $row['automation_scope'] = 'assist_only';
            $row['group_id'] = 'high_impact_decision';
            $row['factors']['operational_risk'] = 'high';
            $row['factors']['human_judgment'] = 'high';
            $row['oversight_note'] = 'Keputusan final oleh manusia berwenang.';
            $this->assertCount(1, $validator->activities($data, [$name], ['high_impact_decision']));
            $row['human_oversight_required'] = false;
            try {
                $validator->activities($data, [$name], ['high_impact_decision']);
                $this->fail('High-risk decision must require human control.');
            } catch (AnalysisException) {
                $this->assertTrue(true);
            }
            unset($row);
        }
        $exception = $this->answer(['activities' => [['activity_id' => 'FAQ']]]);
        $exception['activities'][0]['human_oversight_required'] = false;
        $exception['activities'][0]['oversight_note'] = 'Pertanyaan di luar FAQ dialihkan ke agen.';
        $this->assertFalse($validator->activities($exception, ['FAQ'], ['assisted_classification'])[0]['human_oversight_required']);
        $this->assertStringContainsString('bukan jaminan tanpa manusia', ReportGuidance::oversight(false));
        $this->assertStringContainsString('keputusan final', ReportGuidance::oversight(true));
    }

    public function test_executive_workbook_preserves_all_activity_values_and_json_contract(): void
    {
        $import = $this->dataset();
        $this->fakeProvider();
        $run = app(AnalysisRunService::class)->start($import);
        $this->finish($run);
        $report = app(AnalysisReportService::class)->build($run->refresh());
        $report['actual_model'] = '=HYPERLINK("https://example.com")';
        $response = app(AnalysisExportService::class)->download($report, 'xlsx');
        ob_start();
        $response->sendContent();
        $bytes = ob_get_clean();
        $path = tempnam(sys_get_temp_dir(), 'fte-quality-');
        file_put_contents($path, $bytes);
        try {
            $book = IOFactory::load($path);
            $this->assertSame(['Overview', 'Employees', 'Departments', 'Groups', 'Activities', 'Assumptions'], $book->getSheetNames());
            $overview = $book->getSheetByName('Overview');
            $this->assertSame('s', $overview->getCell('D4')->getDataType());
            $this->assertSame($report['actual_model'], $overview->getCell('D4')->getValue());
            $this->assertEquals(round($report['totals']['total_fte'], 6), $overview->getCell('D14')->getValue());
            $this->assertEquals(round($report['totals']['estimated_fte_saving'], 6), $overview->getCell('D15')->getValue());
            $this->assertSame(60, $overview->getCell('D10')->getValue());
            $this->assertSame(60, $overview->getCell('D23')->getValue());
            $this->assertSame(1, $overview->getCell('E23')->getValue());
            $this->assertSame('0.0%', $overview->getStyle('E23')->getNumberFormat()->getFormatCode());
            $sheet = $book->getSheetByName('Activities');
            $this->assertSame('A2', $sheet->getFreezePane());
            $this->assertNotEmpty($sheet->getAutoFilter()->getRange());
            $table = $sheet->toArray(null, false, false);
            $headers = array_shift($table);
            $this->assertSame(array_keys($report['activities'][0]), $headers);
            foreach ($report['activities'] as $i => $activity) {
                foreach ($headers as $column => $key) {
                    $expected = $activity[$key];
                    $expected = is_array($expected) ? json_encode($expected, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) : (is_bool($expected) ? ($expected ? 'Yes' : 'No') : (is_float($expected) ? round($expected, 6) : $expected));
                    $this->assertEquals($expected, $table[$i][$column], $activity['activity_id'].' '.$key);
                }
            }
            $json = json_decode(app(AnalysisExportService::class)->download($report, 'json')->getContent(), true, flags: JSON_THROW_ON_ERROR);
            $this->assertCount(60, array_unique(array_column($json['activities'], 'activity_id')));
            foreach ($json['activities'] as $activity) {
                foreach (['activity_id', 'automation_level', 'reason', 'recommendation', 'group_id', 'fte', 'estimated_fte_saving', 'status'] as $key) {
                    $this->assertArrayHasKey($key, $activity);
                }
                $this->assertSame('success', $activity['status']);
            }
        } finally {
            unlink($path);
        }
    }

    public function test_workload_above_one_is_informative_and_uses_completed_snapshot(): void
    {
        $import = $this->dataset();
        $this->fakeProvider();
        $run = app(AnalysisRunService::class)->start($import);
        $this->finish($run);
        // Only the isolated SQLite fixture is changed; not a historical application run.
        $activity = $import->activities()->firstOrFail();
        $activity->update(['volume' => 1000]);
        $summary = app(WorkloadSummaryService::class)->summarize($import);
        $this->assertStringContainsString(ReportGuidance::WORKLOAD, implode(' ', $summary['warnings']));
        $this->assertGreaterThan(1, app(AnalysisReportService::class)->build($run)['employees'][0]['total_fte']);
        config(['ftemation.annual_capacity_minutes' => 1e15]);
        $this->assertSame($summary['warnings'], app(WorkloadSummaryService::class)->summarize($import)['warnings']);
        $this->assertSame($summary['total_fte'], app(WorkloadSummaryService::class)->summarize($import)['total_fte']);
    }
}
