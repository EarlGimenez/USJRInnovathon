<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SkillAlignmentService
{
    public function __construct(
        private readonly SkillEmbeddingService $skillEmbeddingService,
        private readonly PythonTextEmbeddingService $pythonTextEmbeddingService,
    ) {
    }

    /**
     * Align raw skill strings to canonical skill names in the `skills` table.
     *
     * @param string[] $rawSkills
     * @return array<string, float> map canonical_skill => similarity
     */
    public function alignToCanonicalSkills(array $rawSkills, int $max = 5): array
    {
        $rawSkills = array_values(array_filter($rawSkills, fn ($s) => is_string($s) && trim($s) !== ''));
        if (count($rawSkills) === 0) {
            return [];
        }

        $rawTo = $this->mapRawSkillsToCanonical($rawSkills);
        if (count($rawTo) === 0) {
            return [];
        }

        $best = [];
        foreach ($rawTo as $m) {
            $name = $m['name'];
            $sim = $m['similarity'];
            if (!isset($best[$name]) || $sim > $best[$name]) {
                $best[$name] = $sim;
            }
        }

        arsort($best);
        return array_slice($best, 0, $max, true);
    }

    /**
     * @param string[] $rawSkills
     * @return array<string, array{name:string, similarity:float}> map raw_normalized => best match
     */
    public function mapRawSkillsToCanonical(array $rawSkills): array
    {
        $rawSkills = array_values(array_filter($rawSkills, fn ($s) => is_string($s) && trim($s) !== ''));
        if (count($rawSkills) === 0) {
            return [];
        }

        $norms = [];
        foreach ($rawSkills as $s) {
            $n = $this->normalize($s);
            if ($n !== '') {
                $norms[] = $n;
            }
        }
        $norms = array_values(array_unique($norms));
        if (count($norms) === 0) {
            return [];
        }

        $vectors = $this->pythonTextEmbeddingService->embedTexts($norms);
        if ($vectors === null) {
            // In testing or failure, fall back to normalized exact matches only.
            $out = [];
            foreach ($norms as $n) {
                $out[$n] = ['name' => $n, 'similarity' => 1.0];
            }
            return $out;
        }

        $canon = $this->loadCanonicalSkillVectors();
        if (count($canon) === 0) {
            return [];
        }

        $out = [];
        foreach ($vectors as $i => $vec) {
            if (!is_array($vec)) {
                continue;
            }

            $rawNorm = $norms[$i] ?? null;
            if (!is_string($rawNorm) || $rawNorm === '') {
                continue;
            }

            $match = $this->bestMatch($vec, $canon);
            if ($match === null) {
                continue;
            }

            $out[$rawNorm] = [
                'name' => (string) $match['name'],
                'similarity' => (float) $match['similarity'],
            ];
        }

        return $out;
    }

    /**
     * Canonicalize candidate skills (in-place) by replacing skill name with best matched canonical skill.
     *
     * @param array<int, array<string, mixed>> $candidateSkills
     * @return array<int, array<string, mixed>>
     */
    public function canonicalizeCandidateSkills(array $candidateSkills): array
    {
        $rawNames = [];
        foreach ($candidateSkills as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            if (isset($entry['skill']) && is_string($entry['skill']) && trim($entry['skill']) !== '') {
                $rawNames[] = $entry['skill'];
            }
        }

        $rawNames = array_values(array_unique($rawNames));
        if (count($rawNames) === 0) {
            return $candidateSkills;
        }

        $rawTo = $this->mapRawSkillsToCanonical($rawNames);

        $minSimilarity = 0.55;

        foreach ($candidateSkills as &$entry) {
            if (!is_array($entry)) {
                continue;
            }
            $raw = $entry['skill'] ?? null;
            if (!is_string($raw)) {
                continue;
            }
            $norm = $this->normalize($raw);
            if ($norm === '') {
                continue;
            }

            // If exact skill exists in embedding table, keep.
            if ($this->skillEmbeddingService->getEmbeddingVector($norm) !== null) {
                $entry['skill'] = $norm;
                continue;
            }

            $mapped = $rawTo[$norm] ?? null;
            if (is_array($mapped) && isset($mapped['name'], $mapped['similarity'])) {
                $sim = (float) $mapped['similarity'];
                if ($sim >= $minSimilarity) {
                    $entry['skill'] = (string) $mapped['name'];
                    continue;
                }
            }

            // Otherwise keep normalized raw.
            $entry['skill'] = $norm;
        }
        unset($entry);

        return $candidateSkills;
    }

    /**
     * @return array<int, array{name:string, vec:float[], norm:float}>
     */
    private function loadCanonicalSkillVectors(): array
    {
        return Cache::remember('canonical_skill_vectors_v1', now()->addHours(6), function () {
            try {
                $rows = DB::table('skills')
                    ->select(['name', 'embedding'])
                    ->whereNotNull('embedding')
                    ->get();
            } catch (\Throwable) {
                return [];
            }

            $out = [];
            foreach ($rows as $row) {
                $name = is_string($row->name ?? null) ? $this->normalize($row->name) : '';
                $blob = $row->embedding ?? null;
                if ($name === '' || !is_string($blob) || $blob === '') {
                    continue;
                }

                $vec = $this->decodeFloat32LittleEndian($blob);
                if (count($vec) === 0) {
                    continue;
                }

                $norm = $this->norm($vec);
                if ($norm <= 0.0) {
                    continue;
                }

                $out[] = [
                    'name' => $name,
                    'vec' => $vec,
                    'norm' => $norm,
                ];
            }

            return $out;
        });
    }

    /** @param float[] $vec */
    private function norm(array $vec): float
    {
        $sum = 0.0;
        foreach ($vec as $v) {
            $fv = (float) $v;
            $sum += $fv * $fv;
        }
        return sqrt($sum);
    }

    /**
     * @param float[] $vec
     * @param array<int, array{name:string, vec:float[], norm:float}> $canon
     */
    private function bestMatch(array $vec, array $canon): ?array
    {
        $normA = $this->norm($vec);
        if ($normA <= 0.0) {
            return null;
        }

        $best = null;
        $bestSim = -1.0;

        foreach ($canon as $c) {
            $sim = $this->cosine($vec, $normA, $c['vec'], (float) $c['norm']);
            if ($sim > $bestSim) {
                $bestSim = $sim;
                $best = $c['name'];
            }
        }

        if ($best === null) {
            return null;
        }

        return [
            'name' => $best,
            'similarity' => $bestSim,
        ];
    }

    /** @param float[] $a @param float[] $b */
    private function cosine(array $a, float $normA, array $b, float $normB): float
    {
        $n = min(count($a), count($b));
        if ($n === 0 || $normA <= 0.0 || $normB <= 0.0) {
            return 0.0;
        }

        $dot = 0.0;
        for ($i = 0; $i < $n; $i++) {
            $dot += ((float) $a[$i]) * ((float) $b[$i]);
        }

        return $dot / ($normA * $normB);
    }

    /**
     * @return float[]
     */
    private function decodeFloat32LittleEndian(string $blob): array
    {
        if ((strlen($blob) % 4) !== 0) {
            return [];
        }

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
