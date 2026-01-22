<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Cache;

class SessionController extends Controller
{
    /**
     * Create a new anonymous session with skill profile
     */
    public function create(Request $request)
    {
        $validated = $request->validate([
            'skills' => 'required|array',
            'skills.*' => 'integer|min:0|max:100'
        ]);

        $sessionId = 'session_' . Str::uuid();
        
        $sessionData = [
            'sessionId' => $sessionId,
            'skills' => $validated['skills'],
            'created_at' => now()->toIso8601String(),
            'seminars_attended' => []
        ];

        // Store in cache for 24 hours (for demo purposes)
        Cache::put($sessionId, $sessionData, now()->addHours(24));

        return response()->json([
            'sessionId' => $sessionId,
            'skills' => $validated['skills']
        ]);
    }

    /**
     * Get session data
     */
    public function show(string $sessionId)
    {
        $sessionData = Cache::get($sessionId);

        if (!$sessionData) {
            return response()->json([
                'error' => 'Session not found'
            ], 404);
        }

        return response()->json($sessionData);
    }
}
