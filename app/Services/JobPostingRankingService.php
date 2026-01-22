<?php

namespace App\Services;

use InvalidArgumentException;

class JobPostingRankingService
{
    public function __construct(
        private readonly JobMatchService $jobMatchService,
    ) {
    }

    /**
     * Rank multiple job postings for a single candidate using:
     * 1) score desc
     * 2) evidence_sum desc
     * 3) breadth desc
     *
     * Input jobs format (flexible):
     * [
     *   ['id' => 1, 'job_skills' => ['php','laravel']],
     *   ['id' => 2, 'requiredSkills' => ['Design' => 80, 'Tools' => 60]],
     *   ...
     * ]
     */
    public function rank(array $candidateSkills, array $jobs, float $similarityThreshold = 0.75): array
    {
        $results = [];

        foreach ($jobs as $job) {
            if (!is_array($job)) {
                continue;
            }

            $jobId = $job['id'] ?? null;
            $jobSkills = $this->extractJobSkills($job);

            try {
                $match = $this->jobMatchService->compute($jobSkills, $candidateSkills, $similarityThreshold);
            } catch (InvalidArgumentException) {
                // Invalid job input (e.g. empty skills) - keep it, but force it to the bottom.
                $match = [
                    'rejected' => true,
                    'rejection_reason' => 'invalid_job_skills',
                    'missing_skills' => [],
                    'matched_skills' => [],
                    'matched_pairs' => [],
                    'score_raw' => 0,
                    'score' => 0.0,
                    'coverage' => 0.0,
                    'coverage_label' => 'Invalid job skills',
                    'evidence_sum' => 0,
                    'breadth' => 0,
                ];
            }

            $results[] = [
                'id' => $jobId,
                'job' => $job,
                'result' => $match,
            ];
        }

        usort($results, function (array $a, array $b) {
            $ra = $a['result'] ?? [];
            $rb = $b['result'] ?? [];

            $sa = (float) ($ra['score'] ?? 0);
            $sb = (float) ($rb['score'] ?? 0);
            if ($sa !== $sb) {
                return $sb <=> $sa;
            }

            $ea = (int) ($ra['evidence_sum'] ?? 0);
            $eb = (int) ($rb['evidence_sum'] ?? 0);
            if ($ea !== $eb) {
                return $eb <=> $ea;
            }

            $ba = (int) ($ra['breadth'] ?? 0);
            $bb = (int) ($rb['breadth'] ?? 0);
            if ($ba !== $bb) {
                return $bb <=> $ba;
            }

            // Stable fallback: id asc
            return (string) ($a['id'] ?? '') <=> (string) ($b['id'] ?? '');
        });

        return $results;
    }

    /** @return string[] */
    private function extractJobSkills(array $job): array
    {
        // Preferred explicit list
        $jobSkills = $job['job_skills'] ?? $job['required_skills'] ?? null;
        if (is_array($jobSkills)) {
            return array_values(array_filter($jobSkills, fn ($s) => is_string($s) && trim($s) !== ''));
        }

        // Mock job format: requiredSkills is a map { skillName => weight }
        $requiredSkills = $job['requiredSkills'] ?? null;
        if (is_array($requiredSkills)) {
            return array_values(array_filter(array_keys($requiredSkills), fn ($s) => is_string($s) && trim($s) !== ''));
        }

        return [];
    }
}
