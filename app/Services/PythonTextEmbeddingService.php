<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;

class PythonTextEmbeddingService
{
    /**
     * @param string[] $texts
     * @return array<int, float[]>|null
     */
    public function embedTexts(array $texts): ?array
    {
        $texts = array_values(array_filter($texts, fn ($t) => is_string($t) && trim($t) !== ''));
        if (count($texts) === 0) {
            return [];
        }

        // Avoid external calls in test environment.
        if (app()->environment('testing')) {
            return null;
        }

        $payload = json_encode($texts, JSON_UNESCAPED_UNICODE);
        if (!is_string($payload)) {
            return null;
        }

        $command = 'uv run python_scripts/embed_texts.py';

        $result = Process::timeout(120)
            ->path(base_path())
            ->input($payload)
            ->run($command);

        if (!$result->successful()) {
            Log::warning('Python embedding failed', [
                'exitCode' => $result->exitCode(),
                'output' => $result->output(),
                'error' => $result->errorOutput(),
            ]);
            return null;
        }

        $out = trim($result->output());
        $decoded = json_decode($out, true);

        if (!is_array($decoded)) {
            Log::warning('Python embedding returned non-JSON', ['output' => $out]);
            return null;
        }

        // If script returned an error object
        if (isset($decoded['error'])) {
            Log::warning('Python embedding returned error', $decoded);
            return null;
        }

        return $decoded;
    }
}
