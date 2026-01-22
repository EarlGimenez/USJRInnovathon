<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Skill;
use Illuminate\Http\Request;

class SkillController extends Controller
{
    /**
     * List global skills (canonical skills with embeddings).
     */
    public function index(Request $request)
    {
        $q = trim((string) $request->input('q', ''));
        $limit = (int) $request->input('limit', 50);
        $limit = max(1, min(200, $limit));

        $query = Skill::query()->select(['id', 'name']);
        if ($q !== '') {
            $query->where('name', 'like', '%' . $q . '%');
        }

        $skills = $query
            ->orderBy('name')
            ->limit($limit)
            ->get();

        return response()->json($skills);
    }

    /**
     * Show one global skill.
     */
    public function show(string $id)
    {
        $skill = Skill::query()->select(['id', 'name'])->findOrFail($id);

        return response()->json([
            'skill' => $skill,
        ]);
    }
}

