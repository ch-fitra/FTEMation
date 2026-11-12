<?php

namespace App\Http\Controllers;

use App\Models\AnalysisRun;
use App\Models\WorkloadImport;
use App\Services\Analysis\AnalysisCancellation;
use App\Services\Analysis\AnalysisExportService;
use App\Services\Analysis\AnalysisQueueHealth;
use App\Services\Analysis\AnalysisReportService;
use App\Services\Analysis\AnalysisRunService;
use App\Services\Analysis\ConsistencyReview;
use Illuminate\Http\Request;

class AnalysisController extends Controller
{
    public function index(Request $request, WorkloadImport $import)
    {
        $this->owner($request, $import);

        return response()->json($import->analysisRuns()->select(['id', 'import_id', 'status', 'summary_status', 'model_name', 'created_at', 'completed_at'])->latest('id')->limit(30)->get());
    }

    public function store(Request $request, WorkloadImport $import, AnalysisRunService $service)
    {
        $this->owner($request, $import);

        return response()->json(['run' => $service->start($import)->only(['id', 'status'])], 202);
    }

    public function show(Request $request, AnalysisRun $run, AnalysisReportService $reports)
    {
        $this->owner($request, $run->import);
        $progress = $run->analyses()->selectRaw('status, COUNT(*) as count')->groupBy('status')->pluck('count', 'status');
        $data = $run->only(['id', 'import_id', 'status', 'summary_status', 'model_name', 'actual_model', 'prompt_version', 'error_message', 'created_at', 'started_at', 'completed_at', 'heartbeat_at', 'requests_count', 'input_tokens', 'output_tokens', 'execution_version', 'cancellation_requested_at', 'cancelled_at', 'resumed_at', 'lifecycle_events']);
        $data['progress'] = $progress;
        $data['total'] = $run->analyses()->count();
        $data['cache_hits'] = $run->analyses()->where('cache_hit', true)->count();
        $data['failures'] = $run->analyses()->where('status', 'failed')->with('activity:id,activity_code')->get(['id', 'activity_id', 'error_message'])->map(fn ($a) => ['activity_id' => $a->activity->activity_code, 'message' => $a->error_message]);
        $data['queue_health'] = app(AnalysisQueueHealth::class)->forRun($run);
        $data['can_retry'] = in_array($run->status, ['failed', 'partial_failed']) || $data['queue_health']['can_recover'];
        $data['can_cancel'] = in_array($run->status, ['queued', 'processing']);
        $data['can_resume'] = $run->status === 'cancelled';
        $data['can_finalize_cancel'] = $run->status === 'cancel_requested' && ($run->cancellation_requested_at ?? $run->heartbeat_at)?->lte(now()->subMinutes(10));
        if ($run->status === 'completed') {
            $reports->assertComplete($run);
            $data['report'] = $reports->build($run);
            $data['consistency_review'] = app(ConsistencyReview::class)->candidates($data['report']['activities']);
        }

        return response()->json($data);
    }

    public function retry(Request $request, AnalysisRun $run, AnalysisRunService $service)
    {
        $this->owner($request, $run->import);

        return response()->json(['run' => $service->retry($run)->only(['id', 'status'])], 202);
    }

    public function export(Request $request, AnalysisRun $run, string $format, AnalysisReportService $reports, AnalysisExportService $exports)
    {
        $this->owner($request, $run->import);
        abort_unless(in_array($format, ['json', 'xlsx', 'pdf']), 404);
        $reports->assertComplete($run);

        return $exports->download($reports->build($run), $format);
    }

    public function cancel(Request $request, AnalysisRun $run, AnalysisCancellation $cancellation)
    {
        $this->owner($request, $run->import);
        $input = $request->validate(['execution_version' => ['required', 'integer', 'min:0']]);

        return response()->json(['run' => $cancellation->request($run, $request->user()->id, (int) $input['execution_version'])->only(['id', 'status'])], 202);
    }

    public function resume(Request $request, AnalysisRun $run, AnalysisRunService $service)
    {
        $this->owner($request, $run->import);
        $input = $request->validate(['execution_version' => ['required', 'integer', 'min:0']]);

        return response()->json(['run' => $service->resume($run, $request->user()->id, (int) $input['execution_version'])->only(['id', 'status'])], 202);
    }

    private function owner(Request $request, WorkloadImport $import): void
    {
        abort_unless($import->user_id === $request->user()->id, 404);
    }
}
