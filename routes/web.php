<?php

use Illuminate\Support\Facades\Route;

// SPA entry point - serves the React app
Route::get('/{any?}', function () {
    return view('app');
})->where('any', '.*');
