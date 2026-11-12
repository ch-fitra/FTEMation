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

        // Transitional compatibility only: legacy plaintext is upgraded on login.
        if (password_get_info($stored)['algoName'] !== 'unknown') {
            return password_verify($plain, $stored);
        }

        return hash_equals($stored, $plain);
    }

    public function rehashPasswordIfRequired(Authenticatable $user, #[\SensitiveParameter] array $credentials, bool $force = false)
    {
        $stored = $user->getAuthPassword();
        if (password_get_info($stored)['algoName'] === 'unknown' || $force || $this->hasher->needsRehash($stored)) {
            // Compare-and-swap avoids overwriting a concurrent password change.
            $user->newQuery()->whereKey($user->getAuthIdentifier())
                ->where($user->getAuthPasswordName(), $stored)
                ->update([$user->getAuthPasswordName() => $this->hasher->make($credentials['password'])]);
        }
    }
}
