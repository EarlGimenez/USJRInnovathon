<?php

namespace App\Services;

class SkillNormalizerService
{
    public function normalizeSkill(string $skill): string
    {
        return strtolower(trim($skill));
    }

    public function normalizeSkills(array $skills): array
    {
        $normalized = [];

        foreach ($skills as $skill) {
            if (is_string($skill)) {
                $normalized[] = $this->normalizeSkill($skill);
            } elseif (is_array($skill) && isset($skill['name'])) {
                // Handle objects like {"name": "PHP", "proficiency": 80}
                $normalized[] = $this->normalizeSkill($skill['name']);
            }
        }

        return array_unique($normalized);
    }

    public function calculateOverlap(array $userSkills, array $requiredSkills): array
    {
        $normalizedUser = $this->normalizeSkills($userSkills);
        $normalizedRequired = $this->normalizeSkills($requiredSkills);

        $matched = array_intersect($normalizedUser, $normalizedRequired);
        $missing = array_diff($normalizedRequired, $normalizedUser);

        $total = count($normalizedRequired);
        $score = $total > 0 ? (count($matched) / $total) * 100 : 0;

        return [
            'matched' => array_values($matched),
            'missing' => array_values($missing),
            'score' => round($score, 2),
        ];
    }
}
