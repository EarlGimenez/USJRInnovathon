<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\JobController;
use App\Http\Controllers\Api\SeminarController;
use App\Http\Controllers\Api\SessionController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\CredentialController;
use App\Http\Controllers\Api\SkillController;

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

// Protected routes (require authentication)
Route::middleware('auth:sanctum')->group(function () {
    // Profile
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::post('/profile/base64', [ProfileController::class, 'updateWithBase64']);

    // Credentials
    Route::apiResource('credentials', CredentialController::class);

    // Skills
    Route::apiResource('skills', SkillController::class);
});
