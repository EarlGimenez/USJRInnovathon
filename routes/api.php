<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\JobController;
use App\Http\Controllers\Api\SeminarController;
use App\Http\Controllers\Api\SessionController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\EventController;

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

// Seminars (legacy - keeping for compatibility)
Route::get('/seminars', [SeminarController::class, 'index']);
Route::get('/seminars/{id}', [SeminarController::class, 'show']);
Route::post('/seminars/{id}/register', [SeminarController::class, 'register']);
Route::post('/seminars/{id}/verify', [SeminarController::class, 'verify']);

// Events (real events from scraping)
Route::get('/events', [EventController::class, 'index']);
Route::get('/events/{id}', [EventController::class, 'show']);
Route::get('/events/skill/{skill}', [EventController::class, 'bySkill']);

// Courses (online learning from Udemy/Coursera)
Route::get('/courses', [CourseController::class, 'index']);
Route::get('/courses/recommended', [CourseController::class, 'recommended']);
Route::get('/courses/skill/{skill}', [CourseController::class, 'bySkill']);
