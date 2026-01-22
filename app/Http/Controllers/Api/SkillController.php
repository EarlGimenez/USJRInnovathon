<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserSkill;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SkillController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $skills = UserSkill::where('user_id', Auth::id())
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
            'name' => 'required|string|max:255',
        ]);

        $skill = UserSkill::create([
            'user_id' => Auth::id(),
            'name' => $validated['name']
        ]);

        return response()->json([
            'message' => 'Skill added successfully',
            'skill' => $skill
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $skill = UserSkill::where('user_id', Auth::id())
            ->findOrFail($id);

        return response()->json($skill);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $skill = UserSkill::where('user_id', Auth::id())
            ->findOrFail($id);

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
    public function destroy(string $id)
    {
        $skill = UserSkill::where('user_id', Auth::id())
            ->findOrFail($id);

        $skill->delete();

        return response()->json([
            'message' => 'Skill deleted successfully'
        ]);
    }
}
