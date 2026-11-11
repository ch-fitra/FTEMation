<?php

namespace Tests\Unit;

use App\Services\Workload\FteCalculator;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class FteCalculatorTest extends TestCase
{
    #[DataProvider('frequencies')]
    public function test_fte_uses_annual_factor(string $frequency, float $expected): void
    {
        $this->assertEqualsWithDelta($expected, app(FteCalculator::class)->calculate(10, 9, $frequency), 1e-12);
    }

    public static function frequencies(): array
    {
        return [['daily', 0.1875], ['weekly', 0.0375], ['monthly', 0.009375]];
    }

    #[DataProvider('invalidInputs')]
    public function test_invalid_calculation_inputs_are_rejected(float $volume, float $duration, string $frequency): void
    {
        $this->expectException(InvalidArgumentException::class);
        app(FteCalculator::class)->calculate($volume, $duration, $frequency);
    }

    public static function invalidInputs(): array
    {
        return [[0, 9, 'daily'], [-1, 9, 'daily'], [1, 0, 'weekly'], [1, 9, 'yearly'], [INF, 9, 'daily'], [1, NAN, 'daily']];
    }

    public function test_saving_and_priority_are_deterministic(): void
    {
        $calculator = app(FteCalculator::class);
        $this->assertEqualsWithDelta(0.1125, $calculator->saving(0.1875, 'high'), 1e-12);
        $this->assertEqualsWithDelta(0.05625, $calculator->saving(0.1875, 'medium'), 1e-12);
        $this->assertEqualsWithDelta(0.01875, $calculator->saving(0.1875, 'low'), 1e-12);
        $this->assertEqualsWithDelta(52.5, $calculator->priority(0.1125, 0.1125, 'medium', 'medium'), 1e-12);
        $this->assertSame(0.0, $calculator->priority(0, 0, 'low', 'low'));
    }
}
