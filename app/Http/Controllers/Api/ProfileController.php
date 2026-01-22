<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    /**
     * Get the authenticated user's profile
     */
    public function show()
    {
        $user = Auth::user()->load(['credentials', 'skills']);

        return response()->json($user);
    }

    /**
     * Update the authenticated user's profile
     */
    public function update(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'profile_picture' => 'sometimes|image|max:2048',
            'cover_photo' => 'sometimes|image|max:2048',
        ]);

        // Handle profile picture upload
        if ($request->hasFile('profile_picture')) {
            // Delete old profile picture if exists
            if ($user->profile_picture) {
                Storage::disk('public')->delete($user->profile_picture);
            }
            
            $path = $request->file('profile_picture')->store('profile_pictures', 'public');
            $validated['profile_picture'] = $path;
        }

        // Handle cover photo upload
        if ($request->hasFile('cover_photo')) {
            // Delete old cover photo if exists
            if ($user->cover_photo) {
                Storage::disk('public')->delete($user->cover_photo);
            }
            
            $path = $request->file('cover_photo')->store('cover_photos', 'public');
            $validated['cover_photo'] = $path;
        }

        $user->update($validated);

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user
        ]);
    }

    /**
     * Update profile with base64 images
     */
    public function updateWithBase64(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'profile_picture' => 'sometimes|string',
            'cover_photo' => 'sometimes|string',
        ]);

        // Handle base64 profile picture
        if (isset($validated['profile_picture']) && str_starts_with($validated['profile_picture'], 'data:image')) {
            $image = $validated['profile_picture'];
            $image = str_replace('data:image/png;base64,', '', $image);
            $image = str_replace('data:image/jpg;base64,', '', $image);
            $image = str_replace('data:image/jpeg;base64,', '', $image);
            $image = str_replace(' ', '+', $image);
            $imageName = 'profile_' . time() . '.png';
            
            Storage::disk('public')->put('profile_pictures/' . $imageName, base64_decode($image));
            
            // Delete old profile picture if exists
            if ($user->profile_picture) {
                Storage::disk('public')->delete($user->profile_picture);
            }
            
            $validated['profile_picture'] = 'profile_pictures/' . $imageName;
        }

        // Handle base64 cover photo
        if (isset($validated['cover_photo']) && str_starts_with($validated['cover_photo'], 'data:image')) {
            $image = $validated['cover_photo'];
            $image = str_replace('data:image/png;base64,', '', $image);
            $image = str_replace('data:image/jpg;base64,', '', $image);
            $image = str_replace('data:image/jpeg;base64,', '', $image);
            $image = str_replace(' ', '+', $image);
            $imageName = 'cover_' . time() . '.png';
            
            Storage::disk('public')->put('cover_photos/' . $imageName, base64_decode($image));
            
            // Delete old cover photo if exists
            if ($user->cover_photo) {
                Storage::disk('public')->delete($user->cover_photo);
            }
            
            $validated['cover_photo'] = 'cover_photos/' . $imageName;
        }

        $user->update($validated);

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user
        ]);
    }
}
