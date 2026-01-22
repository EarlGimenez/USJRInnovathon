<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PromptOrchestrator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PromptController extends Controller
{
    public function __construct(
        private PromptOrchestrator $orchestrator
    ) {}

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

        try {
            $result = $this->orchestrator->process(
                $request->input('user_id'),
                $request->input('prompt')
            );

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Processing failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
