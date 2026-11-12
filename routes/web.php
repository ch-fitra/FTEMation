<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::post('/api/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/api/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
// Preserve existing bookmarks while keeping workspace URLs at the origin root.
Route::redirect('/app', '/');
Route::redirect('/app/imports', '/imports');
Route::redirect('/app/activities', '/activities');
Route::get('/{page?}', function () {
    abort_unless(is_file(public_path('build/index.html')), 503, 'Build frontend belum tersedia. Jalankan npm --prefix frontend run build.');

    return response()->file(public_path('build/index.html'), ['Cache-Control' => 'no-store']);
})->where('page', 'imports|activities|analysis|results|help');
