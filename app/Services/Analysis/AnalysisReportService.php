<?php

namespace App\Services\Analysis;

use App\Models\AnalysisRun;
use App\Services\Workload\FteCalculator;
use Illuminate\Support\Collection;

class AnalysisReportService
{
    public function __construct(private FteCalculator $calculator) {}

    public function rows(AnalysisRun $run): Collection
    {
        $config = $run->config_snapshot['calculation'];
        $analyses = $run->analyses()->where('status', 'success')->with(['activity.employee', 'group'])->get();
        $rows = $analyses->map(function ($row) use ($config) {
            $a = $row->activity;
            $fte = $this->calculator->calculate((float) $a->volume, (float) $a->duration_minutes, $a->frequency, $config);
            $saving = $this->calculator->saving($fte, $row->automation_level, $config);

            return [
                'activity_id' => $a->activity_code, 'activity_name' => $a->activity_name, 'description' => $a->description,
                'employee_id' => $a->employee->employee_code, 'employee_name' => $a->employee->name, 'department' => $a->employee->department,
                'frequency' => $a->frequency, 'volume' => (float) $a->volume, 'duration_minutes' => (float) $a->duration_minutes,
                'fte' => $fte, 'estimated_fte_saving' => $saving, 'remaining_fte' => $fte - $saving,
                'automation_level' => $row->automation_level, 'reason' => $row->reason, 'recommendation' => $row->recommendation,
                'group_id' => $row->group->code, 'group_name' => $row->group->name,
                'factors' => $row->factors, 'risk_level' => $row->risk_level, 'effort_level' => $row->effort_level,
                'automation_scope' => $row->automation_scope, 'oversight_required' => $row->oversight_required, 'oversight_note' => $row->oversight_note,
                'cache_hit' => $row->cache_hit, 'status' => 'success',
            ];
        });
        $max = $rows->max('estimated_fte_saving') ?? 0;

        return $rows->map(function ($row) use ($max, $config) {
            $row['priority_score'] = $this->calculator->priority($row['estimated_fte_saving'], $max, $row['risk_level'], $row['effort_level'], $config);

            return $row;
        })->sortBy('activity_id')->values();
    }

    public function aggregate(Collection $rows): array
    {
        $top = $rows->sort(fn ($a, $b) => ($b['priority_score'] <=> $a['priority_score']) ?: strcmp($a['activity_id'], $b['activity_id']))->values();

        return [
            'activities_count' => $rows->count(), 'employees_count' => $rows->pluck('employee_id')->unique()->count(),
            'departments_count' => $rows->pluck('department')->unique()->count(),
            'total_fte' => $rows->sum('fte'), 'estimated_fte_saving' => $rows->sum('estimated_fte_saving'), 'remaining_fte' => $rows->sum('remaining_fte'),
            'levels' => collect(['high', 'medium', 'low'])->mapWithKeys(fn ($level) => [$level => $rows->where('automation_level', $level)->count()])->all(),
            'oversight_count' => $rows->where('oversight_required', true)->count(),
            'top_activities' => $top->take(3)->map(fn ($r) => array_intersect_key($r, array_flip(['activity_id', 'activity_name', 'priority_score', 'risk_level', 'estimated_fte_saving', 'recommendation'])))->values()->all(),
        ];
    }

    public function entities(Collection $rows): array
    {
        return [
            'employees' => $rows->groupBy('employee_id')->map(fn ($items, $code) => array_merge(['employee_id' => $code, 'employee_name' => $items->first()['employee_name'], 'department' => $items->first()['department']], $this->aggregate($items)))->sortBy('employee_id')->values()->all(),
            'departments' => $rows->groupBy('department')->map(fn ($items, $name) => array_merge(['department' => $name], $this->aggregate($items)))->sortBy('department')->values()->all(),
        ];
    }

    public function build(AnalysisRun $run): array
    {
        $rows = $this->rows($run);
        $entities = $this->entities($rows);
        foreach (['employees' => 'employee_id', 'departments' => 'department'] as $type => $key) {
            $narratives = collect($run->summary_json[$type] ?? [])->keyBy($key);
            $entities[$type] = collect($entities[$type])->map(fn ($entity) => array_merge($entity, $narratives->get($entity[$key], [])))->all();
        }
        $groups = $rows->groupBy('group_id')->map(fn ($items, $id) => array_merge([
            'group_id' => $id, 'name' => $items->first()['group_name'], 'departments' => $items->pluck('department')->unique()->sort()->values()->all(),
            'members' => $items->pluck('activity_id')->values()->all(),
        ], $this->aggregate($items)))->sortByDesc('total_fte')->values()->all();

        return array_merge([
            'run_id' => $run->id, 'model' => $run->model_name, 'actual_model' => $run->actual_model, 'prompt_version' => $run->prompt_version,
            'completed_at' => $run->completed_at?->toIso8601String(), 'calculation' => $run->config_snapshot['calculation'],
            'totals' => $this->aggregate($rows), 'activities' => $rows->all(), 'groups' => $groups,
            'priorities' => $rows->sort(fn ($a, $b) => ($b['priority_score'] <=> $a['priority_score']) ?: strcmp($a['activity_id'], $b['activity_id']))->pluck('activity_id')->values()->all(),
            'interpretation' => 'Estimasi kapasitas waktu dari cuplikan pekerjaan, bukan keputusan pengurangan karyawan. Keputusan berisiko tetap memerlukan manusia.',
        ], $entities);
    }

    public function assertComplete(AnalysisRun $run): void
    {
        $expected = $run->import->activities()->count();
        abort_unless($run->status === 'completed' && $run->summary_status === 'completed' && $expected > 0 && $run->analyses()->count() === $expected && $run->analyses()->where('status', 'success')->count() === $expected, 409, 'Analisis belum lengkap. Selesaikan/retry seluruh aktivitas dan kesimpulan sebelum export.');
        $entities = $this->entities($this->rows($run));
        try {
            app(AiOutputValidator::class)->summaries($run->summary_json ?? [], array_column($entities['employees'], 'employee_id'), array_column($entities['departments'], 'department'));
        } catch (AnalysisException) {
            abort(409, 'Kesimpulan belum lengkap atau tidak valid; export final ditolak.');
        }
    }
}
