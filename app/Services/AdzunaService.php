<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class AdzunaService
{
    protected $appId;
    protected $appKey;
    protected $baseUrl = 'https://api.adzuna.com/v1/api/jobs';
    protected $country = 'gb'; // Use 'gb' for UK, 'us' for USA - PH not directly supported

    public function __construct()
    {
        $this->appId = config('services.adzuna.app_id');
        $this->appKey = config('services.adzuna.app_key');
    }

    /**
     * Search for jobs
     */
    public function searchJobs(string $query = '', float $lat = 10.3157, float $lng = 123.8854, int $page = 1): array
    {
        // Check if API credentials are configured
        if (!$this->appId || !$this->appKey) {
            Log::info('Adzuna API credentials not configured, using mock data');
            throw new \Exception('API credentials not configured');
        }

        // Create cache key
        $cacheKey = 'adzuna_jobs_' . md5($query . $lat . $lng . $page);
        
        // Try to get from cache first (cache for 1 hour)
        return Cache::remember($cacheKey, 3600, function () use ($query, $lat, $lng, $page) {
            $response = Http::timeout(10)->get("{$this->baseUrl}/{$this->country}/search/{$page}", [
                'app_id' => $this->appId,
                'app_key' => $this->appKey,
                'results_per_page' => 20,
                'what' => $query ?: 'developer designer', // Default search terms
                'content-type' => 'application/json',
                // Note: Adzuna doesn't have Philippine jobs, so we'll adapt coordinates
                // In production, you might want to use a local job board API instead
            ]);

            if ($response->failed()) {
                Log::error('Adzuna API error: ' . $response->body());
                throw new \Exception('Failed to fetch jobs from Adzuna');
            }

            $data = $response->json();
            
            // Transform results to add local coordinates (for demo)
            $results = $data['results'] ?? [];
            
            // Override coordinates to be around Cebu for demo purposes
            foreach ($results as &$job) {
                $job['latitude'] = $lat + (rand(-500, 500) / 10000);
                $job['longitude'] = $lng + (rand(-500, 500) / 10000);
            }

            return $results;
        });
    }

    /**
     * Get a specific job (not directly supported by Adzuna, returns from cache or throws)
     */
    public function getJob(string $id): ?array
    {
        // Adzuna doesn't have a direct job lookup endpoint
        // In a real app, you might store jobs in your database
        throw new \Exception('Direct job lookup not supported');
    }

    /**
     * Check if the API is configured
     */
    public function isConfigured(): bool
    {
        return !empty($this->appId) && !empty($this->appKey);
    }
}
