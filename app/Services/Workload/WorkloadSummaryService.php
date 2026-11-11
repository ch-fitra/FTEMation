<?php

namespace App\Services\Workload;

use App\Models\WorkloadImport;
use App\Services\Analysis\AnalysisReportService;

class WorkloadSummaryService
{
    public function summarize(WorkloadImport $import): array
    {
        // Recalculate from persisted inputs before summing; do not sum rounded display values.
        $calculator = app(FteCalculator::class);
        $activities = $import->activities()->with('employee')->get();
        $departments = $activities->groupBy('employee.department')->map(function ($rows, $name) use ($calculator) {
            return [
                'department' => $name,
                'activities_count' => $rows->count(),
                'employees_count' => $rows->pluck('employee_id')->unique()->count(),
                'total_fte' => $rows->sum(fn ($a) => $calculator->calculate((float) $a->volume, (float) $a->duration_minutes, $a->frequency)),
            ];
        })->values();

        $latest = $import->analysisRuns()->latest('id')->first();
        $complete = $import->analysisRuns()->where('status', 'completed')->latest('id')->first();
        $report = null;
        if ($complete) {
            $reports = app(AnalysisReportService::class);
            $reports->assertComplete($complete);
            $report = $reports->build($complete);
        }

        return [
            'activities_count' => $activities->count(),
            'employees_count' => $import->employees()->count(),
            'departments_count' => $departments->count(),
            'total_fte' => $departments->sum('total_fte'),
            'departments' => $departments,
            'analysis_status' => $latest?->status ?? 'not_started',
            'analysis_run_id' => $complete?->id,
            'estimated_fte_saving' => $report['totals']['estimated_fte_saving'] ?? null,
            'automation_levels' => $report['totals']['levels'] ?? null,
            'calculation' => ['annual_capacity_minutes' => config('ftemation.annual_capacity_minutes'), 'annual_factors' => config('ftemation.annual_factors')],
            'warnings' => $import->warnings ?? [],
        ];
    }
}
