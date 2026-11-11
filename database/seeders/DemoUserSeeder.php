<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

class DemoUserSeeder extends Seeder
{
    public function run(): void
    {
        $password = config('ftemation.demo_password');
        if (! is_string($password) || strlen($password) < 12) {
            throw new RuntimeException('Isi DEMO_PASSWORD minimal 12 karakter di .env sebelum menjalankan seeder.');
        }
        User::firstOrCreate(['email' => config('ftemation.demo_email')], [
            'name' => 'Demo Reviewer', 'password' => $password,
        ]);
    }
}
