<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ImportController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::get('/imports', [ImportController::class, 'index']);
    Route::post('/imports', [ImportController::class, 'store'])->middleware('throttle:30,1');
    Route::get('/imports/{import}', [ImportController::class, 'show']);
    Route::get('/imports/{import}/activities', [ImportController::class, 'activities']);
});
