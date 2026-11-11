<?php

namespace App\Services\Analysis;

use RuntimeException;

class AnalysisException extends RuntimeException
{
    public function __construct(string $message, public readonly bool $retryable = true)
    {
        parent::__construct($message);
    }
}
