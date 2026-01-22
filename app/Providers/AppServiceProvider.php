<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\CareerJetService;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(CareerJetService::class, function ($app) {
            return new CareerJetService();
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
