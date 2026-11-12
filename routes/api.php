<?php

use App\Http\Controllers\AnalysisController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\MobileAuthController;
use App\Http\Middleware\WorkloadTokenAbility;
use Illuminate\Support\Facades\Route;

Route::post('/mobile/login', [MobileAuthController::class, 'login'])->middleware('throttle:login');

Route::middleware(['auth:sanctum', WorkloadTokenAbility::class])->group(function () {
    Route::post('/mobile/logout', [MobileAuthController::class, 'logout']);
    Route::get('/imports/{import}/analyses', [AnalysisController::class, 'index']);
    Route::post('/imports/{import}/analyses', [AnalysisController::class, 'store'])->middleware('throttle:10,1');
    Route::get('/analyses/{run}', [AnalysisController::class, 'show']);
    Route::post('/analyses/{run}/retry', [AnalysisController::class, 'retry'])->middleware('throttle:10,1');
    Route::post('/analyses/{run}/cancel', [AnalysisController::class, 'cancel'])->middleware('throttle:10,1');
    Route::post('/analyses/{run}/resume', [AnalysisController::class, 'resume'])->middleware('throttle:10,1');
    Route::get('/analyses/{run}/export/{format}', [AnalysisController::class, 'export']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::get('/imports', [ImportController::class, 'index']);
    Route::post('/imports', [ImportController::class, 'store'])->middleware('throttle:30,1');
    Route::get('/import-template', [ImportController::class, 'template']);
    Route::get('/imports/{import}', [ImportController::class, 'show']);
    Route::get('/imports/{import}/activities', [ImportController::class, 'activities']);
});
