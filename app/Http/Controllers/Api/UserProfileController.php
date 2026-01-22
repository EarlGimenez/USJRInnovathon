<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class UserProfileController extends Controller
{
    /**
     * Get the latest user profile (since we don't have auth yet)
     */
    public function getLatest()
    {
        $profile = UserProfile::latest()->first();
        
        if (!$profile) {
            return response()->json([
                'profile' => null,
                'message' => 'No profile found. Create one first.'
            ]);
        }
        
        return response()->json([
            'profile' => $profile
        ]);
    }
    
    /**
     * Save or update user profile
     */
    public function save(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'nullable|string|max:255',
            'resume_text' => 'nullable|string',
            'skills' => 'nullable|array',
            'location' => 'nullable|string|max:255',
            'job_type' => 'nullable|string|max:100',
            'experience_level' => 'nullable|string|max:50',
        ]);
        
        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors()
            ], 422);
        }
        
        // Get latest profile or create new one
        $profile = UserProfile::latest()->first();
        
        if ($profile) {
            // Update existing profile
            $profile->update($request->all());
        } else {
            // Create new profile
            $profile = UserProfile::create($request->all());
        }
        
        return response()->json([
            'success' => true,
            'profile' => $profile,
            'message' => 'Profile saved successfully'
        ]);
    }
}
