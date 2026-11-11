<?php

namespace App\Services\Workload;

use App\Models\WorkloadImport;

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

        return [
            'activities_count' => $activities->count(),
            'employees_count' => $import->employees()->count(),
            'departments_count' => $departments->count(),
            'total_fte' => $departments->sum('total_fte'),
            'departments' => $departments,
            'analysis_status' => 'not_started',
            'estimated_fte_saving' => null,
            'warnings' => $import->warnings ?? [],
        ];
    }
}
