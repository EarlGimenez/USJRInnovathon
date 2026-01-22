<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class TrainingRecommenderService
{
    public function __construct(
        private SkillNormalizerService $normalizer
    ) {}

    public function recommendForSkills(array $skills, int $limit = 5): array
    {
        // Get seminars from existing database (adapt to your seminars table)
        // Assumes you have a 'seminars' table
        $seminars = DB::table('seminars')
            ->where('status', 'active') // Assuming active seminars
            ->orWhereNull('status')
            ->get();

        $recommendations = [];

        foreach ($seminars as $seminar) {
            $seminarSkills = $this->extractSeminarSkills($seminar);
            $relevanceScore = $this->calculateRelevance($skills, $seminarSkills);

            if ($relevanceScore > 0) {
                $recommendations[] = [
                    'id' => $seminar->id,
                    'title' => $seminar->title ?? $seminar->name ?? 'Training',
                    'description' => $seminar->description ?? '',
                    'date' => $seminar->date ?? $seminar->scheduled_at ?? null,
                    'location' => $seminar->location ?? 'TBD',
                    'target_skills' => $seminarSkills,
                    'relevance_score' => $relevanceScore,
                ];
            }
        }

        // Sort by relevance
        usort($recommendations, fn($a, $b) => $b['relevance_score'] <=> $a['relevance_score']);

        return array_slice($recommendations, 0, $limit);
    }

    private function extractSeminarSkills($seminar): array
    {
        $skills = [];

        // Option 1: If seminars have a skills JSON column
        if (isset($seminar->skills)) {
            $seminarSkills = is_string($seminar->skills)
                ? json_decode($seminar->skills, true)
                : $seminar->skills;

            if (is_array($seminarSkills)) {
                $skills = array_merge($skills, $seminarSkills);
            }
        }

        // Option 2: If seminars have tags or categories
        if (isset($seminar->tags)) {
            $tags = is_string($seminar->tags)
                ? json_decode($seminar->tags, true)
                : $seminar->tags;

            if (is_array($tags)) {
                $skills = array_merge($skills, $tags);
            }
        }

        // Option 3: Extract from title/description
        if (empty($skills)) {
            $skills = $this->extractSkillsFromText(
                ($seminar->title ?? '') . ' ' . ($seminar->description ?? '')
            );
        }

        return $this->normalizer->normalizeSkills($skills);
    }

    private function extractSkillsFromText(string $text): array
    {
        $text = strtolower($text);

        $skillKeywords = [
            'php', 'laravel', 'react', 'javascript', 'typescript', 'node',
            'python', 'java', 'sql', 'mysql', 'postgresql', 'mongodb',
            'docker', 'kubernetes', 'aws', 'azure', 'git', 'api',
            'html', 'css', 'tailwind', 'bootstrap', 'vue', 'angular',
            'communication', 'leadership', 'project management', 'agile',
        ];

        $foundSkills = [];

        foreach ($skillKeywords as $skill) {
            if (str_contains($text, $skill)) {
                $foundSkills[] = $skill;
            }
        }

        return $foundSkills;
    }

    private function calculateRelevance(array $targetSkills, array $seminarSkills): float
    {
        if (empty($seminarSkills)) {
            return 0;
        }

        $normalized = $this->normalizer->normalizeSkills($targetSkills);
        $overlap = array_intersect($normalized, $seminarSkills);

        return count($overlap) > 0
            ? (count($overlap) / count($seminarSkills)) * 100
            : 0;
    }
}
