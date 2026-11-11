<?php

namespace App\Services\Workload;

use App\Models\WorkloadImport;
use App\Services\Analysis\AnalysisReportService;
use App\Services\Analysis\ReportGuidance;

class WorkloadSummaryService
{
    public function summarize(WorkloadImport $import): array
    {
        // Recalculate from persisted inputs before summing; do not sum rounded display values.
        $calculator = app(FteCalculator::class);
        $latest = $import->analysisRuns()->latest('id')->first();
        $complete = $import->analysisRuns()->where('status', 'completed')->latest('id')->first();
        $calculation = $complete?->config_snapshot['calculation'] ?? collect(config('ftemation'))->only(['annual_capacity_minutes', 'annual_factors', 'saving_rates', 'risk_factors', 'effort_factors'])->all();
        $activities = $import->activities()->with('employee')->get();
        $departments = $activities->groupBy('employee.department')->map(function ($rows, $name) use ($calculator, $calculation) {
            return [
                'department' => $name,
                'activities_count' => $rows->count(),
                'employees_count' => $rows->pluck('employee_id')->unique()->count(),
                'total_fte' => $rows->sum(fn ($a) => $calculator->calculate((float) $a->volume, (float) $a->duration_minutes, $a->frequency, $calculation)),
            ];
        })->values();

        $report = null;
        if ($complete) {
            $reports = app(AnalysisReportService::class);
            $reports->assertComplete($complete);
            $report = $reports->build($complete);
            $departments = collect($report['departments']);
        }

        $warnings = $import->warnings ?? [];
        $aboveCapacity = $activities->groupBy('employee_id')->filter(fn ($rows) => $rows->sum(fn ($a) => $calculator->calculate((float) $a->volume, (float) $a->duration_minutes, $a->frequency, $calculation)) > 1)->count();
        if ($aboveCapacity > 0) {
            $warnings[] = $aboveCapacity.' karyawan memiliki aktivitas tercatat di atas satu FTE. '.ReportGuidance::WORKLOAD;
        }

        return [
            'activities_count' => $activities->count(),
            'employees_count' => $import->employees()->count(),
            'departments_count' => $departments->count(),
            'total_fte' => $departments->sum('total_fte'),
            'departments' => $departments,
            'analysis_model' => config('ftemation.ai.model'),
            'analysis_status' => $latest?->status ?? 'not_started',
            'analysis_run_id' => $complete?->id,
            'estimated_fte_saving' => $report['totals']['estimated_fte_saving'] ?? null,
            'remaining_fte' => $report['totals']['remaining_fte'] ?? null,
            'top_opportunities' => $report ? collect($report['priorities'])->take(3)->map(fn ($id) => collect($report['activities'])->firstWhere('activity_id', $id))->filter()->values()->all() : [],
            'oversight_count' => $report['totals']['oversight_count'] ?? null,
            'automation_levels' => $report['totals']['levels'] ?? null,
            'calculation' => $calculation,
            'warnings' => $warnings,
        ];
    }
}
