<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Employee extends Model
{
    protected $fillable = ['import_id', 'employee_code', 'name', 'department', 'job_title'];

    public function import(): BelongsTo
    {
        return $this->belongsTo(WorkloadImport::class, 'import_id');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class);
    }
}
