<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use Exception;

/**
 * Resume Parser Service
 * 
 * Handles resume file uploads and invokes Python script with GPT Vision
 * to extract profile data (name, skills, credentials, competency ratings)
 */
class ResumeParserService
{
    protected string $pythonScript;
    protected string $tempPath;
    protected string $pythonPath;

    public function __construct()
    {
        $this->pythonScript = base_path('python_scripts/resume_parser.py');
        $this->tempPath = storage_path('app/temp');
        
        // Get Python path from env or use default - remove surrounding quotes if present
        $pythonPath = env('PYTHON_PATH', 'C:\\Users\\earlr\\AppData\\Local\\Programs\\Python\\Python313\\python.exe');
        $this->pythonPath = trim($pythonPath, '"\'');
        
        // Ensure temp directory exists
        if (!file_exists($this->tempPath)) {
            mkdir($this->tempPath, 0755, true);
        }
    }

    /**
     * Get the Python executable command
     */
    protected function getPythonCommand(): string
    {
        // Return path with quotes for Windows paths with spaces
        return $this->pythonPath;
    }

    /**
     * Parse a resume file and extract profile data
     * 
     * @param UploadedFile $file The uploaded resume file
     * @return array Parsed profile data or error
     */
    public function parseResume(UploadedFile $file): array
    {
        // Validate file type
        $allowedMimes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
        $allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp'];
        
        $extension = strtolower($file->getClientOriginalExtension());
        $mimeType = $file->getMimeType();
        
        if (!in_array($extension, $allowedExtensions) && !in_array($mimeType, $allowedMimes)) {
            return [
                'success' => false,
                'error' => 'Invalid file type. Please upload a PDF or image file (PNG, JPG, JPEG, GIF, WEBP).'
            ];
        }

        // Validate file size (max 10MB)
        $maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if ($file->getSize() > $maxSize) {
            return [
                'success' => false,
                'error' => 'File too large. Maximum size is 10MB.'
            ];
        }

        // Save file temporarily
        $tempFilename = 'resume_' . uniqid() . '.' . $extension;
        $tempFilePath = $this->tempPath . '/' . $tempFilename;
        
        try {
            // Move uploaded file to temp location
            $file->move($this->tempPath, $tempFilename);
            
            // Get OpenAI API key
            $apiKey = config('services.openai.api_key');
            
            if (empty($apiKey) || $apiKey === 'your-api-key-here') {
                $this->cleanup($tempFilePath);
                return [
                    'success' => false,
                    'error' => 'OpenAI API key not configured. Please set OPENAI_API_KEY in your .env file.'
                ];
            }

            // Build Python command - quote all paths for Windows
            $command = sprintf(
                '"%s" "%s" "%s" --api-key "%s"',
                $this->getPythonCommand(),
                $this->pythonScript,
                $tempFilePath,
                $apiKey
            );

            Log::info('Executing resume parser', ['pythonPath' => $this->pythonPath, 'script' => $this->pythonScript]);

            // Execute Python script - pass environment variables for proper network access
            $env = [
                'PATH' => getenv('PATH'),
                'SystemRoot' => getenv('SystemRoot'),
                'TEMP' => getenv('TEMP'),
                'TMP' => getenv('TMP'),
                'OPENAI_API_KEY' => $apiKey,
            ];
            
            $result = Process::timeout(120)->env($env)->run($command);

            // Clean up temp file
            $this->cleanup($tempFilePath);

            if (!$result->successful()) {
                Log::error('Resume parser failed', [
                    'exitCode' => $result->exitCode(),
                    'output' => $result->output(),
                    'error' => $result->errorOutput()
                ]);

                // Try to parse error from output
                $output = $result->output();
                $jsonOutput = json_decode($output, true);
                
                if ($jsonOutput && isset($jsonOutput['error'])) {
                    return [
                        'success' => false,
                        'error' => $jsonOutput['error']
                    ];
                }

                return [
                    'success' => false,
                    'error' => 'Failed to parse resume. Please try again or enter your information manually.'
                ];
            }

            // Parse JSON output
            $output = $result->output();
            $parsedData = json_decode($output, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error('Failed to parse resume parser output', ['output' => $output]);
                return [
                    'success' => false,
                    'error' => 'Failed to parse resume data. Please try again.'
                ];
            }

            // Check for error in parsed data
            if (isset($parsedData['error'])) {
                return [
                    'success' => false,
                    'error' => $parsedData['error']
                ];
            }

            Log::info('Resume parsed successfully', [
                'firstName' => $parsedData['firstName'] ?? '',
                'lastName' => $parsedData['lastName'] ?? '',
                'skillCount' => count($parsedData['skills'] ?? []),
                'credentialCount' => count($parsedData['credentials'] ?? [])
            ]);

            return [
                'success' => true,
                'data' => $parsedData
            ];

        } catch (Exception $e) {
            Log::error('Resume parser exception', ['error' => $e->getMessage()]);
            $this->cleanup($tempFilePath);
            
            return [
                'success' => false,
                'error' => 'An unexpected error occurred. Please try again.'
            ];
        }
    }

    /**
     * Parse resume from base64 encoded data
     * 
     * @param string $base64Data Base64 encoded file data (with or without data URI prefix)
     * @param string $filename Original filename for extension detection
     * @return array Parsed profile data or error
     */
    public function parseResumeFromBase64(string $base64Data, string $filename): array
    {
        // Remove data URI prefix if present
        if (str_contains($base64Data, ',')) {
            $base64Data = explode(',', $base64Data)[1];
        }

        // Decode base64
        $fileContent = base64_decode($base64Data);
        if ($fileContent === false) {
            return [
                'success' => false,
                'error' => 'Invalid file data.'
            ];
        }

        // Get extension from filename
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp'];
        
        if (!in_array($extension, $allowedExtensions)) {
            return [
                'success' => false,
                'error' => 'Invalid file type. Please upload a PDF or image file.'
            ];
        }

        // Save to temp file
        $tempFilename = 'resume_' . uniqid() . '.' . $extension;
        $tempFilePath = $this->tempPath . '/' . $tempFilename;
        
        try {
            file_put_contents($tempFilePath, $fileContent);

            // Get OpenAI API key
            $apiKey = config('services.openai.api_key');
            
            if (empty($apiKey) || $apiKey === 'your-api-key-here') {
                $this->cleanup($tempFilePath);
                return [
                    'success' => false,
                    'error' => 'OpenAI API key not configured. Please set OPENAI_API_KEY in your .env file.'
                ];
            }

            // Build Python command - quote all paths for Windows
            $command = sprintf(
                '"%s" "%s" "%s" --api-key "%s"',
                $this->getPythonCommand(),
                $this->pythonScript,
                $tempFilePath,
                $apiKey
            );

            // Execute Python script - pass environment variables for proper network access on Windows
            $env = [
                'PATH' => getenv('PATH'),
                'SystemRoot' => getenv('SystemRoot'),
                'TEMP' => getenv('TEMP'),
                'TMP' => getenv('TMP'),
                'OPENAI_API_KEY' => $apiKey,
            ];
            
            $result = Process::timeout(120)->env($env)->run($command);

            // Clean up temp file
            $this->cleanup($tempFilePath);

            Log::info('Resume parser result', [
                'successful' => $result->successful(),
                'exitCode' => $result->exitCode(),
                'output' => substr($result->output(), 0, 500),
                'errorOutput' => $result->errorOutput()
            ]);

            if (!$result->successful()) {
                $output = $result->output();
                $errorOutput = $result->errorOutput();
                $jsonOutput = json_decode($output, true);
                
                Log::error('Resume parser failed', [
                    'exitCode' => $result->exitCode(),
                    'output' => $output,
                    'errorOutput' => $errorOutput
                ]);
                
                if ($jsonOutput && isset($jsonOutput['error'])) {
                    return [
                        'success' => false,
                        'error' => $jsonOutput['error']
                    ];
                }

                // Return more helpful error message
                if (!empty($errorOutput)) {
                    return [
                        'success' => false,
                        'error' => 'Resume parsing failed: ' . substr($errorOutput, 0, 200)
                    ];
                }

                return [
                    'success' => false,
                    'error' => 'Failed to parse resume. Please try again.'
                ];
            }

            // Parse JSON output
            $parsedData = json_decode($result->output(), true);

            if (json_last_error() !== JSON_ERROR_NONE || isset($parsedData['error'])) {
                return [
                    'success' => false,
                    'error' => $parsedData['error'] ?? 'Failed to parse resume data.'
                ];
            }

            return [
                'success' => true,
                'data' => $parsedData
            ];

        } catch (Exception $e) {
            Log::error('Resume parser exception', ['error' => $e->getMessage()]);
            $this->cleanup($tempFilePath);
            
            return [
                'success' => false,
                'error' => 'An unexpected error occurred. Please try again.'
            ];
        }
    }

    /**
     * Clean up temporary file
     */
    protected function cleanup(string $filePath): void
    {
        if (file_exists($filePath)) {
            unlink($filePath);
        }
    }
}
