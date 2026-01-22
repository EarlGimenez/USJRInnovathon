<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\AdzunaService;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(AdzunaService::class, function ($app) {
            return new AdzunaService();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
