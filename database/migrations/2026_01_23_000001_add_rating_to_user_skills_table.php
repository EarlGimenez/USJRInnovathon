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
        Schema::table('user_skills', function (Blueprint $table) {
            if (!Schema::hasColumn('user_skills', 'rating')) {
                $table->unsignedTinyInteger('rating')->nullable()->after('name');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_skills', function (Blueprint $table) {
            if (Schema::hasColumn('user_skills', 'rating')) {
                $table->dropColumn('rating');
            }
        });
    }
};
