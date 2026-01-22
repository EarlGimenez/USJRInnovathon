<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\JobMatchService;
use Illuminate\Http\Request;
use InvalidArgumentException;

class AgentMatchController extends Controller
{
    public function score(Request $request, JobMatchService $jobMatchService)
    {
        $validated = $request->validate([
            'job_skills' => 'required|array|min:1',
            'job_skills.*' => 'required|string|min:1',

            'candidate_skills' => 'required|array|min:1',
            'candidate_skills.*.skill' => 'required|string|min:1',
            'candidate_skills.*.credential_count' => 'nullable|integer|min:0',
            'candidate_skills.*.experience_count' => 'nullable|integer|min:0',
        ]);

        try {
            $result = $jobMatchService->compute(
                $validated['job_skills'],
                $validated['candidate_skills']
            );

            return response()->json([
                'result' => $result,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 422);
        }
    }
}
