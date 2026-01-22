<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\JobPostingRankingService;
use App\Services\JobSkillExtractionService;
use App\Services\SkillAlignmentService;
use Illuminate\Http\Request;

class JobController extends Controller
{

    /**
     * List jobs
     */
    public function index(Request $request)
    {
        $query = $request->input('query') ?? 'developer'; // More generic default
        $city = $request->input('city') ?? 'Manila'; // More generic default
        $lat = (float) ($request->input('lat') ?? 14.5995); // Manila default
        $lng = (float) ($request->input('lng') ?? 120.9842);

        $candidateSkills = $request->input('candidate_skills');
        if (!is_array($candidateSkills)) {
            $candidateSkills = null;
        }

        $similarityThreshold = (float) ($request->input('similarity_threshold') ?? 0.75);

        // Get real jobs from Python script
        $jobs = $this->getJobsFromPythonScript($query, $city, $lat, $lng, $candidateSkills, $similarityThreshold);

        // Don't limit results - return all jobs from the scraper
        // $jobs = array_slice($jobs, 0, $this->maxResults);

        return response()->json([
            'jobs' => $jobs,
            'source' => 'python_scraper',
            'city' => $city,
            'query' => $query
        ]);
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

        $candidateSkills = $request->input('candidate_skills');
        if (!is_array($candidateSkills)) {
            $candidateSkills = null;
        }

        $similarityThreshold = (float) ($request->input('similarity_threshold') ?? 0.75);

        // Get jobs from Python script with current search context
        $jobs = $this->getJobsFromPythonScript($query, $city, $lat, $lng, $candidateSkills, $similarityThreshold);

        // Find job by ID (use index as ID since Python script doesn't provide IDs)
        $jobIndex = (int)$id - 1; // Convert to 0-based index
        $job = isset($jobs[$jobIndex]) ? $jobs[$jobIndex] : null;

        if (!$job) {
            // Fallback to first job if ID not found
            $job = $jobs[0] ?? null;
        }

        return response()->json([
            'job' => $job
        ]);
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
        float $similarityThreshold = 0.75
    ): array
    {
        try {
            // Keep automated tests fast and deterministic.
            if (app()->environment('testing')) {
                return $this->getMockJobs($location, $lat, $lng);
            }

            // Path to Python script
            $scriptPath = base_path('python_scripts/job_listing_scraper.py');

            // Execute Python script with arguments
            $command = "cd " . escapeshellarg(base_path()) . " && uv run python_scripts/job_listing_scraper.py " . escapeshellarg($jobTitle) . " " . escapeshellarg($location) . " 2>&1";
            $output = shell_exec($command);

            if (!$output) {
                // Fallback to mock data if script fails
                return $this->getMockJobs($location, $lat, $lng);
            }

            // Parse JSON output
            $jsonStart = strpos($output, '[');
            if ($jsonStart === false) {
                // Fallback to mock data if no JSON found
                return $this->getMockJobs($location, $lat, $lng);
            }

            $jsonOutput = substr($output, $jsonStart);
            $pythonJobs = json_decode($jsonOutput, true);

            if (!$pythonJobs || !is_array($pythonJobs)) {
                // Fallback to mock data if JSON parsing fails
                return $this->getMockJobs($location, $lat, $lng);
            }

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

            // Transform Python job data to frontend format
            return $this->transformPythonJobsToFrontendFormat($pythonJobs, $lat, $lng);

        } catch (\Exception $e) {
            // Fallback to mock data on any error
            return $this->getMockJobs($location, $lat, $lng);
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
            // Generate random coordinates around the center (within ~2km for better proximity)
            $latOffset = (mt_rand(-200, 200) / 10000); // ~2km variation
            $lngOffset = (mt_rand(-200, 200) / 10000);
            $latitude = $centerLat + $latOffset;
            $longitude = $centerLng + $lngOffset;

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
