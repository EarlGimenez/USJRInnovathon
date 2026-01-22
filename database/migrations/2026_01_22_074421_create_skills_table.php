<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // The `skills` table may already exist if it was created outside of
        // Laravel migrations (e.g. by an ingestion script). Make this migration
        // resilient so `php artisan migrate` can still succeed.
        if (! Schema::hasTable('skills')) {
            Schema::create('skills', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->binary('embedding')->nullable();
            });

            return;
        }

        if (! Schema::hasColumn('skills', 'embedding')) {
            Schema::table('skills', function (Blueprint $table) {
                $table->binary('embedding')->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('skills');
    }
};
