<?php

namespace App\Services\Workload;

use InvalidArgumentException;

class FteCalculator
{
    public function calculate(float $volume, float $durationMinutes, string $frequency, ?array $assumptions = null): float
    {
        $assumptions ??= config('ftemation');
        $factor = $assumptions['annual_factors'][$frequency] ?? null;
        if (! is_finite($volume) || ! is_finite($durationMinutes) || $volume <= 0 || $durationMinutes <= 0 || $factor === null) {
            throw new InvalidArgumentException('Volume/durasi harus positif dan frekuensi harus daily, weekly, atau monthly.');
        }

        return $volume * $durationMinutes * $factor / $assumptions['annual_capacity_minutes'];
    }

    public function saving(float $fte, string $level, ?array $assumptions = null): float
    {
        $rate = ($assumptions ?? config('ftemation'))['saving_rates'][$level] ?? null;
        if ($fte < 0 || ! is_finite($fte) || $rate === null) {
            throw new InvalidArgumentException('FTE atau level otomatisasi tidak valid.');
        }

        return $fte * $rate;
    }

    public function priority(float $saving, float $maxSaving, string $risk, string $effort, ?array $assumptions = null): float
    {
        $assumptions ??= config('ftemation');
        $riskFactor = $assumptions['risk_factors'][$risk] ?? null;
        $effortFactor = $assumptions['effort_factors'][$effort] ?? null;
        if (! is_finite($saving) || ! is_finite($maxSaving) || $saving < 0 || $maxSaving < $saving || $riskFactor === null || $effortFactor === null) {
            throw new InvalidArgumentException('Parameter prioritas tidak valid.');
        }

        return $maxSaving > 0 ? 100 * ($saving / $maxSaving) * $riskFactor * $effortFactor : 0;
    }
}
