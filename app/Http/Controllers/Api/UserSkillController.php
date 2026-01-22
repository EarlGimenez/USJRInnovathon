<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserSkill;
use Illuminate\Http\Request;

class UserSkillController extends Controller
{
    /**
     * Display a listing of user skills.
     */
    public function index(string $userId)
    {
        $skills = UserSkill::query()
            ->where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($skills);
    }

    /**
     * Store a newly created user skill.
     */
    public function store(Request $request, string $userId)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'rating' => 'nullable|integer|min:0|max:100',
        ]);

        $name = $this->normalizeName($validated['name']);

        $skill = UserSkill::create([
            'user_id' => $userId,
            'name' => $name,
            'rating' => isset($validated['rating']) ? (int) $validated['rating'] : null,
        ]);

        return response()->json([
            'message' => 'User skill added successfully',
            'skill' => $skill,
        ], 201);
    }

    /**
     * Bulk store skills for a user (used by resume parser)
     */
    public function bulkStore(Request $request, string $userId)
    {
        $validated = $request->validate([
            'skills' => 'required|array',
            'skills.*.name' => 'required|string|max:255',
            'skills.*.rating' => 'nullable|integer|min:0|max:100',
            'replace' => 'boolean',
        ]);

        if ($request->boolean('replace', false)) {
            UserSkill::query()->where('user_id', $userId)->delete();
        }

        $created = [];
        foreach ($validated['skills'] as $skillData) {
            $name = $this->normalizeName((string) $skillData['name']);
            if ($name === '') {
                continue;
            }

            $rating = null;
            if (array_key_exists('rating', $skillData) && $skillData['rating'] !== null) {
                $rating = (int) $skillData['rating'];
                if ($rating < 0) {
                    $rating = 0;
                }
                if ($rating > 100) {
                    $rating = 100;
                }
            }

            $existing = UserSkill::query()
                ->where('user_id', $userId)
                ->whereRaw('lower(name) = ?', [mb_strtolower($name)])
                ->first();

            if ($existing) {
                // Keep the best rating we have (if provided)
                if ($rating !== null) {
                    $existing->rating = max((int) ($existing->rating ?? 0), $rating);
                    $existing->save();
                }
                $created[] = $existing;
                continue;
            }

            $created[] = UserSkill::create([
                'user_id' => $userId,
                'name' => $name,
                'rating' => $rating,
            ]);
        }

        return response()->json([
            'message' => 'User skills added successfully',
            'skills' => $created,
            'count' => count($created),
        ], 201);
    }

    /**
     * Update a user skill.
     */
    public function update(Request $request, string $userId, string $skillId)
    {
        $skill = UserSkill::query()
            ->where('user_id', $userId)
            ->findOrFail($skillId);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'rating' => 'nullable|integer|min:0|max:100',
        ]);

        $skill->update([
            'name' => $this->normalizeName($validated['name']),
            'rating' => array_key_exists('rating', $validated) ? (is_null($validated['rating']) ? null : (int) $validated['rating']) : $skill->rating,
        ]);

        return response()->json([
            'message' => 'User skill updated successfully',
            'skill' => $skill,
        ]);
    }

    /**
     * Remove a user skill.
     */
    public function destroy(string $userId, string $skillId)
    {
        $skill = UserSkill::query()
            ->where('user_id', $userId)
            ->findOrFail($skillId);

        $skill->delete();

        return response()->json([
            'message' => 'User skill deleted successfully',
        ]);
    }

    private function normalizeName(string $name): string
    {
        $name = trim($name);
        $name = preg_replace('/\s+/', ' ', $name);
        return (string) $name;
    }
}
