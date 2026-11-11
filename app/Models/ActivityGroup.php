<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ActivityGroup extends Model
{
    protected $fillable = ['code', 'name', 'description'];

    public function analyses(): HasMany
    {
        return $this->hasMany(ActivityAnalysis::class);
    }
}
