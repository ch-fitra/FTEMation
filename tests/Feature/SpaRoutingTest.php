<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SpaRoutingTest extends TestCase
{
    public function test_legacy_url_redirects_to_the_root_workspace(): void
    {
        $this->get('/app')->assertRedirect('/');
        $this->get('/app/imports')->assertRedirect('/imports');
        $this->get('/app/activities')->assertRedirect('/activities');
    }

    #[DataProvider('workspaceUrls')]
    public function test_workspace_urls_use_the_same_spa_entry(string $url): void
    {
        // Isolate the route test from generated Vite artifacts on developer/CI machines.
        $public = sys_get_temp_dir().'/ftemation-spa-'.bin2hex(random_bytes(8));
        mkdir($public.'/build', 0777, true);
        file_put_contents($public.'/build/index.html', '<div id="root"></div>');
        $original = public_path();
        $this->app->usePublicPath($public);

        try {
            $response = $this->get($url);
            $response->assertOk();
            $this->assertSame(realpath($public.'/build/index.html'), $response->baseResponse->getFile()->getRealPath());
            $response->assertHeader('Cache-Control', 'no-store, public');
        } finally {
            $this->app->usePublicPath($original);
            unlink($public.'/build/index.html');
            rmdir($public.'/build');
            rmdir($public);
        }
    }

    public static function workspaceUrls(): array
    {
        return [['/'], ['/imports'], ['/activities'], ['/imports?review=refresh']];
    }

    public function test_unknown_api_route_remains_not_found(): void
    {
        $this->getJson('/api/route-that-does-not-exist')->assertNotFound();
    }
}
