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
        Schema::create('user_profiles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->text('resume_text')->nullable();
            $table->string('resume_path')->nullable();
            $table->json('skills')->nullable(); // {skill_name: proficiency_level}
            $table->string('location')->default('Cebu');
            $table->string('job_type')->nullable(); // remote, full-time, etc.
            $table->string('experience_level')->nullable(); // entry, mid, senior
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_profiles');
    }
};
