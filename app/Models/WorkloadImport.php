<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkloadImport extends Model
{
    protected $table = 'imports';

    protected $fillable = ['user_id', 'filename', 'file_path', 'status', 'validation_errors', 'warnings'];

    protected $hidden = ['file_path', 'validation_errors'];

    protected function casts(): array
    {
        return ['warnings' => 'array', 'validation_errors' => 'array'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class, 'import_id');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class, 'import_id');
    }

    public function analysisRuns(): HasMany
    {
        return $this->hasMany(AnalysisRun::class, 'import_id');
    }
}
