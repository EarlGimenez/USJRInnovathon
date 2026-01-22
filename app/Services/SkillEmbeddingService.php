<?php

namespace App\Services;

use App\Models\Skill;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

class SkillEmbeddingService
{
    public function getEmbeddingVector(string $skillName): ?array
    {
        $normalized = $this->normalize($skillName);
        if ($normalized === '') {
            return null;
        }

        // In tests, DB is sqlite :memory: and migrations may not run.
        // If table doesn't exist, just skip semantic matching.
        try {
            if (!Schema::hasTable('skills')) {
                return null;
            }
        } catch (\Throwable) {
            return null;
        }

        $cacheKey = 'skill_embedding_vec_' . md5($normalized);

        return Cache::remember($cacheKey, now()->addHours(6), function () use ($normalized) {
            $blob = Skill::query()
                ->whereRaw('lower(name) = ?', [$normalized])
                ->value('embedding');

            if (!is_string($blob) || $blob === '') {
                return null;
            }

            $vec = $this->decodeFloat32LittleEndian($blob);
            return $vec ?: null;
        });
    }

    /**
     * @return float[]
     */
    private function decodeFloat32LittleEndian(string $blob): array
    {
        // Each float32 is 4 bytes
        if ((strlen($blob) % 4) !== 0) {
            return [];
        }

        // 'g' = float 32 little-endian
        $unpacked = @unpack('g*', $blob);
        if (!is_array($unpacked)) {
            return [];
        }

        return array_values($unpacked);
    }

    private function normalize(string $skill): string
    {
        $skill = trim($skill);
        $skill = mb_strtolower($skill);
        $skill = preg_replace('/\s+/', ' ', $skill);

        return $skill;
    }
}
