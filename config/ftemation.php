<?php

return [
    'annual_capacity_minutes' => 115200,
    'annual_factors' => ['daily' => 240, 'weekly' => 48, 'monthly' => 12],
    'saving_rates' => ['high' => 0.60, 'medium' => 0.30, 'low' => 0.10],
    'risk_factors' => ['low' => 1, 'medium' => 0.7, 'high' => 0.4],
    'effort_factors' => ['low' => 1, 'medium' => 0.75, 'high' => 0.5],
    'max_import_rows' => 10000,
    'max_uncompressed_bytes' => 50 * 1024 * 1024,
    'demo_email' => env('DEMO_EMAIL', 'demo@ftemation.local'),
    'demo_password' => env('DEMO_PASSWORD'),
    'ai' => [
        'base_url' => env('DEEPSEEK_BASE_URL', 'https://api.deepseek.com'),
        'api_key' => env('DEEPSEEK_API_KEY'),
        'model' => env('DEEPSEEK_MODEL', 'deepseek-flash'),
        'thinking' => false,
    ],
];
