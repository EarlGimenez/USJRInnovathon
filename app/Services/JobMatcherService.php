<?php

namespace App\Services;

use App\Services\CareerJetService;

class JobMatcherService
{
    public function __construct(
        private CareerJetService $careerJetService,
        private SkillNormalizerService $normalizer
    ) {}

    public function matchJobs(string $query, array $userSkills, int $limit = 10): array
    {
        // Get jobs from existing CareerJetService
        // Uses your existing caching/mock fallback logic
        $jobs = $this->careerJetService->searchJobs([
            'keywords' => $query,
            'location' => 'BGC, Taguig', // Default to your target market
            'affid' => config('services.careerjet.api_key'),
        ]);

        $matchedJobs = [];
        $totalScore = 0;
        $goodMatchCount = 0;

        foreach ($jobs as $job) {
            $jobSkills = $this->extractSkillsFromJob($job);
            $overlap = $this->normalizer->calculateOverlap($userSkills, $jobSkills);

            $matchedJobs[] = [
                'id' => $job['id'] ?? $job['url'] ?? uniqid('job_'),
                'title' => $job['title'] ?? 'Unknown Title',
                'company' => $job['company'] ?? 'Unknown Company',
                'location' => $job['location'] ?? 'Taguig/BGC',
                'description' => $job['description'] ?? '',
                'url' => $job['url'] ?? null,
                'match_score' => $overlap['score'],
                'matched_skills' => $overlap['matched'],
                'missing_skills' => $overlap['missing'],
            ];

            $totalScore += $overlap['score'];
            if ($overlap['score'] >= 60) {
                $goodMatchCount++;
            }
        }

        // Sort by match score descending
        usort($matchedJobs, fn($a, $b) => $b['match_score'] <=> $a['match_score']);

        $matchedJobs = array_slice($matchedJobs, 0, $limit);

        $averageScore = count($matchedJobs) > 0
            ? $totalScore / count($matchedJobs)
            : 0;

        return [
            'jobs' => $matchedJobs,
            'has_good_matches' => $goodMatchCount > 0,
            'average_match_score' => round($averageScore, 2),
        ];
    }

    public function getRequiredSkillsForRole(string $roleTitle): array
    {
        // Get sample jobs for this role and extract common skills
        $jobs = $this->careerJetService->searchJobs([
            'keywords' => $roleTitle,
            'location' => 'BGC, Taguig',
            'affid' => config('services.careerjet.api_key'),
        ]);

        $allSkills = [];

        foreach (array_slice($jobs, 0, 5) as $job) {
            $jobSkills = $this->extractSkillsFromJob($job);
            $allSkills = array_merge($allSkills, $jobSkills);
        }

        // Return most common skills
        $skillCounts = array_count_values($allSkills);
        arsort($skillCounts);

        return array_keys(array_slice($skillCounts, 0, 10));
    }

    private function extractSkillsFromJob(array $job): array
    {
        // Simple keyword extraction from title and description
        // You can make this more sophisticated
        $text = strtolower(
            ($job['title'] ?? '') . ' ' .
            ($job['description'] ?? '')
        );

        // Common tech skills to look for
        $skillKeywords = [
            'php', 'laravel', 'react', 'javascript', 'typescript', 'node',
            'python', 'java', 'sql', 'mysql', 'postgresql', 'mongodb',
            'docker', 'kubernetes', 'aws', 'azure', 'git', 'api',
            'html', 'css', 'tailwind', 'bootstrap', 'vue', 'angular',
            'rest', 'graphql', 'redis', 'nginx', 'linux', 'devops',
            'agile', 'scrum', 'communication', 'teamwork', 'leadership',
        ];

        $foundSkills = [];

        foreach ($skillKeywords as $skill) {
            if (str_contains($text, $skill)) {
                $foundSkills[] = $skill;
            }
        }

        return array_unique($foundSkills);
    }
}
