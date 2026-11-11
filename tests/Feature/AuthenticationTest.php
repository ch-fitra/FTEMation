<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DemoUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_can_login_and_logout_without_api_tokens(): void
    {
        config(['ftemation.demo_password' => 'admin123']);
        $this->seed(DemoUserSeeder::class);
        $user = User::firstOrFail();
        $this->assertSame('admin123', $user->password);
        $response = $this->postJson('/api/login', ['username' => $user->username, 'password' => 'admin123']);
        $response->assertJsonPath('user.name', 'Demo')->assertJsonPath('user.username', 'akun demo');
        $response->assertOk()->assertJsonPath('user.email', $user->email)->assertJsonMissingPath('user.password')->assertJsonMissingPath('token');
        $this->assertAuthenticatedAs($user, 'web');
        $this->withHeader('Origin', 'http://localhost:5173')->getJson('/api/user')->assertOk();
        $this->postJson('/api/logout')->assertOk();
        $this->assertGuest('web');
    }

    public function test_existing_hash_is_preserved_on_failure_and_converted_after_success(): void
    {
        $user = User::factory()->create(['password' => Hash::make('Legacy-Password!')]);
        $hashed = $user->password;
        $this->postJson('/api/login', ['username' => $user->username, 'password' => 'wrong'])
            ->assertUnprocessable();
        $this->assertSame($hashed, $user->fresh()->password);
        $this->postJson('/api/login', ['username' => $user->username, 'password' => $hashed])
            ->assertUnprocessable();
        $this->postJson('/api/login', ['username' => $user->username, 'password' => 'Legacy-Password!'])
            ->assertOk()->assertJsonMissingPath('user.password');
        $this->assertSame('Legacy-Password!', $user->fresh()->password);
    }

    public function test_password_edited_directly_in_database_is_used_for_login(): void
    {
        $user = User::factory()->create(['password' => 'Original-Password!']);
        DB::table('users')->where('id', $user->id)->update(['password' => 'Changed-Password!']);
        $this->postJson('/api/login', ['username' => $user->username, 'password' => 'Original-Password!'])->assertUnprocessable();
        $this->postJson('/api/login', ['username' => $user->username, 'password' => 'Changed-Password!'])
            ->assertOk()->assertJsonMissingPath('user.password');
        $this->getJson('/api/user')->assertOk()->assertJsonMissingPath('user.password');
        $this->assertSame('Changed-Password!', $user->fresh()->password);
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
        User::factory()->create(['username' => 'demo test']);
        $this->postJson('/api/login', ['username' => 'demo test', 'password' => 'incorrect'])->assertUnprocessable()->assertJsonValidationErrors('username');
        $this->assertGuest('web');
    }

    public function test_malformed_login_inputs_are_validation_errors(): void
    {
        $this->postJson('/api/login', ['username' => ['unexpected'], 'password' => ['unexpected']])
            ->assertUnprocessable()->assertJsonValidationErrors(['username', 'password']);
    }

    public function test_email_is_not_accepted_as_the_login_identifier(): void
    {
        $user = User::factory()->create();
        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password'])
            ->assertUnprocessable()->assertJsonValidationErrors('username');
        $this->assertGuest('web');
    }

    public function test_username_length_is_validated(): void
    {
        $this->postJson('/api/login', ['username' => str_repeat('x', 101), 'password' => 'password'])
            ->assertUnprocessable()->assertJsonValidationErrors('username');
    }

    public function test_login_is_rate_limited(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', ['username' => 'limited test', 'password' => 'incorrect'])->assertUnprocessable();
        }
        $this->postJson('/api/login', ['username' => 'limited test', 'password' => 'incorrect'])->assertStatus(429);
    }

    public function test_seeder_is_idempotent_and_preserves_existing_password(): void
    {
        config(['ftemation.demo_password' => 'Test-Demo-2026!']);
        $this->seed(DemoUserSeeder::class);
        $originalId = User::firstOrFail()->id;
        User::firstOrFail()->update(['name' => 'Previous demo name', 'username' => 'previous demo']);
        config(['ftemation.demo_password' => 'Another-Password!']);
        $this->seed(DemoUserSeeder::class);
        $this->assertDatabaseCount('users', 1);
        $this->assertSame($originalId, User::firstOrFail()->id);
        $this->assertSame('Demo', User::firstOrFail()->name);
        $this->assertSame('akun demo', User::firstOrFail()->username);
        $this->assertSame('Test-Demo-2026!', User::first()->password);
    }
}
