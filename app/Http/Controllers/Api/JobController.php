<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\CareerJetService;

class JobController extends Controller
{
    protected CareerJetService $careerJetService;

    // Maximum jobs to return (conserve API quota - limit to 5)
    protected int $maxResults = 5;

    public function __construct(CareerJetService $careerJetService)
    {
        $this->careerJetService = $careerJetService;
    }

    /**
     * List jobs from CareerJet API with caching, fallback to mock data
     */
    public function index(Request $request)
    {
        $query = $request->input('query') ?? '';
        $city = $request->input('city') ?? 'Taguig';
        $lat = (float) ($request->input('lat') ?? 14.5176); // Taguig default
        $lng = (float) ($request->input('lng') ?? 121.0509);

        try {
            // Try to fetch from CareerJet API (cached for 1 hour)
            $apiJobs = $this->careerJetService->searchJobs($query, $city, $this->maxResults);
            
            // Map API response to our app format
            $jobs = $this->careerJetService->mapJobsToAppFormat($apiJobs, $lat, $lng);

            return response()->json([
                'jobs' => $jobs,
                'source' => 'careerjet',
                'city' => $city,
                'cached' => true // Results are cached for 1 hour
            ]);

        } catch (\Exception $e) {
            // Fallback to mock data for demo
            $jobs = $this->getMockJobs($city, $lat, $lng);
            
            // Filter by query if provided
            if (!empty($query)) {
                $jobs = array_filter($jobs, function($job) use ($query) {
                    $queryLower = strtolower($query);
                    return str_contains(strtolower($job['title']), $queryLower) ||
                           str_contains(strtolower($job['company']), $queryLower) ||
                           str_contains(strtolower($job['description']), $queryLower);
                });
                $jobs = array_values($jobs);
            }

            // Limit to max results
            $jobs = array_slice($jobs, 0, $this->maxResults);

            return response()->json([
                'jobs' => $jobs,
                'source' => 'mock',
                'city' => $city,
                'fallback_reason' => $e->getMessage()
            ]);
        }
    }

    /**
     * Get single job details
     */
    public function show(string $id)
    {
        // Check if it's a CareerJet job ID
        if (str_starts_with($id, 'cj_')) {
            // For CareerJet jobs, we don't have a detail endpoint
            // Return the job from cache if available, or mock
        }

        // Return mock job
        $mockJobs = $this->getMockJobs();
        $job = collect($mockJobs)->firstWhere('id', (int)$id);

        if (!$job) {
            // Try to find by string ID
            $job = collect($mockJobs)->firstWhere('id', $id);
        }

        if (!$job) {
            $job = $mockJobs[0] ?? null;
        }

        return response()->json([
            'job' => $job
        ]);
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
