<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ResumeParserService;
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

    public function __construct(ResumeParserService $resumeParser)
    {
        $this->resumeParser = $resumeParser;
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

        return response()->json($result);
    }
}
