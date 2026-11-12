<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class MobileAuthController extends Controller
{
    public function login(Request $request)
    {
        abort_unless($request->secure() || app()->environment('local', 'testing'), 403, 'HTTPS wajib digunakan.');
        $input = $request->validate([
            'username' => ['required', 'string', 'max:100'],
            'password' => ['required', 'string', 'max:255'],
            'device_name' => ['required', 'string', 'max:100'],
        ]);
        abort_unless(Schema::hasTable('personal_access_tokens'), 503, 'Login Android belum diaktifkan. Hubungi pengelola aplikasi.');
        $provider = Auth::createUserProvider('users');
        $credentials = array_intersect_key($input, array_flip(['username', 'password']));
        $user = $provider->retrieveByCredentials($credentials);
        // Legacy accounts must first upgrade through a valid web login. Never
        // issue a token backed by a plaintext password or mutate a web session.
        if (! $user || password_get_info($user->getAuthPassword())['algoName'] === 'unknown'
            || ! $provider->validateCredentials($user, $credentials)) {
            throw ValidationException::withMessages(['username' => ['Username atau password tidak sesuai.']]);
        }
        $expires = now()->addHours(max(1, min(168, config('mobile.token_hours'))));
        $token = $user->createToken($input['device_name'], ['workload:access'], $expires);

        return response()->json([
            'user' => $user, 'token' => $token->plainTextToken,
            'token_type' => 'Bearer', 'expires_at' => $expires->toIso8601String(),
        ])->header('Cache-Control', 'no-store');
    }

    public function logout(Request $request)
    {
        $token = $request->user()->currentAccessToken();
        abort_unless($token instanceof PersonalAccessToken, 403);
        $token->delete();

        return response()->json(['message' => 'Sesi perangkat berhasil diakhiri.']);
    }
}
