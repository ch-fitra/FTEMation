<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_can_login_and_logout_without_api_tokens(): void
    {
        config(['ftemation.demo_password' => 'Test-Demo-2026!']);
        $this->seed(DemoUserSeeder::class);
        $user = User::firstOrFail();
        $this->assertTrue(Hash::check('Test-Demo-2026!', $user->password));
        $response = $this->postJson('/api/login', ['email' => $user->email, 'password' => 'Test-Demo-2026!']);
        $response->assertOk()->assertJsonPath('user.email', $user->email)->assertJsonMissingPath('user.password')->assertJsonMissingPath('token');
        $this->assertAuthenticatedAs($user, 'web');
        $this->withHeader('Origin', 'http://localhost:5173')->getJson('/api/user')->assertOk();
        $this->postJson('/api/logout')->assertOk();
        $this->assertGuest('web');
    }

    public function test_guest_cannot_access_private_endpoints(): void
    {
        $this->getJson('/api/user')->assertUnauthorized();
        $this->getJson('/api/imports')->assertUnauthorized();
        $this->postJson('/api/imports')->assertUnauthorized();
        $this->getJson('/api/imports/1')->assertUnauthorized();
        $this->getJson('/api/imports/1/activities')->assertUnauthorized();
    }

    public function test_wrong_password_does_not_authenticate(): void
    {
        User::factory()->create(['email' => 'demo@example.test']);
        $this->postJson('/api/login', ['email' => 'demo@example.test', 'password' => 'incorrect'])->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->assertGuest('web');
    }

    public function test_malformed_login_inputs_are_validation_errors(): void
    {
        $this->postJson('/api/login', ['email' => ['unexpected'], 'password' => ['unexpected']])
            ->assertUnprocessable()->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_login_is_rate_limited(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', ['email' => 'limited@example.test', 'password' => 'incorrect'])->assertUnprocessable();
        }
        $this->postJson('/api/login', ['email' => 'limited@example.test', 'password' => 'incorrect'])->assertStatus(429);
    }

    public function test_seeder_is_idempotent_and_preserves_existing_password(): void
    {
        config(['ftemation.demo_password' => 'Test-Demo-2026!']);
        $this->seed(DemoUserSeeder::class);
        config(['ftemation.demo_password' => 'Another-Password!']);
        $this->seed(DemoUserSeeder::class);
        $this->assertDatabaseCount('users', 1);
        $this->assertTrue(Hash::check('Test-Demo-2026!', User::first()->password));
    }
}
