<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\JobPostingRankingService;
use App\Services\JobSkillExtractionService;
use App\Services\SkillAlignmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class JobController extends Controller
{

    private function excerpt(string $value, int $limit = 2000): string
    {
        if ($limit <= 0) {
            return '';
        }

        if (strlen($value) <= $limit) {
            return $value;
        }

        return substr($value, 0, $limit) . "... (truncated)";
    }

    private function haversineDistanceKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadiusKm = 6371.0;

        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) * sin($dLat / 2)
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2))
            * sin($dLng / 2) * sin($dLng / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadiusKm * $c;
    }

    /**
     * Assign approximate coordinates to each job around the center.
     * This enables distance filtering in the demo even if the upstream source is city-based text.
     */
    private function assignCoordinatesToJobs(array $jobs, float $centerLat, float $centerLng, float $spreadKm = 25.0): array
    {
        // Rough conversions (valid enough for small-area demo around PH)
        $degLatPerKm = 1.0 / 110.574;
        $degLngPerKm = 1.0 / max(1e-6, (111.320 * cos(deg2rad($centerLat))));

        $spreadKm = max(0.1, (float) $spreadKm);

        foreach ($jobs as $i => $job) {
            if (!is_array($job)) {
                continue;
            }

            if (isset($job['latitude'], $job['longitude']) && is_numeric($job['latitude']) && is_numeric($job['longitude'])) {
                $jobs[$i]['latitude'] = (float) $job['latitude'];
                $jobs[$i]['longitude'] = (float) $job['longitude'];
                continue;
            }

            // Random point within a circle around the center (keeps points within the intended area)
            $u = mt_rand(0, 1000000) / 1000000;
            $v = mt_rand(0, 1000000) / 1000000;
            $rKm = sqrt($u) * $spreadKm; // uniform by area
            $theta = 2 * M_PI * $v;

            $latOffsetKm = $rKm * cos($theta);
            $lngOffsetKm = $rKm * sin($theta);

            $jobs[$i]['latitude'] = $centerLat + ($latOffsetKm * $degLatPerKm);
            $jobs[$i]['longitude'] = $centerLng + ($lngOffsetKm * $degLngPerKm);
        }

        return $jobs;
    }

    private function filterJobsByDistance(array $jobs, float $centerLat, float $centerLng, float $radiusKm): array
    {
        if ($radiusKm <= 0) {
            return $jobs;
        }

        $filtered = [];
        foreach ($jobs as $job) {
            if (!is_array($job)) {
                continue;
            }

            $jobLat = $job['latitude'] ?? null;
            $jobLng = $job['longitude'] ?? null;
            if (!is_numeric($jobLat) || !is_numeric($jobLng)) {
                continue;
            }

            $distanceKm = $this->haversineDistanceKm($centerLat, $centerLng, (float) $jobLat, (float) $jobLng);
            if ($distanceKm <= $radiusKm) {
                $job['_distance_km'] = $distanceKm;
                $filtered[] = $job;
            }
        }

        return $filtered;
    }

    /**
     * List jobs
     */
    public function index(Request $request)
    {
        $query = $request->input('query') ?? 'developer'; // More generic default
        $city = $request->input('city') ?? 'Manila'; // More generic default
        $lat = (float) ($request->input('lat') ?? 14.5995); // Manila default
        $lng = (float) ($request->input('lng') ?? 120.9842);

        $candidateSkills = $this->normalizeCandidateSkillsInput($request->input('candidate_skills'));

        $similarityThreshold = (float) ($request->input('similarity_threshold') ?? 0.75);

        $radiusKmInput = $request->input('radius_km');
        $radiusKm = is_numeric($radiusKmInput) ? (float) $radiusKmInput : 15.0;
        if ($radiusKm <= 0) {
            $radiusKm = 15.0;
        }

        $jobsSource = 'unknown';

        // Get real jobs from Python script
        $jobs = $this->getJobsFromPythonScript($query, $city, $lat, $lng, $candidateSkills, $similarityThreshold, $radiusKm, $jobsSource);

        // Don't limit results - return all jobs from the scraper
        // $jobs = array_slice($jobs, 0, $this->maxResults);

        return response()
            ->json([
            'jobs' => $jobs,
            'source' => $jobsSource,
            'city' => $city,
            'query' => $query,
            'radius_km' => $radiusKm,
        ])
            ->header('X-Jobs-Source', $jobsSource);
    }

    /**
     * Get single job details
     */
    public function show(Request $request, string $id)
    {
        // Get query parameters for context
        $query = $request->input('query') ?? 'developer';
        $city = $request->input('city') ?? 'Manila';
        $lat = (float) ($request->input('lat') ?? 14.5995);
        $lng = (float) ($request->input('lng') ?? 120.9842);

        $candidateSkills = $this->normalizeCandidateSkillsInput($request->input('candidate_skills'));

        $similarityThreshold = (float) ($request->input('similarity_threshold') ?? 0.75);

        $radiusKmInput = $request->input('radius_km');
        $radiusKm = is_numeric($radiusKmInput) ? (float) $radiusKmInput : 15.0;
        if ($radiusKm <= 0) {
            $radiusKm = 15.0;
        }

        $jobsSource = 'unknown';

        // Get jobs from Python script with current search context
        $jobs = $this->getJobsFromPythonScript($query, $city, $lat, $lng, $candidateSkills, $similarityThreshold, $radiusKm, $jobsSource);

        // Find job by ID (use index as ID since Python script doesn't provide IDs)
        $jobIndex = (int)$id - 1; // Convert to 0-based index
        $job = isset($jobs[$jobIndex]) ? $jobs[$jobIndex] : null;

        if (!$job) {
            // Fallback to first job if ID not found
            $job = $jobs[0] ?? null;
        }

        return response()
            ->json([
                'job' => $job,
                'source' => $jobsSource,
                'radius_km' => $radiusKm,
            ])
            ->header('X-Jobs-Source', $jobsSource);
    }

    /**
     * Execute Python script to get real job data
     */
    protected function getJobsFromPythonScript(
        string $jobTitle,
        string $location,
        float $lat,
        float $lng,
        ?array $candidateSkills = null,
        float $similarityThreshold = 0.75,
        float $radiusKm = 15.0,
        ?string &$jobsSource = null
    ): array
    {
        try {
            $jobsSource = 'python_scraper';
            // Keep automated tests fast and deterministic.
            // if (app()->environment('testing')) {
            //     return $this->getMockJobs($location, $lat, $lng);
            // }

            // Path to Python script
            $scriptPath = base_path('python_scripts/job_listing_scraper.py');

            Log::info('JobController.getJobsFromPythonScript: start', [
                'jobTitle' => $jobTitle,
                'location' => $location,
                'lat' => $lat,
                'lng' => $lng,
                'radiusKm' => $radiusKm,
                'scriptPath' => $scriptPath,
                'scriptExists' => file_exists($scriptPath),
                'candidateSkillsCount' => is_array($candidateSkills) ? count($candidateSkills) : 0,
                'similarityThreshold' => $similarityThreshold,
            ]);

            // Execute Python script with arguments. Try multiple launchers so Windows PATH issues
            // (e.g., uv not available under PHP) don't force a mock fallback.
            $baseDir = base_path();
            $escapedBaseDir = escapeshellarg($baseDir);
            $escapedJobTitle = escapeshellarg($jobTitle);
            $escapedLocation = escapeshellarg($location);

            $commands = [
                "cd {$escapedBaseDir} && uv run python_scripts/job_listing_scraper.py {$escapedJobTitle} {$escapedLocation} 2>&1",
                "cd {$escapedBaseDir} && python python_scripts/job_listing_scraper.py {$escapedJobTitle} {$escapedLocation} 2>&1",
                "cd {$escapedBaseDir} && py -3 python_scripts/job_listing_scraper.py {$escapedJobTitle} {$escapedLocation} 2>&1",
            ];

            $output = null;
            $lastOutput = null;
            $usedCommand = null;

            foreach ($commands as $command) {
                Log::info('JobController.getJobsFromPythonScript: executing scraper', [
                    'command' => $command,
                ]);

                $candidateOutput = shell_exec($command);
                $lastOutput = $candidateOutput;

                if (is_string($candidateOutput) && strpos($candidateOutput, '[') !== false) {
                    $output = $candidateOutput;
                    $usedCommand = $command;
                    break;
                }

                Log::warning('JobController.getJobsFromPythonScript: scraper attempt did not produce JSON output', [
                    'command' => $command,
                    'outputType' => gettype($candidateOutput),
                    'outputHead' => is_string($candidateOutput) ? $this->excerpt($candidateOutput, 800) : null,
                ]);
            }

            if (!is_string($output) || trim($output) === '') {
                $jobsSource = 'mock';
                Log::warning('JobController.getJobsFromPythonScript: all scraper attempts failed to produce output; falling back to mock jobs', [
                    'scriptPath' => $scriptPath,
                    'scriptExists' => file_exists($scriptPath),
                    'lastOutputType' => gettype($lastOutput),
                    'lastOutputHead' => is_string($lastOutput) ? $this->excerpt($lastOutput, 1200) : null,
                ]);
                return $this->getMockJobs($location, $lat, $lng);
            }

            Log::info('JobController.getJobsFromPythonScript: scraper returned output', [
                'usedCommand' => $usedCommand,
                'outputLength' => strlen($output),
                'outputHead' => $this->excerpt($output, 800),
                'outputTail' => $this->excerpt(substr($output, max(0, strlen($output) - 800)), 800),
            ]);

            // if (!$output) {
            //     // Fallback to mock data if script fails
            //     return $this->getMockJobs($location, $lat, $lng);
            // }

            // Parse JSON output
            $jsonStart = strpos($output, '[');

            if ($jsonStart === false) {
                $jobsSource = 'mock';
                Log::warning('JobController.getJobsFromPythonScript: no JSON array start found in scraper output; falling back to mock jobs', [
                    'outputHead' => $this->excerpt($output, 1200),
                ]);
                return $this->getMockJobs($location, $lat, $lng);
            }
            // if ($jsonStart === false) {
            //     // Fallback to mock data if no JSON found
            //     return $this->getMockJobs($location, $lat, $lng);
            // }

            $jsonOutput = substr($output, $jsonStart);
            $pythonJobs = json_decode($jsonOutput, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                $jobsSource = 'mock';
                Log::warning('JobController.getJobsFromPythonScript: JSON decode failed; falling back to mock jobs', [
                    'jsonError' => json_last_error_msg(),
                    'jsonHead' => $this->excerpt($jsonOutput, 1200),
                ]);
                return $this->getMockJobs($location, $lat, $lng);
            }

            if (!is_array($pythonJobs)) {
                $jobsSource = 'mock';
                Log::warning('JobController.getJobsFromPythonScript: decoded JSON is not an array; falling back to mock jobs', [
                    'decodedType' => gettype($pythonJobs),
                ]);
                return $this->getMockJobs($location, $lat, $lng);
            }

            Log::info('JobController.getJobsFromPythonScript: decoded jobs', [
                'count' => count($pythonJobs),
            ]);

            // 1) Assign coordinates (demo approximation) then
            // 2) Filter by distance BEFORE any LLM-heavy requiredSkills extraction
            $pythonJobs = $this->assignCoordinatesToJobs($pythonJobs, $lat, $lng, max(1.0, $radiusKm));
            $beforeDistanceCount = count($pythonJobs);
            $pythonJobs = $this->filterJobsByDistance($pythonJobs, $lat, $lng, $radiusKm);

            Log::info('JobController.getJobsFromPythonScript: distance filter applied', [
                'radiusKm' => $radiusKm,
                'before' => $beforeDistanceCount,
                'after' => count($pythonJobs),
            ]);

            // if (!$pythonJobs || !is_array($pythonJobs)) {
            //     // Fallback to mock data if JSON parsing fails
            //     return $this->getMockJobs($location, $lat, $lng);
            // }

            // Build requiredSkills using LLM extraction + cosine alignment (no randomization)
            foreach ($pythonJobs as $i => $job) {
                if (!is_array($job)) {
                    continue;
                }
                $pythonJobs[$i]['requiredSkills'] = $this->buildRequiredSkillsForJob($job);
            }

            // Trigger ranking BEFORE converting to frontend format
            if (is_array($candidateSkills) && count($candidateSkills) > 0) {
                $alignment = app(SkillAlignmentService::class);
                $candidateSkills = $alignment->canonicalizeCandidateSkills($candidateSkills);

                Log::info('JobController.getJobsFromPythonScript: ranking jobs using candidate skills', [
                    'candidateSkillsCount' => count($candidateSkills),
                    'similarityThreshold' => $similarityThreshold,
                ]);

                $ranking = app(JobPostingRankingService::class);
                $ranked = $ranking->rank($candidateSkills, $pythonJobs, $similarityThreshold);

                $ordered = [];
                foreach ($ranked as $row) {
                    if (!is_array($row)) {
                        continue;
                    }
                    $job = $row['job'] ?? null;
                    if (!is_array($job)) {
                        continue;
                    }
                    $job['_match'] = $row['result'] ?? null;
                    $ordered[] = $job;
                }

                if (count($ordered) > 0) {
                    $pythonJobs = $ordered;
                }
            }

            Log::info('JobController.getJobsFromPythonScript: returning transformed jobs', [
                'count' => count($pythonJobs),
            ]);

            // Transform Python job data to frontend format
            return $this->transformPythonJobsToFrontendFormat($pythonJobs, $lat, $lng);

        } catch (\Exception $e) {
            // Fallback to mock data on any error
            $jobsSource = 'mock';
            Log::error('JobController.getJobsFromPythonScript: exception; falling back to mock jobs', [
                'jobTitle' => $jobTitle,
                'location' => $location,
                'lat' => $lat,
                'lng' => $lng,
                'radiusKm' => $radiusKm,
                'candidateSkillsCount' => is_array($candidateSkills) ? count($candidateSkills) : 0,
                'similarityThreshold' => $similarityThreshold,
                'exceptionMessage' => $e->getMessage(),
                'exceptionClass' => get_class($e),
                'exceptionFile' => $e->getFile(),
                'exceptionLine' => $e->getLine(),
            ]);
            return $this->getMockJobs($location, $lat, $lng);
            // return $e->getMessage();
        }
    }

    /**
     * Transform Python script output to frontend expected format
     */
    protected function transformPythonJobsToFrontendFormat(array $pythonJobs, float $centerLat, float $centerLng): array
    {
        $transformedJobs = [];
        $id = 1;

        foreach ($pythonJobs as $job) {
            // Prefer pre-assigned coordinates from earlier pipeline; otherwise generate a small jitter.
            if (isset($job['latitude'], $job['longitude']) && is_numeric($job['latitude']) && is_numeric($job['longitude'])) {
                $latitude = (float) $job['latitude'];
                $longitude = (float) $job['longitude'];
            } else {
                // ~2km variation
                $latOffset = (mt_rand(-200, 200) / 10000);
                $lngOffset = (mt_rand(-200, 200) / 10000);
                $latitude = $centerLat + $latOffset;
                $longitude = $centerLng + $lngOffset;
            }

            // requiredSkills are extracted by an LLM and aligned to the `skills` table via cosine similarity.
            $requiredSkills = [];
            if (isset($job['requiredSkills']) && is_array($job['requiredSkills']) && count($job['requiredSkills']) > 0) {
                $requiredSkills = $job['requiredSkills'];
            } else {
                $requiredSkills = $this->buildRequiredSkillsForJob(is_array($job) ? $job : []);
            }

            // Generate basic responsibilities and qualifications
            $responsibilities = [
                'Execute design projects according to project requirements',
                'Collaborate with team members on creative projects',
                'Ensure quality and consistency in design deliverables',
                'Meet project deadlines and communicate progress',
                'Participate in design reviews and feedback sessions'
            ];

            $qualifications = [
                'Relevant experience in design field',
                'Proficiency in design software tools',
                'Strong portfolio demonstrating skills',
                'Good communication and collaboration skills',
                'Bachelor\'s degree preferred'
            ];

            $transformedJobs[] = [
                'id' => $id,
                'title' => $job['title'] ?? 'Unknown Position',
                'company' => $job['company'] ?? 'Unknown Company',
                'location' => $job['location'] ?? 'Remote',
                'latitude' => $latitude,
                'longitude' => $longitude,
                'salary' => null, // Remove salary as requested
                'type' => $job['job_type'] ?? 'Full-time',
                'description' => $job['description'] ?? 'No description available.',
                'requiredSkills' => $requiredSkills,
                'responsibilities' => $responsibilities,
                'qualifications' => $qualifications,
                'url' => $job['url'] ?? null,
                'source' => $job['source'] ?? 'Unknown',
                'match' => $job['_match'] ?? null,
                'distance_km' => isset($job['_distance_km']) ? (float) $job['_distance_km'] : null,
            ];

            $id++;
        }

        return $transformedJobs;
    }

    /**
     * Build requiredSkills from job content using:
     * 1) LLM extraction (JobSkillExtractionService)
     * 2) Align extracted skills to canonical `skills` table using cosine similarity (SkillAlignmentService)
     *
     * @return array<string, int> map skill => 0..100
     */
    protected function buildRequiredSkillsForJob(array $job): array
    {
        $extractor = app(JobSkillExtractionService::class);
        $alignment = app(SkillAlignmentService::class);

        $rawSkills = $extractor->extractSkills($job, 8);
        $aligned = $alignment->alignToCanonicalSkills($rawSkills, 5);

        $required = [];
        foreach ($aligned as $skill => $sim) {
            $score = (int) round(max(0.0, min(1.0, (float) $sim)) * 100);
            $required[$skill] = $score;
        }

        return $required;
    }

    /**
     * Normalize candidate_skills input into the format expected by JobMatchService:
     * array<int, array{skill:string, credential_count:int, experience_count:int}>
     *
     * Accepts:
     * - null
     * - string[]
     * - map<string,int> (skill => rating)
     * - array of arrays with 'skill'
     */
    private function normalizeCandidateSkillsInput(mixed $input): ?array
    {
        if (!is_array($input) || count($input) === 0) {
            return null;
        }

        // Case A: string[]
        $allStrings = true;
        foreach ($input as $v) {
            if (!is_string($v)) {
                $allStrings = false;
                break;
            }
        }
        if ($allStrings) {
            $out = [];
            foreach ($input as $skill) {
                $skill = trim((string) $skill);
                if ($skill === '') {
                    continue;
                }
                $out[] = [
                    'skill' => $skill,
                    'credential_count' => 1,
                    'experience_count' => 0,
                ];
            }
            return count($out) > 0 ? $out : null;
        }

        // Case B: map<string,int> (skill => rating)
        $looksAssociative = array_keys($input) !== range(0, count($input) - 1);
        if ($looksAssociative) {
            $out = [];
            foreach ($input as $skill => $rating) {
                if (!is_string($skill)) {
                    continue;
                }
                $skill = trim($skill);
                if ($skill === '') {
                    continue;
                }

                $level = is_numeric($rating) ? (int) $rating : 0;
                if ($level < 0) {
                    $level = 0;
                }

                $out[] = [
                    'skill' => $skill,
                    // Treat any provided skill as having some evidence.
                    'credential_count' => $level > 0 ? 1 : 0,
                    'experience_count' => 0,
                ];
            }

            return count($out) > 0 ? $out : null;
        }

        // Case C: array of objects/arrays
        $out = [];
        foreach ($input as $entry) {
            if (!is_array($entry)) {
                continue;
            }

            $skill = $entry['skill'] ?? null;
            if (!is_string($skill)) {
                continue;
            }
            $skill = trim($skill);
            if ($skill === '') {
                continue;
            }

            $credentialCount = (int) ($entry['credential_count'] ?? 1);
            $experienceCount = (int) ($entry['experience_count'] ?? 0);
            if ($credentialCount < 0) {
                $credentialCount = 0;
            }
            if ($experienceCount < 0) {
                $experienceCount = 0;
            }

            $out[] = [
                'skill' => $skill,
                'credential_count' => $credentialCount,
                'experience_count' => $experienceCount,
            ];
        }

        return count($out) > 0 ? $out : null;
    }

    /**
     * Mock job data for demo/fallback - Taguig/BGC locations
     */
    protected function getMockJobs(string $city = 'Taguig', float $centerLat = 14.5176, float $centerLng = 121.0509): array
    {
        return [
            [
                'id' => 1,
                'title' => 'UX Designer',
                'company' => 'Accenture Philippines',
                'location' => 'BGC, Taguig',
                'latitude' => 14.5512,
                'longitude' => 121.0498,
                'salary' => '₱45,000 - ₱65,000',
                'type' => 'Full-time',
                'description' => 'We are looking for a creative UX Designer to join our team at BGC. You will be responsible for creating intuitive user experiences for enterprise web and mobile applications.',
                'requiredSkills' => ['Design' => 80, 'Prototyping' => 70, 'Tools' => 60, 'Research' => 50, 'Communication' => 65],
                'responsibilities' => [
                    'Create user flows, wireframes, and prototypes',
                    'Conduct user research and usability testing',
                    'Collaborate with developers and product managers',
                    'Design responsive interfaces for web and mobile',
                    'Maintain design systems and documentation'
                ],
                'qualifications' => [
                    '2+ years of UX design experience',
                    'Proficiency in Figma or similar design tools',
                    'Strong portfolio demonstrating UX process',
                    'Excellent communication skills',
                    'Bachelor\'s degree in Design or related field'
                ]
            ],
            [
                'id' => 2,
                'title' => 'Frontend Developer',
                'company' => 'Globe Telecom',
                'location' => 'The Globe Tower, BGC',
                'latitude' => 14.5547,
                'longitude' => 121.0462,
                'salary' => '₱50,000 - ₱80,000',
                'type' => 'Full-time',
                'description' => 'Seeking experienced frontend developer proficient in React to build modern web applications for Globe\'s digital products.',
                'requiredSkills' => ['Design' => 50, 'Prototyping' => 60, 'Tools' => 85, 'Research' => 40, 'Communication' => 55],
                'responsibilities' => [
                    'Develop responsive web applications using React',
                    'Write clean, maintainable code',
                    'Collaborate with designers and backend developers',
                    'Optimize applications for performance',
                    'Participate in code reviews'
                ],
                'qualifications' => [
                    '3+ years of frontend development experience',
                    'Expert knowledge of React and JavaScript',
                    'Familiarity with modern CSS and build tools',
                    'Experience with REST APIs',
                    'Good problem-solving skills'
                ]
            ],
            [
                'id' => 3,
                'title' => 'Product Manager',
                'company' => 'Maya (PayMaya)',
                'location' => 'Net One Center, BGC',
                'latitude' => 14.5489,
                'longitude' => 121.0505,
                'salary' => '₱70,000 - ₱120,000',
                'type' => 'Full-time',
                'description' => 'Lead product development for Maya\'s fintech solutions and work with cross-functional teams to deliver innovative financial products.',
                'requiredSkills' => ['Design' => 45, 'Prototyping' => 55, 'Tools' => 50, 'Research' => 75, 'Communication' => 85],
                'responsibilities' => [
                    'Define product vision and roadmap',
                    'Gather and prioritize requirements',
                    'Work closely with engineering and design teams',
                    'Analyze market trends and competition',
                    'Present to stakeholders and leadership'
                ],
                'qualifications' => [
                    '3+ years of product management experience',
                    'Strong analytical and strategic thinking',
                    'Experience with agile methodologies',
                    'Excellent presentation skills',
                    'Fintech background preferred'
                ]
            ],
            [
                'id' => 4,
                'title' => 'Graphic Designer',
                'company' => 'Canva Philippines',
                'location' => 'High Street, BGC',
                'latitude' => 14.5503,
                'longitude' => 121.0451,
                'salary' => '₱35,000 - ₱50,000',
                'type' => 'Full-time',
                'description' => 'Create visual content for marketing campaigns and product design at Canva\'s growing BGC office.',
                'requiredSkills' => ['Design' => 90, 'Prototyping' => 40, 'Tools' => 75, 'Research' => 30, 'Communication' => 50],
                'responsibilities' => [
                    'Design marketing collaterals',
                    'Create social media graphics',
                    'Develop brand identity materials',
                    'Collaborate with marketing team',
                    'Maintain brand consistency'
                ],
                'qualifications' => [
                    '1+ years of graphic design experience',
                    'Proficiency in design tools (Canva, Adobe Suite)',
                    'Strong visual design skills',
                    'Attention to detail',
                    'Portfolio required'
                ]
            ],
            [
                'id' => 5,
                'title' => 'Junior Software Engineer',
                'company' => 'Kalibrr',
                'location' => 'Uptown BGC, Taguig',
                'latitude' => 14.5565,
                'longitude' => 121.0532,
                'salary' => '₱30,000 - ₱45,000',
                'type' => 'Full-time',
                'description' => 'Entry level position for software development. Great opportunity to learn and grow in a fast-paced startup environment.',
                'requiredSkills' => ['Design' => 35, 'Prototyping' => 45, 'Tools' => 60, 'Research' => 35, 'Communication' => 45],
                'responsibilities' => [
                    'Assist in software development projects',
                    'Learn from senior developers',
                    'Write and test code',
                    'Fix bugs and issues',
                    'Document work processes'
                ],
                'qualifications' => [
                    'Fresh graduate or 0-1 year experience',
                    'Knowledge of Python, JavaScript, or PHP',
                    'Eager to learn new technologies',
                    'Good communication skills',
                    'Computer Science degree or bootcamp graduate'
                ]
            ]
        ];
    }
}
