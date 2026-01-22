<?php

namespace App\Services;

class JobCandidateRankingService
{
    public function __construct(
        private readonly JobMatchService $jobMatchService,
    ) {
    }

    /**
     * Rank multiple candidates for a single job using:
     * 1) score desc
     * 2) evidence_sum desc
     * 3) breadth desc
     *
     * Input candidates format:
     * [
     *   ['id' => 'user_1', 'candidate_skills' => [ ... ]],
     *   ...
     * ]
     */
    public function rank(array $jobSkills, array $candidates, float $similarityThreshold = 0.75): array
    {
        $results = [];

        foreach ($candidates as $candidate) {
            if (!is_array($candidate)) {
                continue;
            }

            $candidateId = $candidate['id'] ?? null;
            $candidateSkills = $candidate['candidate_skills'] ?? null;

            if (!is_string($candidateId) && !is_int($candidateId)) {
                continue;
            }

            if (!is_array($candidateSkills)) {
                $candidateSkills = [];
            }

            $match = $this->jobMatchService->compute($jobSkills, $candidateSkills, $similarityThreshold);

            $results[] = [
                'id' => $candidateId,
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
            return (string) $a['id'] <=> (string) $b['id'];
        });

        return $results;
    }
}
