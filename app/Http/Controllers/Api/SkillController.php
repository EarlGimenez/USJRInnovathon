<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Skill;
use Illuminate\Http\Request;

class SkillController extends Controller
{
    /**
     * Display a listing of the resource for a user.
     */
    public function index(string $userId)
    {
        $skills = Skill::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($skills);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|string',
            'name' => 'required|string|max:255',
        ]);

        $skill = Skill::create([
            'user_id' => $validated['user_id'],
            'name' => $validated['name']
        ]);

        return response()->json([
            'message' => 'Skill added successfully',
            'skill' => $skill
        ], 201);
    }

    /**
     * Bulk store skills for a user (used by resume parser)
     */
    public function bulkStore(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|string',
            'skills' => 'required|array',
            'skills.*.name' => 'required|string|max:255',
            'replace' => 'boolean', // If true, delete existing skills first
        ]);

        $userId = $validated['user_id'];
        
        // Optionally replace existing skills
        if ($request->input('replace', false)) {
            Skill::where('user_id', $userId)->delete();
        }

        $created = [];
        foreach ($validated['skills'] as $skillData) {
            // Avoid duplicates
            $existing = Skill::where('user_id', $userId)
                ->where('name', $skillData['name'])
                ->first();
            
            if (!$existing) {
                $skill = Skill::create([
                    'user_id' => $userId,
                    'name' => $skillData['name']
                ]);
                $created[] = $skill;
            } else {
                $created[] = $existing;
            }
        }

        return response()->json([
            'message' => 'Skills added successfully',
            'skills' => $created,
            'count' => count($created)
        ], 201);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $skillId)
    {
        $skill = Skill::findOrFail($skillId);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $skill->update($validated);

        return response()->json([
            'message' => 'Skill updated successfully',
            'skill' => $skill
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $skillId)
    {
        $skill = Skill::findOrFail($skillId);
        $skill->delete();

        return response()->json([
            'message' => 'Skill deleted successfully'
        ]);
    }
}
