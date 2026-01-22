<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AgenticPromptController extends Controller
{
    /**
     * Process user prompt using simple intent detection
     * 
     * Returns a simple response - frontend handles AI processing with LangChain
     */
    public function handle(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|integer',
            'prompt' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors()
            ], 422);
        }

        // Simple backend logging and intent detection
        $prompt = $request->input('prompt');
        $intent = $this->determineIntent($prompt);

        // Return success - frontend will handle actual AI processing
        return response()->json([
            'success' => true,
            'message' => 'Prompt received and logged',
            'intent' => $intent,
            'prompt' => $prompt,
        ], 200);
    }

    /**
     * Simple intent detection without external service
     */
    private function determineIntent(string $prompt): string
    {
        $promptLower = strtolower($prompt);
        
        $jobKeywords = ['job', 'work', 'position', 'career', 'employment', 'hiring'];
        $trainingKeywords = ['training', 'course', 'seminar', 'workshop', 'learn', 'skill'];
        
        foreach ($trainingKeywords as $keyword) {
            if (str_contains($promptLower, $keyword)) {
                return 'TRAINING_SEARCH';
            }
        }
        
        return 'JOB_SEARCH';
    }

    /**
     * Health check for the agentic endpoint.
     */
    public function health()
    {
        return response()->json([
            'status' => 'ok',
            'mode' => 'frontend-ai',
        ], 200);
    }
}
