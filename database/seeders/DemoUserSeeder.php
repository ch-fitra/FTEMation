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
        if (! is_string($password) || strlen($password) < 8) {
            throw new RuntimeException('Isi DEMO_PASSWORD minimal 8 karakter di .env sebelum menjalankan seeder.');
        }
        $user = User::firstOrCreate(['email' => config('ftemation.demo_email')], [
            'name' => config('ftemation.demo_name'), 'username' => config('ftemation.demo_username'), 'password' => $password,
        ]);
        $user->fill(['name' => config('ftemation.demo_name'), 'username' => config('ftemation.demo_username')])->save();
    }
}
