<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserSkill;
use App\Services\ResumeParserService;
use App\Services\SkillAlignmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Resume Controller
 * 
 * Handles resume upload and OCR parsing via GPT Vision
 */
class ResumeController extends Controller
{
    protected ResumeParserService $resumeParser;

    protected SkillAlignmentService $skillAlignment;

    public function __construct(ResumeParserService $resumeParser, SkillAlignmentService $skillAlignment)
    {
        $this->resumeParser = $resumeParser;
        $this->skillAlignment = $skillAlignment;
    }

    /**
     * Parse an uploaded resume file
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function parse(Request $request): JsonResponse
    {
        // Increase execution time for AI processing
        set_time_limit(180);
        
        Log::info('Resume parse request received', [
            'hasFile' => $request->hasFile('resume'),
            'hasResumeData' => $request->has('resumeData'),
            'hasFileName' => $request->has('fileName'),
            'fileName' => $request->input('fileName'),
            'resumeDataLength' => strlen($request->input('resumeData', ''))
        ]);

        // Check if file upload or base64
        if ($request->hasFile('resume')) {
            // Handle file upload
            $file = $request->file('resume');
            $result = $this->resumeParser->parseResume($file);
        } elseif ($request->has('resumeData') && $request->has('fileName')) {
            // Handle base64 upload
            $result = $this->resumeParser->parseResumeFromBase64(
                $request->input('resumeData'),
                $request->input('fileName')
            );
        } else {
            return response()->json([
                'success' => false,
                'error' => 'No resume file provided. Please upload a PDF or image file.'
            ], 400);
        }

        Log::info('Resume parse result', ['success' => $result['success'], 'error' => $result['error'] ?? null]);

        if (!$result['success']) {
            return response()->json($result, 422);
        }

        // Post-process skills to align with global canonical `skills` table.
        $userId = $request->input('userId');
        $data = is_array($result['data'] ?? null) ? $result['data'] : [];
        $data = $this->normalizeParsedResumeData($data);

        // Optional: persist into user_skills for a specific candidate.
        if (is_string($userId) && trim($userId) !== '') {
            $this->persistUserSkills($userId, $data['skills'] ?? []);
        }

        $result['data'] = $data;

        return response()->json($result);
    }

    /**
     * Normalize parsed resume payload by aligning skill names to the canonical `skills` table.
     *
     * Output `skills` format:
     *   [ { name: string, rating: int, similarity?: float, raw_name?: string } ... ]
     */
    private function normalizeParsedResumeData(array $data): array
    {
        $skills = $data['skills'] ?? [];
        if (!is_array($skills) || count($skills) === 0) {
            $data['skills'] = [];
            return $data;
        }

        $rawNames = [];
        foreach ($skills as $s) {
            if (!is_array($s)) {
                continue;
            }
            $name = $s['name'] ?? null;
            if (is_string($name) && trim($name) !== '') {
                $rawNames[] = $name;
            }
        }
        $rawNames = array_values(array_unique($rawNames));

        $rawTo = $this->skillAlignment->mapRawSkillsToCanonical($rawNames);

        // Rebuild and de-dupe by canonical name; keep best rating.
        $best = [];
        foreach ($skills as $s) {
            if (!is_array($s)) {
                continue;
            }
            $raw = $s['name'] ?? null;
            if (!is_string($raw)) {
                continue;
            }
            $rawTrim = trim($raw);
            if ($rawTrim === '') {
                continue;
            }

            $rating = (int) ($s['rating'] ?? 50);
            if ($rating < 0) {
                $rating = 0;
            }
            if ($rating > 100) {
                $rating = 100;
            }

            $rawNorm = mb_strtolower((string) preg_replace('/\s+/', ' ', $rawTrim));
            $mapped = $rawTo[$rawNorm] ?? null;

            $canonical = $rawNorm;
            $similarity = null;
            if (is_array($mapped) && isset($mapped['name'])) {
                $canonical = (string) $mapped['name'];
                if (isset($mapped['similarity'])) {
                    $similarity = (float) $mapped['similarity'];
                }
            }

            if ($canonical === '') {
                continue;
            }

            if (!isset($best[$canonical]) || $rating > (int) ($best[$canonical]['rating'] ?? 0)) {
                $row = [
                    'name' => $canonical,
                    'rating' => $rating,
                    'raw_name' => $rawTrim,
                ];
                if ($similarity !== null) {
                    $row['similarity'] = round($similarity, 4);
                }
                $best[$canonical] = $row;
            }
        }

        $out = array_values($best);
        usort($out, fn ($a, $b) => (int) ($b['rating'] ?? 0) <=> (int) ($a['rating'] ?? 0));
        $data['skills'] = $out;

        return $data;
    }

    /**
     * Persist skills into user_skills for a user (upsert by user_id + lower(name)).
     *
     * @param array<int, array{name?:mixed, rating?:mixed}> $skills
     */
    private function persistUserSkills(string $userId, array $skills): void
    {
        foreach ($skills as $s) {
            if (!is_array($s)) {
                continue;
            }

            $name = $s['name'] ?? null;
            if (!is_string($name) || trim($name) === '') {
                continue;
            }
            $name = trim((string) preg_replace('/\s+/', ' ', $name));

            $rating = null;
            if (array_key_exists('rating', $s) && $s['rating'] !== null) {
                $rating = (int) $s['rating'];
                if ($rating < 0) {
                    $rating = 0;
                }
                if ($rating > 100) {
                    $rating = 100;
                }
            }

            $existing = UserSkill::query()
                ->where('user_id', $userId)
                ->whereRaw('lower(name) = ?', [mb_strtolower($name)])
                ->first();

            if ($existing) {
                if ($rating !== null) {
                    $existing->rating = max((int) ($existing->rating ?? 0), $rating);
                }
                $existing->name = $name;
                $existing->save();
                continue;
            }

            UserSkill::create([
                'user_id' => $userId,
                'name' => $name,
                'rating' => $rating,
            ]);
        }
    }
}
