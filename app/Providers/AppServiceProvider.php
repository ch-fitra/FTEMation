<?php

namespace App\Providers;

use App\Auth\ReadablePasswordUserProvider;
use App\Services\Analysis\AnalysisQueueHealth;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Queue\Events\JobPopping;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Event::listen(JobPopping::class, fn (JobPopping $event) => app(AnalysisQueueHealth::class)->workerSeen($event->connectionName, $event->queue));

        Auth::provider('readable-password', fn ($app, array $config) => new ReadablePasswordUserProvider($app['hash'], $config['model']));

        RateLimiter::for('login', function (Request $request) {
            $username = $request->input('username');
            $key = is_string($username) ? mb_strtolower(trim($username)) : '';

            return Limit::perMinute(5)
                ->by(hash('sha256', $key).'|'.$request->ip())
                ->response(fn () => response()->json(['message' => 'Terlalu banyak percobaan login. Tunggu satu menit lalu coba lagi.'], 429));
        });
    }
}
