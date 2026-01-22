<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\AdzunaService;

class JobController extends Controller
{
    protected $adzunaService;

    // Skill mapping based on job categories
    protected $categorySkillMap = [
        'it-jobs' => ['Design' => 40, 'Prototyping' => 50, 'Tools' => 85, 'Research' => 45, 'Communication' => 55],
        'engineering-jobs' => ['Design' => 60, 'Prototyping' => 70, 'Tools' => 80, 'Research' => 65, 'Communication' => 50],
        'creative-design-jobs' => ['Design' => 90, 'Prototyping' => 75, 'Tools' => 70, 'Research' => 50, 'Communication' => 60],
        'marketing-jobs' => ['Design' => 55, 'Prototyping' => 35, 'Tools' => 50, 'Research' => 70, 'Communication' => 85],
        'sales-jobs' => ['Design' => 30, 'Prototyping' => 25, 'Tools' => 45, 'Research' => 55, 'Communication' => 90],
        'admin-jobs' => ['Design' => 35, 'Prototyping' => 30, 'Tools' => 60, 'Research' => 50, 'Communication' => 70],
        'default' => ['Design' => 50, 'Prototyping' => 50, 'Tools' => 50, 'Research' => 50, 'Communication' => 50],
    ];

    public function __construct(AdzunaService $adzunaService)
    {
        $this->adzunaService = $adzunaService;
    }

    /**
     * List jobs (from Adzuna API or mock data)
     */
    public function index(Request $request)
    {
        $query = $request->input('query', '');
        $lat = $request->input('lat', 10.3157); // Cebu City default
        $lng = $request->input('lng', 123.8854);

        try {
            // Try to fetch from Adzuna API
            $jobs = $this->adzunaService->searchJobs($query, $lat, $lng);
            
            // Map API response to our format with skill requirements
            $mappedJobs = collect($jobs)->map(function ($job) {
                return $this->mapJobToFormat($job);
            })->values()->all();

            return response()->json([
                'jobs' => $mappedJobs,
                'source' => 'adzuna'
            ]);
        } catch (\Exception $e) {
            // Fallback to mock data
            return response()->json([
                'jobs' => $this->getMockJobs(),
                'source' => 'mock',
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Get single job details
     */
    public function show(string $id)
    {
        try {
            $job = $this->adzunaService->getJob($id);
            
            if ($job) {
                return response()->json([
                    'job' => $this->mapJobToFormat($job, true)
                ]);
            }
        } catch (\Exception $e) {
            // Fallback to mock
        }

        // Return mock job
        $mockJobs = $this->getMockJobs();
        $job = collect($mockJobs)->firstWhere('id', (int)$id);

        if (!$job) {
            $job = $mockJobs[0] ?? null;
        }

        return response()->json([
            'job' => $job
        ]);
    }

    /**
     * Map Adzuna API response to our format
     */
    protected function mapJobToFormat(array $job, bool $detailed = false): array
    {
        $category = $job['category']['tag'] ?? 'default';
        $requiredSkills = $this->categorySkillMap[$category] ?? $this->categorySkillMap['default'];

        // Add some randomness to make it interesting
        foreach ($requiredSkills as $skill => $value) {
            $requiredSkills[$skill] = max(20, min(95, $value + rand(-15, 15)));
        }

        $mapped = [
            'id' => $job['id'] ?? uniqid(),
            'title' => $job['title'] ?? 'Unknown Position',
            'company' => $job['company']['display_name'] ?? 'Company',
            'location' => $job['location']['display_name'] ?? 'Cebu City',
            'latitude' => $job['latitude'] ?? 10.3157 + (rand(-100, 100) / 10000),
            'longitude' => $job['longitude'] ?? 123.8854 + (rand(-100, 100) / 10000),
            'salary' => isset($job['salary_min']) 
                ? '₱' . number_format($job['salary_min']) . ' - ₱' . number_format($job['salary_max'] ?? $job['salary_min'])
                : null,
            'type' => $job['contract_time'] ?? 'Full-time',
            'description' => $job['description'] ?? 'No description available.',
            'requiredSkills' => $requiredSkills,
            'category' => $job['category']['label'] ?? 'General',
            'created_at' => $job['created'] ?? now()->toIso8601String(),
            'redirect_url' => $job['redirect_url'] ?? null,
        ];

        if ($detailed) {
            $mapped['responsibilities'] = [
                'Perform job duties as outlined in the description',
                'Collaborate with team members and stakeholders',
                'Meet deadlines and quality standards',
                'Continuous learning and improvement',
                'Report to management on progress'
            ];
            $mapped['qualifications'] = [
                'Relevant experience in the field',
                'Strong communication skills',
                'Ability to work independently and in teams',
                'Problem-solving mindset',
                'Bachelor\'s degree or equivalent experience'
            ];
        }

        return $mapped;
    }

    /**
     * Mock job data for demo/fallback
     */
    protected function getMockJobs(): array
    {
        return [
            [
                'id' => 1,
                'title' => 'UX Designer',
                'company' => 'TechCorp Cebu',
                'location' => 'IT Park, Cebu City',
                'latitude' => 10.3301,
                'longitude' => 123.9056,
                'salary' => '₱35,000 - ₱50,000',
                'type' => 'Full-time',
                'description' => 'We are looking for a creative UX Designer to join our team. You will be responsible for creating intuitive user experiences for web and mobile applications.',
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
                'company' => 'WebStudio Inc.',
                'location' => 'Ayala Center, Cebu',
                'latitude' => 10.3181,
                'longitude' => 123.9050,
                'salary' => '₱40,000 - ₱60,000',
                'type' => 'Full-time',
                'description' => 'Seeking experienced frontend developer proficient in React to build modern web applications.',
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
                'company' => 'StartupHub',
                'location' => 'Mandaue City',
                'latitude' => 10.3236,
                'longitude' => 123.9223,
                'salary' => '₱50,000 - ₱80,000',
                'type' => 'Full-time',
                'description' => 'Lead product development and work with cross-functional teams to deliver amazing products.',
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
                    'Technical background preferred'
                ]
            ],
            [
                'id' => 4,
                'title' => 'Graphic Designer',
                'company' => 'Creative Agency',
                'location' => 'Lahug, Cebu City',
                'latitude' => 10.3256,
                'longitude' => 123.8892,
                'salary' => '₱25,000 - ₱35,000',
                'type' => 'Part-time',
                'description' => 'Create visual content for marketing campaigns and brand materials.',
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
                    'Proficiency in Adobe Creative Suite',
                    'Strong visual design skills',
                    'Attention to detail',
                    'Portfolio required'
                ]
            ],
            [
                'id' => 5,
                'title' => 'Junior Web Developer',
                'company' => 'Digital Solutions',
                'location' => 'Banilad, Cebu City',
                'latitude' => 10.3422,
                'longitude' => 123.9102,
                'salary' => '₱20,000 - ₱30,000',
                'type' => 'Full-time',
                'description' => 'Entry level position for web development. Great opportunity to learn and grow.',
                'requiredSkills' => ['Design' => 35, 'Prototyping' => 45, 'Tools' => 60, 'Research' => 35, 'Communication' => 45],
                'responsibilities' => [
                    'Assist in web development projects',
                    'Learn from senior developers',
                    'Write and test code',
                    'Fix bugs and issues',
                    'Document work processes'
                ],
                'qualifications' => [
                    'Fresh graduate or 0-1 year experience',
                    'Knowledge of HTML, CSS, JavaScript',
                    'Eager to learn new technologies',
                    'Good communication skills',
                    'Computer Science degree or bootcamp graduate'
                ]
            ]
        ];
    }
}
