<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\WorkloadImport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MobileAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_pending_token_migration_returns_service_unavailable_without_issuing_tokens(): void
    {
        // RefreshDatabase is forced to SQLite in-memory by phpunit.xml.
        Schema::drop('personal_access_tokens');
        $this->postJson('/api/mobile/login', ['username' => 'fixture', 'password' => 'wrong', 'device_name' => 'Android'])
            ->assertStatus(503)->assertJsonMissingPath('token');
    }

    private function login(User $user, string $device = 'Android test'): string
    {
        return $this->postJson('/api/mobile/login', [
            'username' => $user->username, 'password' => 'password', 'device_name' => $device,
        ])->assertOk()->assertJsonPath('token_type', 'Bearer')->assertJsonMissingPath('user.password')->json('token');
    }

    public function test_mobile_tokens_have_expiry_and_logout_revokes_only_current_device(): void
    {
        $user = User::factory()->create();
        $a = $this->login($user);
        $b = $this->login($user, 'Second device');
        $this->assertCount(2, $user->tokens);
        $this->assertNotSame($a, $user->tokens->first()->token);
        $this->assertSame(['workload:access'], $user->tokens->first()->abilities);
        $this->assertTrue($user->tokens->first()->expires_at->isFuture());
        $this->withToken($a)->getJson('/api/user')->assertOk();
        $this->app['auth']->forgetGuards();
        $this->withToken($a)->postJson('/api/mobile/logout')->assertOk();
        $this->app['auth']->forgetGuards();
        $this->withToken($a)->getJson('/api/user')->assertUnauthorized();
        $this->app['auth']->forgetGuards();
        $this->withToken($b)->getJson('/api/user')->assertOk();
        $this->assertSame(1, $user->tokens()->count());
    }

    public function test_invalid_expired_and_insufficient_tokens_are_rejected(): void
    {
        $user = User::factory()->create();
        $this->withToken('invalid')->getJson('/api/imports')->assertUnauthorized();
        $expired = $user->createToken('expired', ['workload:access'], now()->subMinute());
        $this->app['auth']->forgetGuards();
        $this->withToken($expired->plainTextToken)->getJson('/api/imports')->assertUnauthorized();
        $restricted = $user->createToken('restricted', ['unrelated'], now()->addHour());
        $this->app['auth']->forgetGuards();
        $this->withToken($restricted->plainTextToken)->getJson('/api/imports')->assertForbidden();
    }

    public function test_plaintext_accounts_and_wrong_credentials_cannot_issue_tokens(): void
    {
        $user = User::factory()->create();
        $input = ['username' => $user->username, 'password' => 'wrong', 'device_name' => 'Android'];
        $this->postJson('/api/mobile/login', $input)->assertUnprocessable();
        DB::table('users')->where('id', $user->id)->update(['password' => 'password']);
        $input['password'] = 'password';
        $this->postJson('/api/mobile/login', $input)->assertUnprocessable();
        $this->assertSame('password', $user->fresh()->password);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_mobile_login_is_rate_limited(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/mobile/login', ['username' => 'missing', 'password' => 'wrong', 'device_name' => 'Android'])->assertUnprocessable();
        }
        $this->postJson('/api/mobile/login', ['username' => 'missing', 'password' => 'wrong', 'device_name' => 'Android'])->assertStatus(429);
    }

    public function test_bearer_ownership_import_pagination_and_analysis_contract(): void
    {
        Storage::fake('local');
        Queue::fake();
        $user = User::factory()->create();
        $token = $this->login($user);
        $this->withToken($token)->postJson('/api/imports', ['file' => UploadedFile::fake()->create('invalid.txt', 1)])
            ->assertUnprocessable();
        $import = $this->withToken($token)->postJson('/api/imports', [
            'file' => new UploadedFile(base_path('samples/FTEMation_Workload_Dataset_v1.xlsx'), 'workload.xlsx', null, null, true),
        ])->assertCreated()->assertJsonPath('summary.activities_count', 60)->json('import.id');
        $this->withToken($token)->getJson('/api/imports/'.$import.'/activities?per_page=10&page=2')
            ->assertOk()->assertJsonPath('current_page', 2)->assertJsonCount(10, 'data');
        $this->withToken($token)->getJson('/api/imports/'.$import)->assertOk()
            ->assertJsonPath('summary.total_fte', 4.4671875);
        $other = User::factory()->create();
        $foreign = WorkloadImport::create(['user_id' => $other->id, 'filename' => 'foreign.xlsx', 'status' => 'imported']);
        $run = $foreign->analysisRuns()->create(['status' => 'queued', 'model_name' => 'fixture', 'prompt_version' => 'fixture', 'config_snapshot' => []]);
        foreach (['/api/imports/'.$foreign->id, '/api/imports/'.$foreign->id.'/activities', '/api/imports/'.$foreign->id.'/analyses', '/api/analyses/'.$run->id, '/api/analyses/'.$run->id.'/export/json'] as $path) {
            $this->withToken($token)->getJson($path)->assertNotFound();
        }
        foreach (['retry', 'cancel', 'resume'] as $action) {
            $this->withToken($token)->postJson('/api/analyses/'.$run->id.'/'.$action, ['execution_version' => 0])->assertNotFound();
        }
        $this->assertSame(0, $run->fresh()->requests_count);
    }

    public function test_cookie_logout_cannot_revoke_tokens_and_web_session_is_preserved(): void
    {
        $user = User::factory()->create();
        $token = $this->login($user);
        $this->postJson('/api/login', ['username' => $user->username, 'password' => 'password'])->assertOk();
        $this->postJson('/api/mobile/logout')->assertForbidden();
        $this->assertAuthenticatedAs($user, 'web');
        $this->assertSame(1, $user->tokens()->count());
        $this->postJson('/api/logout')->assertOk();
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/user')->assertOk();
    }
}
