<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * CareerJet API Service
 * 
 * API Endpoint: https://search.api.careerjet.net/v4/query
 * Documentation: https://www.careerjet.ph/partners/api
 * 
 * Locale for Philippines: en_PH
 */
class CareerJetService
{
    protected string $baseUrl = 'https://search.api.careerjet.net/v4/query';
    protected ?string $apiKey;
    protected string $locale = 'en_PH'; // Philippines locale

    // Cache duration: 1 hour (in seconds)
    protected int $cacheDuration = 3600;

    // Maximum results to return (limit to 5 to conserve quota)
    protected int $maxResults = 5;

    public function __construct()
    {
        $this->apiKey = config('services.careerjet.key');
    }

    /**
     * Search for jobs by city with caching
     * 
     * @param string $query Search query (job title, keywords)
     * @param string $city City name for location-based search
     * @param int $limit Maximum number of results (max 5)
     * @return array
     */
    public function searchJobs(string $query = '', string $city = 'Taguig', int $limit = 5): array
    {
        // Enforce max limit of 5
        $limit = min($limit, $this->maxResults);

        // Build cache key based on city and query
        $cacheKey = 'careerjet_jobs_' . md5($city . '_' . $query . '_' . $limit);

        return Cache::remember($cacheKey, $this->cacheDuration, function () use ($query, $city, $limit) {
            return $this->fetchJobsFromApi($query, $city, $limit);
        });
    }

    /**
     * Fetch jobs from CareerJet API
     * 
     * Required Parameters:
     * - user_ip: IP address of the end user
     * - user_agent: User agent string of the end user
     * 
     * Optional Parameters:
     * - locale_code: en_PH for Philippines
     * - keywords: Search terms
     * - location: Search location (city, region)
     * - contract_type: p=permanent, c=contract, t=temporary, i=internship
     * - work_hours: f=full-time, p=part-time
     * - page: 1-10
     * - page_size: 1-100 (default 20)
     * - sort: relevance, date, salary
     */
    protected function fetchJobsFromApi(string $query, string $city, int $limit): array
    {
        // If no API key configured, throw exception to trigger fallback
        if (empty($this->apiKey)) {
            Log::warning('CareerJet API key not configured');
            throw new \Exception('CareerJet API key not configured');
        }

        try {
            $searchQuery = trim($query) ?: 'jobs';

            Log::info('CareerJet API request', [
                'keywords' => $searchQuery,
                'location' => $city,
                'limit' => $limit
            ]);

            // Build Basic Auth credentials (API key as username, empty password)
            $credentials = base64_encode($this->apiKey . ':');

            // Make API request
            $response = Http::withHeaders([
                'Authorization' => 'Basic ' . $credentials,
            ])->timeout(15)->get($this->baseUrl, [
                'locale_code' => $this->locale,
                'keywords' => $searchQuery,
                'location' => $city,
                'page' => 1,
                'page_size' => $limit,
                'sort' => 'relevance',
                // Required parameters - use server values for demo
                'user_ip' => request()->ip() ?? '127.0.0.1',
                'user_agent' => request()->userAgent() ?? 'SkillMatch/1.0',
            ]);

            // Handle HTTP errors
            if (!$response->successful()) {
                $this->handleHttpError($response);
            }

            $data = $response->json();

            // Check response type
            if (($data['type'] ?? '') === 'LOCATIONS') {
                // Location mode - no jobs found, location ambiguous
                Log::warning('CareerJet location mode', ['message' => $data['message'] ?? 'Unknown']);
                throw new \Exception('Location not found or ambiguous: ' . ($data['message'] ?? ''));
            }

            if (($data['type'] ?? '') !== 'JOBS') {
                throw new \Exception('Unexpected response type: ' . ($data['type'] ?? 'unknown'));
            }

            $jobs = $data['jobs'] ?? [];

            Log::info('CareerJet API success', [
                'hits' => $data['hits'] ?? 0,
                'jobs_returned' => count($jobs)
            ]);

            return $jobs;

        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('CareerJet API connection error', ['message' => $e->getMessage()]);
            throw new \Exception('Unable to connect to CareerJet API: ' . $e->getMessage());
        } catch (\Exception $e) {
            Log::error('CareerJet API exception', ['message' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Handle HTTP error responses
     */
    protected function handleHttpError($response): void
    {
        $status = $response->status();
        $body = $response->json() ?? [];
        $message = $body['message'] ?? $body['error'] ?? 'Unknown error';

        Log::error('CareerJet API HTTP error', [
            'status' => $status,
            'message' => $message
        ]);

        switch ($status) {
            case 400:
                throw new \Exception("Bad request: {$message}");
            case 403:
                throw new \Exception("Missing required params (user_ip/user_agent) or invalid API key: {$message}");
            case 404:
                throw new \Exception("API endpoint not found");
            case 429:
                throw new \Exception("Rate limit exceeded");
            default:
                throw new \Exception("CareerJet API error ({$status}): {$message}");
        }
    }

    /**
     * Map CareerJet API response to our app's job format
     * 
     * CareerJet job fields:
     * - title, company, date, description, locations
     * - salary, salary_currency_code, salary_min, salary_max, salary_type
     * - site, url
     * 
     * Note: CareerJet doesn't provide coordinates, so we generate them around center
     * 
     * @param array $apiJobs Raw jobs from CareerJet API
     * @param float $centerLat Center latitude for coordinate generation
     * @param float $centerLng Center longitude for coordinate generation
     * @return array
     */
    public function mapJobsToAppFormat(array $apiJobs, float $centerLat = 14.5176, float $centerLng = 121.0509): array
    {
        return array_map(function ($job, $index) use ($centerLat, $centerLng) {
            // Generate coordinates around center (CareerJet doesn't provide lat/lng)
            $latOffset = (rand(-80, 80) / 10000);
            $lngOffset = (rand(-80, 80) / 10000);

            // Generate skill requirements based on job content
            $requiredSkills = $this->generateSkillRequirements($job);

            return [
                'id' => 'cj_' . md5($job['url'] ?? $index),
                'title' => $job['title'] ?? 'Untitled Position',
                'company' => $job['company'] ?? 'Unknown Company',
                'location' => $job['locations'] ?? 'Philippines',
                'latitude' => $centerLat + $latOffset,
                'longitude' => $centerLng + $lngOffset,
                'salary' => $this->formatSalary($job),
                'type' => $this->inferJobType($job),
                'is_remote' => $this->isRemoteJob($job),
                'description' => $job['description'] ?? 'No description available.',
                'full_description' => $job['description'] ?? 'No description available.',
                'requiredSkills' => $requiredSkills,
                'responsibilities' => $this->generateResponsibilities($job),
                'qualifications' => $this->generateQualifications($job),
                'benefits' => [],
                'apply_url' => $job['url'] ?? null,
                'posted_date' => $job['date'] ?? null,
                'source' => 'careerjet',
                'source_site' => $job['site'] ?? null,
            ];
        }, $apiJobs, array_keys($apiJobs));
    }

    /**
     * Format salary from CareerJet response
     */
    protected function formatSalary(array $job): string
    {
        $salary = $job['salary'] ?? null;
        
        if ($salary) {
            return $salary;
        }

        $min = $job['salary_min'] ?? null;
        $max = $job['salary_max'] ?? null;
        $currency = $job['salary_currency_code'] ?? 'PHP';
        $type = $job['salary_type'] ?? 'M';

        $periodMap = [
            'Y' => '/year',
            'M' => '/month',
            'W' => '/week',
            'D' => '/day',
            'H' => '/hour',
        ];
        $period = $periodMap[$type] ?? '/month';

        if ($min && $max) {
            return "₱" . number_format($min) . " - ₱" . number_format($max) . $period;
        }

        if ($min) {
            return "₱" . number_format($min) . "+" . $period;
        }

        return 'Salary not disclosed';
    }

    /**
     * Infer job type from job data
     */
    protected function inferJobType(array $job): string
    {
        $title = strtolower($job['title'] ?? '');
        $description = strtolower($job['description'] ?? '');
        $content = $title . ' ' . $description;

        if (preg_match('/part[- ]?time/i', $content)) {
            return 'Part-time';
        }
        if (preg_match('/contract|freelance/i', $content)) {
            return 'Contract';
        }
        if (preg_match('/intern|internship|trainee/i', $content)) {
            return 'Internship';
        }
        if (preg_match('/temporary|temp /i', $content)) {
            return 'Temporary';
        }

        return 'Full-time';
    }

    /**
     * Check if job is remote
     */
    protected function isRemoteJob(array $job): bool
    {
        $title = strtolower($job['title'] ?? '');
        $description = strtolower($job['description'] ?? '');
        $location = strtolower($job['locations'] ?? '');
        $content = $title . ' ' . $description . ' ' . $location;

        return (bool) preg_match('/remote|work from home|wfh|hybrid/i', $content);
    }

    /**
     * Generate skill requirements based on job content
     */
    protected function generateSkillRequirements(array $job): array
    {
        $title = strtolower($job['title'] ?? '');
        $description = strtolower($job['description'] ?? '');
        $content = $title . ' ' . $description;

        // Default skills
        $skills = [
            'Design' => 50,
            'Prototyping' => 50,
            'Tools' => 50,
            'Research' => 50,
            'Communication' => 50,
        ];

        // Adjust based on job content
        if (preg_match('/design|ui|ux|creative|graphic/i', $content)) {
            $skills['Design'] = rand(70, 95);
            $skills['Prototyping'] = rand(60, 85);
        }

        if (preg_match('/develop|engineer|program|code|software|web|mobile|app/i', $content)) {
            $skills['Tools'] = rand(75, 95);
            $skills['Prototyping'] = rand(55, 80);
        }

        if (preg_match('/manager|lead|senior|director|head|supervisor/i', $content)) {
            $skills['Communication'] = rand(75, 95);
            $skills['Research'] = rand(60, 80);
        }

        if (preg_match('/analyst|research|data|insight|strategy/i', $content)) {
            $skills['Research'] = rand(75, 95);
            $skills['Tools'] = rand(60, 80);
        }

        if (preg_match('/marketing|sales|business|customer|support|service/i', $content)) {
            $skills['Communication'] = rand(75, 95);
            $skills['Research'] = rand(55, 75);
        }

        if (preg_match('/junior|entry|intern|trainee|fresh/i', $content)) {
            foreach ($skills as $key => $value) {
                $skills[$key] = max(30, $value - rand(15, 25));
            }
        }

        return $skills;
    }

    /**
     * Generate responsibilities based on job
     */
    protected function generateResponsibilities(array $job): array
    {
        return [
            'Perform job duties as outlined in the description',
            'Collaborate with team members and stakeholders',
            'Meet deadlines and deliver quality work',
            'Participate in team meetings and discussions',
            'Continuous learning and skill development',
        ];
    }

    /**
     * Generate qualifications based on job
     */
    protected function generateQualifications(array $job): array
    {
        return [
            'Relevant experience in the field',
            'Strong communication skills',
            'Ability to work in a team',
            'Problem-solving mindset',
            'Bachelor\'s degree or equivalent',
        ];
    }

    /**
     * Clear cache for a specific city/query
     */
    public function clearCache(string $city = '', string $query = ''): void
    {
        $cacheKey = 'careerjet_jobs_' . md5($city . '_' . $query . '_' . $this->maxResults);
        Cache::forget($cacheKey);
    }
}
