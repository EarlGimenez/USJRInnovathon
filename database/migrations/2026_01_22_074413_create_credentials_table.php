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
        // The credentials table is created by an earlier migration in this repo.
        // This migration upgrades the schema to include the expected columns.
        if (!Schema::hasTable('credentials')) {
            Schema::create('credentials', function (Blueprint $table) {
                $table->id();
                $table->timestamps();
            });
        }

        Schema::table('credentials', function (Blueprint $table) {
            // SQLite limitations: adding FK constraints via ALTER TABLE is tricky,
            // so we add the column and index; app-level relations still work.
            if (!Schema::hasColumn('credentials', 'user_id')) {
                $table->unsignedBigInteger('user_id')->nullable()->index();
            }

            if (!Schema::hasColumn('credentials', 'type')) {
                $table->string('type')->nullable();
            }

            if (!Schema::hasColumn('credentials', 'title')) {
                $table->string('title')->nullable();
            }

            if (!Schema::hasColumn('credentials', 'organization')) {
                $table->string('organization')->nullable();
            }

            if (!Schema::hasColumn('credentials', 'description')) {
                $table->text('description')->nullable();
            }

            if (!Schema::hasColumn('credentials', 'start_date')) {
                $table->string('start_date')->nullable();
            }

            if (!Schema::hasColumn('credentials', 'end_date')) {
                $table->string('end_date')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('credentials');
    }
};
