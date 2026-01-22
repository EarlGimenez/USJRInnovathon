<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\JobController;
use App\Http\Controllers\Api\SeminarController;
use App\Http\Controllers\Api\SessionController;
use App\Http\Controllers\Api\AgentMatchController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Session management (anonymous skill profiles)
Route::post('/session', [SessionController::class, 'create']);
Route::get('/session/{sessionId}', [SessionController::class, 'show']);

// Jobs
Route::get('/jobs', [JobController::class, 'index']);
Route::get('/jobs/{id}', [JobController::class, 'show']);

// Seminars
Route::get('/seminars', [SeminarController::class, 'index']);
Route::get('/seminars/{id}', [SeminarController::class, 'show']);
Route::post('/seminars/{id}/register', [SeminarController::class, 'register']);
Route::post('/seminars/{id}/verify', [SeminarController::class, 'verify']);

// Agent triggers
Route::post('/agent/match-score', [AgentMatchController::class, 'score']);
