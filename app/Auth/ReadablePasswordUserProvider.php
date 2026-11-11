<?php

namespace App\Auth;

use Illuminate\Auth\EloquentUserProvider;
use Illuminate\Contracts\Auth\Authenticatable;

class ReadablePasswordUserProvider extends EloquentUserProvider
{
    public function validateCredentials(Authenticatable $user, #[\SensitiveParameter] array $credentials)
    {
        $plain = $credentials['password'] ?? null;
        $stored = $user->getAuthPassword();
        if (! is_string($plain) || ! is_string($stored) || $plain === '' || $stored === '') {
            return false;
        }

        // Existing bcrypt/Argon passwords remain usable until a successful login.
        if (password_get_info($stored)['algoName'] !== 'unknown') {
            return password_verify($plain, $stored);
        }

        return hash_equals($stored, $plain);
    }

    public function rehashPasswordIfRequired(Authenticatable $user, #[\SensitiveParameter] array $credentials, bool $force = false)
    {
        // This application intentionally stores readable passwords, per owner request.
        if ($user->getAuthPassword() !== $credentials['password']) {
            $user->forceFill([$user->getAuthPasswordName() => $credentials['password']])->save();
        }
    }
}
