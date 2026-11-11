<?php

namespace App\Services\Workload;

use InvalidArgumentException;

class FteCalculator
{
    public function calculate(float $volume, float $durationMinutes, string $frequency): float
    {
        $factor = config("ftemation.annual_factors.$frequency");
        if (! is_finite($volume) || ! is_finite($durationMinutes) || $volume <= 0 || $durationMinutes <= 0 || $factor === null) {
            throw new InvalidArgumentException('Volume/durasi harus positif dan frekuensi harus daily, weekly, atau monthly.');
        }

        return $volume * $durationMinutes * $factor / config('ftemation.annual_capacity_minutes');
    }

    public function saving(float $fte, string $level): float
    {
        $rate = config("ftemation.saving_rates.$level");
        if ($fte < 0 || ! is_finite($fte) || $rate === null) {
            throw new InvalidArgumentException('FTE atau level otomatisasi tidak valid.');
        }

        return $fte * $rate;
    }

    public function priority(float $saving, float $maxSaving, string $risk, string $effort): float
    {
        $riskFactor = config("ftemation.risk_factors.$risk");
        $effortFactor = config("ftemation.effort_factors.$effort");
        if (! is_finite($saving) || ! is_finite($maxSaving) || $saving < 0 || $maxSaving < $saving || $riskFactor === null || $effortFactor === null) {
            throw new InvalidArgumentException('Parameter prioritas tidak valid.');
        }

        return $maxSaving > 0 ? 100 * ($saving / $maxSaving) * $riskFactor * $effortFactor : 0;
    }
}
