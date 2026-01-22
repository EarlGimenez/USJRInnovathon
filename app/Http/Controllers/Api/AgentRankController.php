<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\JobCandidateRankingService;
use Illuminate\Http\Request;

class AgentRankController extends Controller
{
    public function rankCandidates(Request $request, JobCandidateRankingService $rankingService)
    {
        $validated = $request->validate([
            'job_skills' => 'required|array|min:1',
            'job_skills.*' => 'required|string|min:1',

            'candidates' => 'required|array|min:1',
            'candidates.*.id' => 'required',
            'candidates.*.candidate_skills' => 'required|array',
            'candidates.*.candidate_skills.*.skill' => 'required|string|min:1',
            'candidates.*.candidate_skills.*.credential_count' => 'nullable|integer|min:0',
            'candidates.*.candidate_skills.*.experience_count' => 'nullable|integer|min:0',

            'similarity_threshold' => 'nullable|numeric|min:0|max:1',
        ]);

        $ranked = $rankingService->rank(
            $validated['job_skills'],
            $validated['candidates'],
            (float) ($validated['similarity_threshold'] ?? 0.75),
        );

        return response()->json([
            'ranked' => $ranked,
        ]);
    }
}
