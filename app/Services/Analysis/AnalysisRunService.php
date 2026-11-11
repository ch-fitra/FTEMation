<?php

namespace App\Services\Analysis;

use App\Jobs\AnalyzeWorkloadRun;
use App\Models\ActivityAnalysis;
use App\Models\ActivityGroup;
use App\Models\AnalysisRun;
use App\Models\WorkloadImport;
use App\Services\Workload\FteCalculator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AnalysisRunService
{
    public function __construct(private DeepSeekClient $client, private AiOutputValidator $validator, private AnalysisReportService $reports, private FteCalculator $calculator) {}

    public function start(WorkloadImport $import): AnalysisRun
    {
        abort_unless($import->status === 'imported' && $import->activities()->exists(), 422, 'Pilih dataset yang berhasil diimpor dan memiliki aktivitas.');
        abort_if(blank(config('ftemation.ai.api_key')), 422, 'DEEPSEEK_API_KEY belum tersedia. Hubungi pengelola aplikasi.');

        return DB::transaction(function () use ($import) {
            WorkloadImport::whereKey($import->id)->lockForUpdate()->firstOrFail();
            $active = $import->analysisRuns()->whereIn('status', ['queued', 'processing'])->latest('id')->first();
            if ($active) {
                return $active;
            }
            $snapshot = $this->snapshot();
            $run = $import->analysisRuns()->create([
                'model_name' => config('ftemation.ai.model'), 'prompt_version' => config('ftemation.ai.prompt_version'),
                'config_snapshot' => $snapshot, 'status' => 'queued', 'input_tokens' => 0, 'output_tokens' => 0, 'heartbeat_at' => now(),
            ]);
            foreach ($import->activities()->orderBy('id')->cursor() as $activity) {
                $run->analyses()->create(['activity_id' => $activity->id, 'status' => 'pending']);
            }
            $this->enqueue($run);

            return $run;
        });
    }

    public function retry(AnalysisRun $run): AnalysisRun
    {
        return DB::transaction(function () use ($run) {
            // Serialize retry with start for the same dataset.
            WorkloadImport::whereKey($run->import_id)->lockForUpdate()->firstOrFail();
            $run->refresh();
            $stale = in_array($run->status, ['queued', 'processing']) && $run->heartbeat_at?->lt(now()->subMinutes(10));
            abort_unless(in_array($run->status, ['failed', 'partial_failed']) || $stale, 409, 'Retry hanya untuk analisis gagal atau antrean yang tidak bergerak selama sepuluh menit.');
            abort_if($run->import->analysisRuns()->whereKeyNot($run->id)->whereIn('status', ['queued', 'processing'])->exists(), 409, 'Dataset memiliki analisis lain yang sedang berjalan.');
            $run->analyses()->whereIn('status', ['failed', 'processing'])->update(['status' => 'pending', 'error_message' => null]);
            $run->forceFill(['status' => 'queued', 'summary_status' => 'pending', 'error_message' => null, 'completed_at' => null, 'heartbeat_at' => now()])->save();
            $this->enqueue($run);

            return $run;
        });
    }

    public function snapshot(): array
    {
        $taxonomy = ActivityGroup::orderBy('code')->get(['code', 'name', 'description'])->toArray();
        abort_unless(count($taxonomy) === 20, 422, 'Taksonomi belum lengkap. Jalankan seeder kategori grouping.');
        $provider = rtrim(config('ftemation.ai.base_url'), '/');
        abort_unless(parse_url($provider, PHP_URL_SCHEME) === 'https' && ! parse_url($provider, PHP_URL_USER) && ! parse_url($provider, PHP_URL_QUERY), 422, 'Endpoint AI harus berupa HTTPS tanpa kredensial di URL.');
        $prompts = [
            'activity' => file_get_contents(resource_path('prompts/'.config('ftemation.ai.prompt_version').'.txt')),
            'summary' => file_get_contents(resource_path('prompts/'.config('ftemation.ai.summary_version').'.txt')),
        ];
        $settings = ['provider_url' => $provider, 'model' => config('ftemation.ai.model'), 'thinking' => false, 'temperature' => 0, 'prompts' => $prompts, 'taxonomy' => $taxonomy];

        return array_merge($settings, [
            'ai_fingerprint' => hash('sha256', json_encode($settings, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)),
            'summary_version' => config('ftemation.ai.summary_version'), 'max_tokens' => config('ftemation.ai.max_tokens'), 'batch_size' => config('ftemation.ai.batch_size'),
            'calculation' => collect(config('ftemation'))->only(['annual_capacity_minutes', 'annual_factors', 'saving_rates', 'risk_factors', 'effort_factors'])->all(),
        ]);
    }

    public function step(AnalysisRun $run): void
    {
        if (! in_array($run->status, ['queued', 'processing'])) {
            return;
        }
        $run->forceFill(['status' => 'processing', 'started_at' => $run->started_at ?? now(), 'heartbeat_at' => now()])->save();
        $batch = $run->analyses()->whereIn('status', ['pending', 'processing'])->with('activity.employee')->orderBy('id')->limit($run->config_snapshot['batch_size'])->get();
        if ($batch->isNotEmpty()) {
            $uncached = [];
            foreach ($batch as $analysis) {
                $payload = $this->activityInput($analysis);
                $key = 'ai:activity:'.hash('sha256', json_encode([$run->import->user_id, $run->config_snapshot['ai_fingerprint'], array_diff_key($payload, ['activity_id' => true])], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
                $analysis->forceFill(['status' => 'processing', 'cache_key' => substr($key, -64), 'error_message' => null, 'attempts' => $analysis->attempts + 1])->save();
                $cached = Cache::get($key);
                if (is_array($cached)) {
                    try {
                        $cached['activity_id'] = $analysis->activity->activity_code;
                        $this->validator->activities(['activities' => [$cached]], [$cached['activity_id']], array_column($run->config_snapshot['taxonomy'], 'code'));
                        $this->store($run, $analysis, $cached, true);

                        continue;
                    } catch (AnalysisException) {
                        Cache::forget($key);
                    }
                }
                $uncached[] = ['analysis' => $analysis, 'input' => $payload, 'key' => $key];
            }
            if ($uncached) {
                $ids = array_column(array_column($uncached, 'input'), 'activity_id');
                try {
                    $results = $this->client->json($run, $run->config_snapshot['prompts']['activity'], ['taxonomy' => $run->config_snapshot['taxonomy'], 'activities' => array_column($uncached, 'input')], fn ($data) => $this->validator->activities($data, $ids, array_column($run->config_snapshot['taxonomy'], 'code')));
                    $byId = collect($results)->keyBy('activity_id');
                    DB::transaction(function () use ($run, $uncached, $byId) {
                        foreach ($uncached as $item) {
                            $result = $byId[$item['input']['activity_id']];
                            $this->store($run, $item['analysis'], $result, false);
                            Cache::put($item['key'], $result, now()->addDays(config('ftemation.ai.cache_days')));
                        }
                    });
                } catch (AnalysisException $e) {
                    foreach ($uncached as $item) {
                        $item['analysis']->forceFill(['status' => 'failed', 'error_message' => $e->getMessage()])->save();
                    }
                    if (! $e->retryable) {
                        $this->fail($run, $e->getMessage());

                        return;
                    }
                }
            }
            $run->forceFill(['heartbeat_at' => now()])->save();
            $this->enqueue($run);

            return;
        }
        if ($run->analyses()->where('status', 'failed')->exists()) {
            $run->forceFill(['status' => $run->analyses()->where('status', 'success')->exists() ? 'partial_failed' : 'failed', 'error_message' => 'Sebagian penilaian gagal. Periksa pesan per aktivitas lalu retry.', 'completed_at' => now()])->save();

            return;
        }
        $this->summarize($run);
    }

    private function activityInput(ActivityAnalysis $analysis): array
    {
        $a = $analysis->activity;

        return ['activity_id' => $a->activity_code, 'activity_name' => $a->activity_name, 'description' => $a->description, 'department' => $a->employee->department];
    }

    private function store(AnalysisRun $run, ActivityAnalysis $analysis, array $result, bool $cached): void
    {
        $config = $run->config_snapshot['calculation'];
        $a = $analysis->activity;
        $fte = $this->calculator->calculate((float) $a->volume, (float) $a->duration_minutes, $a->frequency, $config);
        $group = ActivityGroup::where('code', $result['group_id'])->firstOrFail();
        $analysis->forceFill([
            'activity_group_id' => $group->id, 'automation_level' => $result['automation_level'], 'reason' => $result['reason'],
            'recommendation' => $result['recommendation'], 'factors' => $result['factors'], 'risk_level' => $result['factors']['operational_risk'],
            'effort_level' => $result['implementation_effort'], 'automation_scope' => $result['automation_scope'],
            'oversight_required' => $result['human_oversight_required'], 'oversight_note' => $result['oversight_note'],
            'estimated_fte_saving' => $this->calculator->saving($fte, $result['automation_level'], $config), 'status' => 'success', 'cache_hit' => $cached, 'error_message' => null,
        ])->save();
    }

    private function summarize(AnalysisRun $run): void
    {
        $rows = $this->reports->rows($run);
        abort_unless($rows->count() === $run->import->activities()->count(), 409, 'Jumlah hasil tidak sesuai dataset.');
        foreach ($rows as $row) {
            $run->analyses()->whereHas('activity', fn ($q) => $q->where('activity_code', $row['activity_id']))->update(['priority_score' => $row['priority_score']]);
        }
        $input = $this->reports->entities($rows);
        $key = 'ai:summary:'.hash('sha256', json_encode([$run->import->user_id, $run->config_snapshot['ai_fingerprint'], $input], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
        $validator = fn ($data) => $this->validator->summaries($data, array_column($input['employees'], 'employee_id'), array_column($input['departments'], 'department'));
        $run->forceFill(['summary_status' => 'processing'])->save();
        try {
            $cached = Cache::get($key);
            if (! is_array($cached)) {
                $cached = null;
            }
            if (is_array($cached)) {
                try {
                    $cached = $validator($cached);
                } catch (AnalysisException) {
                    Cache::forget($key);
                    $cached = null;
                }
            }
            $result = $cached ?: $this->client->json($run, $run->config_snapshot['prompts']['summary'], $input, $validator);
            Cache::put($key, $result, now()->addDays(config('ftemation.ai.cache_days')));
            $snapshot = $run->config_snapshot;
            $snapshot['summary_cache_hit'] = (bool) $cached;
            $run->forceFill(['summary_json' => $result, 'summary_status' => 'completed', 'config_snapshot' => $snapshot, 'status' => 'completed', 'error_message' => null, 'completed_at' => now(), 'heartbeat_at' => now()])->save();
        } catch (AnalysisException $e) {
            $run->forceFill(['summary_status' => 'failed', 'status' => 'partial_failed', 'error_message' => $e->getMessage(), 'completed_at' => now(), 'heartbeat_at' => now()])->save();
        }
    }

    public function fail(AnalysisRun $run, string $message): void
    {
        if ($run->status === 'completed') {
            return;
        }
        $run->analyses()->whereIn('status', ['pending', 'processing'])->update(['status' => 'failed', 'error_message' => $message]);
        $run->forceFill(['status' => $run->analyses()->where('status', 'success')->exists() ? 'partial_failed' : 'failed', 'summary_status' => 'failed', 'error_message' => $message, 'heartbeat_at' => now(), 'completed_at' => now()])->save();
    }

    private function enqueue(AnalysisRun $run): void
    {
        AnalyzeWorkloadRun::dispatch($run->id)->onConnection('database')->onQueue('analysis')->afterCommit();
    }
}
