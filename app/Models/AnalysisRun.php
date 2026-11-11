<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AnalysisRun extends Model
{
    protected $fillable = ['import_id', 'model_name', 'prompt_version', 'config_snapshot', 'summary_json', 'status', 'input_tokens', 'output_tokens', 'error_message'];

    protected function casts(): array
    {
        return ['config_snapshot' => 'array', 'summary_json' => 'array'];
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
