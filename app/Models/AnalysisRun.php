<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AnalysisRun extends Model
{
    protected $fillable = ['import_id', 'model_name', 'prompt_version', 'config_snapshot', 'summary_json', 'status', 'input_tokens', 'output_tokens', 'error_message', 'started_at', 'completed_at', 'heartbeat_at', 'summary_status', 'actual_model', 'requests_count', 'execution_version', 'cancellation_requested_at', 'cancelled_at', 'resumed_at', 'lifecycle_events'];

    protected function casts(): array
    {
        return ['config_snapshot' => 'array', 'summary_json' => 'array', 'started_at' => 'datetime', 'completed_at' => 'datetime', 'heartbeat_at' => 'datetime', 'execution_version' => 'integer', 'cancellation_requested_at' => 'datetime', 'cancelled_at' => 'datetime', 'resumed_at' => 'datetime', 'lifecycle_events' => 'array'];
    }

    public function import(): BelongsTo
    {
        return $this->belongsTo(WorkloadImport::class, 'import_id');
    }

    public function analyses(): HasMany
    {
        return $this->hasMany(ActivityAnalysis::class);
    }
}
