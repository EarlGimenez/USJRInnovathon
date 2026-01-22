<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class JobSkillExtractionService
{
    /**
     * @return string[]
     */
    public function extractSkills(array $job, int $maxSkills = 8): array
    {
        $title = (string) ($job['title'] ?? '');
        $company = (string) ($job['company'] ?? '');
        $description = (string) ($job['description'] ?? '');
        $tags = $job['tags'] ?? [];

        $cacheKey = 'job_skill_extract_' . md5(json_encode([
            't' => $title,
            'c' => $company,
            'd' => mb_substr($description, 0, 1200),
            'tags' => is_array($tags) ? array_slice($tags, 0, 20) : [],
            'max' => $maxSkills,
        ]));

        return Cache::remember($cacheKey, now()->addHours(12), function () use ($title, $company, $description, $tags, $maxSkills) {
            $apiKey = (string) config('services.openai.api_key');
            $model = (string) config('services.openai.model', 'gpt-5-mini');

            // If no key, fall back to tags.
            if ($apiKey === '' || $apiKey === 'your-api-key-here') {
                return $this->fallbackFromTags($tags, $maxSkills);
            }

            if (app()->environment('testing')) {
                return $this->fallbackFromTags($tags, $maxSkills);
            }

            $system = "You extract job skills from postings. Return ONLY valid JSON: an array of short skill strings (no prose).";
            $user = [
                'title' => $title,
                'company' => $company,
                'description' => mb_substr($description, 0, 2000),
                'tags' => is_array($tags) ? array_values($tags) : [],
                'instructions' => [
                    'max_skills' => $maxSkills,
                    'prefer_technical_and_domain_skills' => true,
                    'no_soft_skills_unless_explicit' => true,
                ],
            ];

            try {
                $resp = Http::withToken($apiKey)
                    ->timeout(30)
                    ->post('https://api.openai.com/v1/chat/completions', [
                        'model' => $model,
                        'temperature' => 0.2,
                        'messages' => [
                            ['role' => 'system', 'content' => $system],
                            ['role' => 'user', 'content' => json_encode($user, JSON_UNESCAPED_UNICODE)],
                        ],
                    ]);

                if (!$resp->successful()) {
                    Log::warning('OpenAI skill extraction failed', [
                        'status' => $resp->status(),
                        'body' => $resp->body(),
                    ]);
                    return $this->fallbackFromTags($tags, $maxSkills);
                }

                $content = (string) data_get($resp->json(), 'choices.0.message.content', '');
                $skills = $this->parseJsonArray($content);
                if (count($skills) === 0) {
                    return $this->fallbackFromTags($tags, $maxSkills);
                }

                $skills = array_slice($skills, 0, $maxSkills);
                return $skills;
            } catch (\Throwable $e) {
                Log::warning('OpenAI skill extraction exception', ['error' => $e->getMessage()]);
                return $this->fallbackFromTags($tags, $maxSkills);
            }
        });
    }

    /** @return string[] */
    private function fallbackFromTags($tags, int $maxSkills): array
    {
        if (!is_array($tags)) {
            return [];
        }

        $out = [];
        foreach ($tags as $t) {
            if (!is_string($t)) {
                continue;
            }
            $t = trim($t);
            if ($t === '') {
                continue;
            }
            $out[] = $t;
        }

        $out = array_values(array_unique($out));
        return array_slice($out, 0, $maxSkills);
    }

    /** @return string[] */
    private function parseJsonArray(string $content): array
    {
        $start = strpos($content, '[');
        $end = strrpos($content, ']');
        if ($start === false || $end === false || $end <= $start) {
            return [];
        }

        $json = substr($content, $start, $end - $start + 1);
        $decoded = json_decode($json, true);
        if (!is_array($decoded)) {
            return [];
        }

        $skills = [];
        foreach ($decoded as $s) {
            if (!is_string($s)) {
                continue;
            }
            $s = trim($s);
            if ($s === '') {
                continue;
            }
            $skills[] = $s;
        }

        return array_values(array_unique($skills));
    }
}
