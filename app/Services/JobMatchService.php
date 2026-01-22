<?php

namespace App\Services;

use InvalidArgumentException;

class JobMatchService
{
    /**
     * Compute matching metrics between a job's required skills and a candidate profile.
     *
     * Expected inputs:
     * - $jobSkills: array of strings (required skills)
     * - $candidateSkills: array of arrays with keys:
     *     - skill (string)
     *     - credential_count (int>=0)
     *     - experience_count (int>=0)
     *
     * Returns:
     * - rejected (bool)
     * - missing_skills (string[])
     * - matched_skills (string[])                 // validated match (SCvalid ∩ SJ)
     * - score_raw (int)
     * - score (float)                             // 0..100
     * - coverage (float)                          // 0..1
     * - coverage_label (string)
     * - evidence_sum (int)
     * - breadth (int)                             // |SCvalid|
     */
    public function compute(array $jobSkills, array $candidateSkills): array
    {
        $jobSkillSet = $this->normalizeSkillListToSet($jobSkills);
        $SJ = array_keys($jobSkillSet);

        if (count($SJ) === 0) {
            throw new InvalidArgumentException('Invalid input: job skills (SJ) must not be empty.');
        }

        $candidateSkillMap = $this->normalizeCandidateSkillsToMap($candidateSkills);

        $SC = array_keys($candidateSkillMap);
        $missingSkills = array_values(array_diff($SJ, $SC));

        // Early reject if no overlap at all (|SJ \ SC| == |SJ|)
        if (count($missingSkills) === count($SJ)) {
            return [
                'rejected' => true,
                'rejection_reason' => 'no_overlap',
                'missing_skills' => $missingSkills,
                'matched_skills' => [],
                'score_raw' => 0,
                'score' => 0.0,
                'coverage' => 0.0,
                'coverage_label' => 'No validated skills',
                'evidence_sum' => 0,
                'breadth' => 0,
            ];
        }

        // SCvalid = { s ∈ SC | evidence(s) ≥ 1 }
        $SCvalid = [];
        foreach ($candidateSkillMap as $skill => $counts) {
            $evidence = $this->evidence($counts['credential_count'], $counts['experience_count']);
            if ($evidence >= 1) {
                $SCvalid[$skill] = [
                    'credential_count' => $counts['credential_count'],
                    'experience_count' => $counts['experience_count'],
                    'evidence' => $evidence,
                ];
            }
        }

        $breadth = count($SCvalid);

        // Intersection: SCvalid ∩ SJ
        $matchedSkills = array_values(array_intersect($SJ, array_keys($SCvalid)));

        $scoreRaw = count($matchedSkills);
        $coverage = $scoreRaw / count($SJ);
        $score = $coverage * 100;

        $evidenceSum = 0;
        foreach ($matchedSkills as $skill) {
            $evidenceSum += $SCvalid[$skill]['evidence'];
        }

        return [
            'rejected' => false,
            'missing_skills' => $missingSkills,
            'matched_skills' => $matchedSkills,
            'score_raw' => $scoreRaw,
            'score' => round($score, 2),
            'coverage' => round($coverage, 4),
            'coverage_label' => $this->coverageLabel($coverage),
            'evidence_sum' => $evidenceSum,
            'breadth' => $breadth,
        ];
    }

    private function normalizeSkill(string $skill): string
    {
        $skill = trim($skill);
        $skill = mb_strtolower($skill);
        $skill = preg_replace('/\s+/', ' ', $skill);

        return $skill;
    }

    /** @return array<string, true> */
    private function normalizeSkillListToSet(array $skills): array
    {
        $set = [];
        foreach ($skills as $skill) {
            if (!is_string($skill)) {
                continue;
            }

            $normalized = $this->normalizeSkill($skill);
            if ($normalized === '') {
                continue;
            }

            $set[$normalized] = true;
        }

        return $set;
    }

    /**
     * @param array<int, mixed> $candidateSkills
     * @return array<string, array{credential_count:int, experience_count:int}>
     */
    private function normalizeCandidateSkillsToMap(array $candidateSkills): array
    {
        $map = [];

        foreach ($candidateSkills as $entry) {
            if (!is_array($entry)) {
                continue;
            }

            $rawSkill = $entry['skill'] ?? null;
            if (!is_string($rawSkill)) {
                continue;
            }

            $skill = $this->normalizeSkill($rawSkill);
            if ($skill === '') {
                continue;
            }

            $credentialCount = (int) ($entry['credential_count'] ?? 0);
            $experienceCount = (int) ($entry['experience_count'] ?? 0);

            if ($credentialCount < 0) {
                $credentialCount = 0;
            }
            if ($experienceCount < 0) {
                $experienceCount = 0;
            }

            if (!isset($map[$skill])) {
                $map[$skill] = [
                    'credential_count' => $credentialCount,
                    'experience_count' => $experienceCount,
                ];
                continue;
            }

            // If duplicates appear, keep the strongest evidence by taking max per count.
            $map[$skill]['credential_count'] = max($map[$skill]['credential_count'], $credentialCount);
            $map[$skill]['experience_count'] = max($map[$skill]['experience_count'], $experienceCount);
        }

        return $map;
    }

    private function evidence(int $credentialCount, int $experienceCount): int
    {
        $hasCredential = $credentialCount > 0;
        $hasExperience = $experienceCount > 0;

        if ($hasCredential && $hasExperience) {
            return 2;
        }

        if ($hasCredential || $hasExperience) {
            return 1;
        }

        return 0;
    }

    private function coverageLabel(float $coverage): string
    {
        if ($coverage <= 0.0) {
            return 'No validated skills';
        }

        if ($coverage > 0.0 && $coverage < 0.5) {
            return 'Some skills, but large gaps';
        }

        if ($coverage >= 0.5 && $coverage < 1.0) {
            return 'Most skills covered';
        }

        return 'Fully covered';
    }
}
