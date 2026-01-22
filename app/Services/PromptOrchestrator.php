<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class PromptOrchestrator
{
    public function __construct(
        private SkillNormalizerService $normalizer,
        private JobMatcherService $jobMatcher,
        private TrainingRecommenderService $trainingRecommender
    ) {}

    public function process(int $userId, string $prompt): array
    {
        // Detect intent
        $intent = $this->detectIntent($prompt);

        // Parse query (job title or skill)
        $query = $this->parseQuery($prompt, $intent);

        // Get user skills (adapt to your existing User model)
        $userSkills = $this->getUserSkills($userId);

        // Route to appropriate service
        if ($intent === 'JOB_SEARCH') {
            return $this->handleJobSearch($userId, $query, $userSkills);
        } else {
            return $this->handleSkillImprovement($userId, $query, $userSkills);
        }
    }

    private function detectIntent(string $prompt): string
    {
        $lower = strtolower($prompt);

        // Job search patterns
        $jobPatterns = [
            '/\b(want to work|looking for|apply|job|position|role)\b/',
            '/\b(work as|become a|find work)\b/',
        ];

        // Skill improvement patterns
        $skillPatterns = [
            '/\b(want to improve|learn|upskill|training|course)\b/',
            '/\b(get better at|study|develop skills)\b/',
        ];

        foreach ($jobPatterns as $pattern) {
            if (preg_match($pattern, $lower)) {
                return 'JOB_SEARCH';
            }
        }

        foreach ($skillPatterns as $pattern) {
            if (preg_match($pattern, $lower)) {
                return 'SKILL_IMPROVEMENT';
            }
        }

        // Default to job search
        return 'JOB_SEARCH';
    }

    private function parseQuery(string $prompt, string $intent): string
    {
        $lower = strtolower($prompt);

        if ($intent === 'JOB_SEARCH') {
            // Extract job title after "as", "for", etc.
            if (preg_match('/\b(?:as|for)\s+(?:a\s+)?(.+?)(?:\.|$)/i', $prompt, $matches)) {
                return trim($matches[1]);
            }
        } else {
            // Extract skill after "improve", "learn", etc.
            if (preg_match('/\b(?:improve|learn|study)\s+(?:my\s+)?(.+?)(?:\.|$)/i', $prompt, $matches)) {
                return trim($matches[1]);
            }
        }

        // Fallback: return everything after common trigger words
        $cleaned = preg_replace('/^.+?\b(?:as|for|improve|learn)\s+/i', '', $prompt);
        return trim(rtrim($cleaned, '.!?'));
    }

    private function getUserSkills(int $userId): array
    {
        // Adapt this to your existing User model structure
        // Assumes User has 'skills' JSON column and credentials relationship

        $user = DB::table('users')->find($userId);

        if (!$user) {
            return [];
        }

        $skills = [];

        // Get skills from user's skills JSON field
        if (isset($user->skills)) {
            $userSkills = is_string($user->skills)
                ? json_decode($user->skills, true)
                : $user->skills;

            if (is_array($userSkills)) {
                $skills = array_merge($skills, $userSkills);
            }
        }

        // Get skills from credentials (if you have credentials table)
        // Uncomment and adapt if needed:
        /*
        $credentials = DB::table('credentials')
            ->where('user_id', $userId)
            ->get();

        foreach ($credentials as $credential) {
            if (isset($credential->skills)) {
                $credSkills = is_string($credential->skills)
                    ? json_decode($credential->skills, true)
                    : $credential->skills;

                if (is_array($credSkills)) {
                    $skills = array_merge($skills, $credSkills);
                }
            }
        }
        */

        return $this->normalizer->normalizeSkills($skills);
    }

    private function handleJobSearch(int $userId, string $query, array $userSkills): array
    {
        // Get job matches
        $jobResults = $this->jobMatcher->matchJobs($query, $userSkills);

        $jobs = $jobResults['jobs'];
        $hasGoodMatches = $jobResults['has_good_matches'];
        $averageMatchScore = $jobResults['average_match_score'];

        // Determine if we need trainings
        $trainings = [];
        $showPopup = false;
        $popupTitle = '';
        $popupBody = '';
        $nextSteps = [];

        if (!$hasGoodMatches || $averageMatchScore < 60) {
            // Get skill gaps from top jobs
            $missingSkills = $this->collectMissingSkills($jobs);

            // Get relevant trainings
            $trainings = $this->trainingRecommender->recommendForSkills($missingSkills);

            $showPopup = true;
            $popupTitle = 'Skill Gap Detected';
            $popupBody = sprintf(
                'You match %d%% of requirements on average. We found %d trainings to help you upskill for "%s" roles.',
                round($averageMatchScore),
                count($trainings),
                $query
            );

            $nextSteps = $this->generateNextSteps($trainings, $missingSkills);
        }

        return [
            'intent' => 'JOB_SEARCH',
            'query' => $query,
            'user_skills' => $userSkills,
            'jobs' => $jobs,
            'trainings' => $trainings,
            'ui' => [
                'show_skill_gap_popup' => $showPopup,
                'popup_title' => $popupTitle,
                'popup_body' => $popupBody,
                'suggested_next_steps' => $nextSteps,
            ],
        ];
    }

    private function handleSkillImprovement(int $userId, string $query, array $userSkills): array
    {
        // Check if query is a job title or a skill
        $isJobTitle = $this->looksLikeJobTitle($query);

        if ($isJobTitle) {
            // Infer required skills from job postings
            $requiredSkills = $this->jobMatcher->getRequiredSkillsForRole($query);
            $missingSkills = array_diff($requiredSkills, $userSkills);
        } else {
            // Treat as skill name
            $normalizedQuery = $this->normalizer->normalizeSkill($query);
            $missingSkills = [$normalizedQuery];
        }

        // Get trainings
        $trainings = $this->trainingRecommender->recommendForSkills($missingSkills);

        return [
            'intent' => 'SKILL_IMPROVEMENT',
            'query' => $query,
            'user_skills' => $userSkills,
            'jobs' => [], // No jobs for skill improvement intent
            'trainings' => $trainings,
            'ui' => [
                'show_skill_gap_popup' => true,
                'popup_title' => 'Upskilling Recommendations',
                'popup_body' => sprintf(
                    'We found %d training programs to help you improve in "%s".',
                    count($trainings),
                    $query
                ),
                'suggested_next_steps' => $this->generateNextSteps($trainings, $missingSkills),
            ],
        ];
    }

    private function looksLikeJobTitle(string $query): bool
    {
        $jobTitleKeywords = [
            'developer', 'engineer', 'manager', 'analyst', 'designer',
            'architect', 'specialist', 'consultant', 'administrator',
            'coordinator', 'assistant', 'lead', 'senior', 'junior'
        ];

        $lower = strtolower($query);
        foreach ($jobTitleKeywords as $keyword) {
            if (str_contains($lower, $keyword)) {
                return true;
            }
        }

        return false;
    }

    private function collectMissingSkills(array $jobs): array
    {
        $allMissingSkills = [];

        foreach ($jobs as $job) {
            if (isset($job['missing_skills'])) {
                $allMissingSkills = array_merge($allMissingSkills, $job['missing_skills']);
            }
        }

        // Get unique and most common missing skills
        $skillCounts = array_count_values($allMissingSkills);
        arsort($skillCounts);

        return array_keys(array_slice($skillCounts, 0, 5)); // Top 5 missing skills
    }

    private function generateNextSteps(array $trainings, array $missingSkills): array
    {
        $steps = [];

        if (count($trainings) > 0) {
            $steps[] = sprintf(
                "Complete '%s' to fill critical gaps",
                $trainings[0]['title']
            );
        }

        if (count($missingSkills) > 0) {
            $steps[] = sprintf(
                "Consider learning %s for better opportunities",
                implode(', ', array_slice($missingSkills, 0, 3))
            );
        }

        if (empty($steps)) {
            $steps[] = "Keep practicing your current skills";
        }

        return $steps;
    }
}
