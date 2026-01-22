<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserProfile extends Model
{
    protected $fillable = [
        'name',
        'resume_text',
        'resume_path',
        'skills',
        'location',
        'job_type',
        'experience_level',
    ];

    protected $casts = [
        'skills' => 'array',
    ];
}
