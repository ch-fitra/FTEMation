<?php

namespace App\Http\Controllers;

use App\Http\Requests\ActivityIndexRequest;
use App\Http\Requests\ImportWorkloadRequest;
use App\Models\WorkloadImport;
use App\Services\Workload\WorkloadImportService;
use App\Services\Workload\WorkloadSummaryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ImportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json($request->user()->imports()->withCount(['activities', 'employees'])->latest('id')->paginate(20));
    }

    public function store(ImportWorkloadRequest $request, WorkloadImportService $service, WorkloadSummaryService $summary): JsonResponse
    {
        $import = $service->import($request->file('file'), $request->user());

        return response()->json(['import' => $import, 'summary' => $summary->summarize($import)], 201);
    }

    public function show(Request $request, WorkloadImport $import, WorkloadSummaryService $summary): JsonResponse
    {
        $this->checkOwner($request, $import);

        return response()->json(['import' => $import, 'summary' => $summary->summarize($import), 'validation_errors' => $import->validation_errors]);
    }

    public function activities(ActivityIndexRequest $request, WorkloadImport $import): JsonResponse
    {
        $this->checkOwner($request, $import);
        $filters = $request->validated();
        $query = $import->activities()->with('employee');
        if ($search = $filters['search'] ?? null) {
            $query->where(function ($q) use ($search) {
                $q->where('activity_code', 'like', "%$search%")
                    ->orWhere('activity_name', 'like', "%$search%")
                    ->orWhereHas('employee', fn ($e) => $e->where('name', 'like', "%$search%"));
            });
        }
        if ($department = $filters['department'] ?? null) {
            $query->whereHas('employee', fn ($e) => $e->where('department', $department));
        }
        if ($frequency = $filters['frequency'] ?? null) {
            $query->where('frequency', $frequency);
        }

        return response()->json($query->orderBy('activity_code')->paginate($filters['per_page'] ?? 20));
    }

    private function checkOwner(Request $request, WorkloadImport $import): void
    {
        abort_unless($import->user_id === $request->user()->id, 404);
    }
}
