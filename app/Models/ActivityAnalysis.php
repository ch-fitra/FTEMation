<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityAnalysis extends Model
{
    protected $fillable = ['analysis_run_id', 'activity_id', 'activity_group_id', 'automation_level', 'reason', 'recommendation', 'factors', 'risk_level', 'effort_level', 'oversight_required', 'oversight_note', 'estimated_fte_saving', 'status', 'cache_key', 'error_message'];

    protected function casts(): array
    {
        return ['factors' => 'array', 'oversight_required' => 'boolean', 'estimated_fte_saving' => 'decimal:12'];
    }

    public function run(): BelongsTo
    {
        return $this->belongsTo(AnalysisRun::class, 'analysis_run_id');
    }

    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(ActivityGroup::class, 'activity_group_id');
    }
}
