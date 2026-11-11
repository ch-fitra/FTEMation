<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Activity extends Model
{
    protected $fillable = ['import_id', 'employee_id', 'activity_code', 'activity_name', 'description', 'frequency', 'volume', 'duration_minutes', 'fte'];

    protected function casts(): array
    {
        return ['volume' => 'decimal:6', 'duration_minutes' => 'decimal:6', 'fte' => 'decimal:12'];
    }

    public function import(): BelongsTo
    {
        return $this->belongsTo(WorkloadImport::class, 'import_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function analyses(): HasMany
    {
        return $this->hasMany(ActivityAnalysis::class);
    }
}
