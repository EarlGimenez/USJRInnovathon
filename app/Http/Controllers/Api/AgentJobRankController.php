<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\JobPostingRankingService;
use Illuminate\Http\Request;

class AgentJobRankController extends Controller
{
    public function rankJobs(Request $request, JobPostingRankingService $rankingService)
    {
        $validated = $request->validate([
            'candidate_skills' => 'required|array',
            'candidate_skills.*.skill' => 'required|string|min:1',
            'candidate_skills.*.credential_count' => 'nullable|integer|min:0',
            'candidate_skills.*.experience_count' => 'nullable|integer|min:0',

            'jobs' => 'required|array|min:1',
            'jobs.*' => 'required|array',

            // Flexible job skill fields; we validate lightly and normalize in the service.
            'jobs.*.job_skills' => 'nullable|array',
            'jobs.*.job_skills.*' => 'nullable|string',
            'jobs.*.required_skills' => 'nullable|array',
            'jobs.*.required_skills.*' => 'nullable|string',
            'jobs.*.requiredSkills' => 'nullable|array',

            'similarity_threshold' => 'nullable|numeric|min:0|max:1',
        ]);

        $ranked = $rankingService->rank(
            $validated['candidate_skills'],
            $validated['jobs'],
            (float) ($validated['similarity_threshold'] ?? 0.75),
        );

        return response()->json([
            'ranked' => $ranked,
        ]);
    }
}
