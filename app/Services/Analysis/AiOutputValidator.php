<?php

namespace App\Services\Analysis;

use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class AiOutputValidator
{
    public function activities(array $data, array $ids, array $groups): array
    {
        $level = Rule::in(['low', 'medium', 'high']);
        $fields = 'activity_id,automation_level,group_id,factors,implementation_effort,automation_scope,human_oversight_required,oversight_note,reason,recommendation';
        $rules = [
            'activities' => ['required', 'array', 'size:'.count($ids)],
            'activities.*' => ['required', 'array:'.$fields],
            'activities.*.activity_id' => ['required', 'string', 'distinct:strict', Rule::in($ids)],
            'activities.*.automation_level' => ['required', $level],
            'activities.*.group_id' => ['required', 'string', Rule::in($groups)],
            'activities.*.reason' => ['required', 'string', 'min:15', 'max:2000'],
            'activities.*.recommendation' => ['required', 'string', 'min:15', 'max:3000'],
            'activities.*.factors' => ['required', 'array:repetitiveness,rule_clarity,data_structure,human_judgment,operational_risk'],
            'activities.*.implementation_effort' => ['required', $level],
            'activities.*.automation_scope' => ['required', Rule::in(['majority_steps', 'partial_steps', 'assist_only'])],
            'activities.*.human_oversight_required' => ['required', 'boolean'],
            'activities.*.oversight_note' => ['present', 'nullable', 'string', 'max:1500'],
        ];
        foreach (['repetitiveness', 'rule_clarity', 'data_structure', 'human_judgment', 'operational_risk'] as $factor) {
            $rules['activities.*.factors.'.$factor] = ['required', $level];
        }
        if (array_keys($data) !== ['activities'] || Validator::make($data, $rules)->fails()) {
            throw new AnalysisException('Struktur hasil AI tidak sesuai kontrak aktivitas; periksa prompt dan retry.');
        }
        foreach ($data['activities'] as $row) {
            $requiresHuman = $row['factors']['operational_risk'] === 'high' || $row['factors']['human_judgment'] === 'high' || $row['group_id'] === 'high_impact_decision';
            $scope = ['high' => 'majority_steps', 'medium' => 'partial_steps', 'low' => 'assist_only'][$row['automation_level']];
            if (! is_bool($row['human_oversight_required']) || ($requiresHuman && ! $row['human_oversight_required']) || ($row['human_oversight_required'] && mb_strlen(trim($row['oversight_note'] ?? '')) < 10) || $scope !== $row['automation_scope'] || ($row['factors']['human_judgment'] === 'high' && $row['automation_level'] === 'high') || ($row['group_id'] === 'high_impact_decision' && $row['automation_level'] !== 'low')) {
                throw new AnalysisException('Hasil AI melanggar aturan scope atau human oversight; keputusan berisiko tidak boleh diterima otomatis.');
            }
        }

        return $data['activities'];
    }

    public function summaries(array $data, array $employeeCodes, array $departments): array
    {
        if (count($data) !== 2 || ! isset($data['employees'], $data['departments'])) {
            throw new AnalysisException('Struktur kesimpulan AI tidak lengkap.');
        }
        foreach (['employees' => ['employee_id', $employeeCodes], 'departments' => ['department', $departments]] as $type => [$key, $ids]) {
            $v = Validator::make($data, [
                $type => ['required', 'array', 'size:'.count($ids)],
                "$type.*" => ['array:'.$key.',summary,opportunities,oversight_note'],
                "$type.*.$key" => ['required', 'string', 'distinct:strict', Rule::in($ids)],
                "$type.*.summary" => ['required', 'string', 'min:30', 'max:2000', 'not_regex:/[0-9]/'],
                "$type.*.opportunities" => ['required', 'string', 'min:15', 'max:2000', 'not_regex:/[0-9]/'],
                "$type.*.oversight_note" => ['required', 'string', 'min:15', 'max:1500', 'not_regex:/[0-9]/'],
            ]);
            if ($v->fails()) {
                throw new AnalysisException('Kesimpulan AI tidak lengkap atau berisi angka yang harus dihitung aplikasi.');
            }
        }

        return $data;
    }
}
