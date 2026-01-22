<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;

/**
 * Course Scraper Service
 * 
 * Scrapes course data from Udemy and Coursera based on skill keywords
 * Uses Python scraper for accurate pricing or falls back to cached/randomized data
 * Returns top 5 courses for each skill
 */
class CourseScraperService
{
    // Cache duration: 6 hours (courses don't change often)
    protected int $cacheDuration = 21600;

    // Path to Python scraper script
    protected string $pythonScript;

    // Path to course cache directory
    protected string $cacheDir;

    public function __construct()
    {
        $this->pythonScript = base_path('python_scripts/course_scraper.py');
        $this->cacheDir = base_path('python_scripts/course_cache');
    }

    // Map internal skills to search-friendly keywords
    protected array $skillKeywordMap = [
        'Design' => ['UI UX design', 'graphic design', 'web design'],
        'Prototyping' => ['figma prototyping', 'wireframing', 'adobe xd'],
        'Tools' => ['git github', 'docker', 'AWS cloud'],
        'Research' => ['user research', 'data analysis', 'market research'],
        'Communication' => ['public speaking', 'technical writing', 'presentation skills'],
        'Programming' => ['python programming', 'javascript', 'web development'],
        'Data Analysis' => ['data analysis python', 'SQL database', 'tableau'],
        'Leadership' => ['project management', 'agile scrum', 'team leadership'],
    ];

    /**
     * Get recommended courses based on user's weak skills
     * 
     * @param array $userSkills User's current skill levels
     * @param int $limit Max courses to return
     * @return array
     */
    public function getRecommendedCourses(array $userSkills, int $limit = 5): array
    {
        // Find the weakest skills (below 50%)
        $weakSkills = [];
        foreach ($userSkills as $skill => $level) {
            if ($level < 50) {
                $weakSkills[$skill] = $level;
            }
        }

        // Sort by weakness (lowest first)
        asort($weakSkills);

        // Get top 2 weakest skills to search for
        $targetSkills = array_slice(array_keys($weakSkills), 0, 2);

        if (empty($targetSkills)) {
            // If no weak skills, use first skill
            $targetSkills = [array_key_first($userSkills)];
        }

        $courses = [];
        foreach ($targetSkills as $skill) {
            $skillCourses = $this->searchCourses($skill, 3);
            $courses = array_merge($courses, $skillCourses);
        }

        // Remove duplicates and limit
        $courses = collect($courses)->unique('title')->take($limit)->values()->all();

        return $courses;
    }

    /**
     * Search for courses by skill keyword
     * 
     * Priority: 
     * 1. Python scraper cache (pre-scraped data)
     * 2. Live Python scraper
     * 3. Randomized fallback with realistic data
     * 
     * @param string $skill Skill to search for
     * @param int $limit Max results per source
     * @return array
     */
    public function searchCourses(string $skill, int $limit = 5): array
    {
        $cacheKey = 'courses_' . md5($skill . '_' . $limit);

        return Cache::remember($cacheKey, $this->cacheDuration, function () use ($skill, $limit) {
            // First, try to load from Python cache
            $cachedCourses = $this->loadFromPythonCache($skill);
            if (!empty($cachedCourses)) {
                Log::info("Loaded courses from Python cache for: $skill");
                return array_slice($cachedCourses, 0, $limit);
            }

            // Try live Python scraper
            $scrapedCourses = $this->runPythonScraper($skill, $limit);
            if (!empty($scrapedCourses)) {
                Log::info("Scraped courses via Python for: $skill");
                return $scrapedCourses;
            }

            // Fall back to randomized realistic data
            Log::info("Using randomized fallback for: $skill");
            return $this->getRandomizedFallback($skill, $limit);
        });
    }

    /**
     * Load courses from Python scraper cache files
     */
    protected function loadFromPythonCache(string $skill): array
    {
        $cacheFile = $this->cacheDir . '/' . strtolower(str_replace(' ', '_', $skill)) . '.json';
        
        if (file_exists($cacheFile)) {
            try {
                $json = file_get_contents($cacheFile);
                $courses = json_decode($json, true);
                
                if (json_last_error() === JSON_ERROR_NONE && !empty($courses)) {
                    return $courses;
                }
            } catch (\Exception $e) {
                Log::warning("Failed to load Python cache: " . $e->getMessage());
            }
        }
        
        return [];
    }

    /**
     * Run Python scraper for live course data
     */
    protected function runPythonScraper(string $skill, int $limit = 5): array
    {
        if (!file_exists($this->pythonScript)) {
            Log::warning("Python scraper not found: " . $this->pythonScript);
            return [];
        }

        try {
            $keywords = $this->skillKeywordMap[$skill] ?? [$skill];
            $searchQuery = $keywords[0];

            $command = sprintf(
                'python "%s" "%s" --limit %d --provider all',
                $this->pythonScript,
                escapeshellarg($searchQuery),
                $limit
            );

            $result = Process::timeout(60)->run($command);

            if ($result->successful()) {
                $output = $result->output();
                $courses = json_decode($output, true);
                
                if (json_last_error() === JSON_ERROR_NONE && !empty($courses)) {
                    // Update skill field to match category
                    foreach ($courses as &$course) {
                        $course['skill'] = $skill;
                    }
                    return array_slice($courses, 0, $limit);
                }
            }

            Log::warning("Python scraper returned non-zero exit code", [
                'exitCode' => $result->exitCode(),
                'error' => $result->errorOutput()
            ]);

        } catch (\Exception $e) {
            Log::error("Python scraper execution failed: " . $e->getMessage());
        }

        return [];
    }

    /**
     * Get randomized fallback courses with realistic pricing
     * This ensures we always have data to display
     */
    protected function getRandomizedFallback(string $skill, int $limit = 5): array
    {
        // Course templates per skill category
        $courseTemplates = [
            'Design' => [
                ['title' => 'Complete Web & Mobile Designer: UI/UX, Figma + more', 'desc' => 'Master UI/UX design with Figma, create stunning interfaces'],
                ['title' => 'User Experience Design Essentials', 'desc' => 'Learn UX fundamentals and user-centered design'],
                ['title' => 'Graphic Design Masterclass', 'desc' => 'From beginner to advanced graphic design'],
                ['title' => 'Adobe Creative Suite Complete Course', 'desc' => 'Photoshop, Illustrator, InDesign mastery'],
                ['title' => 'Modern Web Design with Figma', 'desc' => 'Build beautiful responsive designs'],
                ['title' => 'UI Design Bootcamp', 'desc' => 'Create professional user interfaces'],
            ],
            'Prototyping' => [
                ['title' => 'Figma UI UX Design Essentials', 'desc' => 'Master Figma for modern design'],
                ['title' => 'Adobe XD - UI/UX Design', 'desc' => 'Complete guide to Adobe XD prototyping'],
                ['title' => 'Wireframing & Prototyping Fundamentals', 'desc' => 'From wireframes to high-fidelity prototypes'],
                ['title' => 'Interactive Prototyping with Figma', 'desc' => 'Create clickable prototypes'],
                ['title' => 'Rapid Prototyping for Designers', 'desc' => 'Speed up your design workflow'],
            ],
            'Programming' => [
                ['title' => 'Complete Python Developer', 'desc' => 'Zero to hero Python programming'],
                ['title' => 'The Complete JavaScript Course', 'desc' => 'Modern JavaScript from scratch'],
                ['title' => 'Full Stack Web Development', 'desc' => 'HTML, CSS, JavaScript, React, Node'],
                ['title' => 'React - The Complete Guide', 'desc' => 'Build powerful React applications'],
                ['title' => 'Python for Data Science', 'desc' => 'Learn Python for analytics and ML'],
                ['title' => 'Node.js - The Complete Guide', 'desc' => 'Build REST APIs with Node'],
            ],
            'Tools' => [
                ['title' => 'Git & GitHub Complete Guide', 'desc' => 'Version control mastery'],
                ['title' => 'Docker & Kubernetes Complete Guide', 'desc' => 'Container orchestration'],
                ['title' => 'AWS Certified Solutions Architect', 'desc' => 'Cloud architecture fundamentals'],
                ['title' => 'Linux Command Line Bootcamp', 'desc' => 'Master the terminal'],
                ['title' => 'DevOps Engineering Course', 'desc' => 'CI/CD and automation'],
            ],
            'Research' => [
                ['title' => 'User Research & Usability Testing', 'desc' => 'Learn research methodologies'],
                ['title' => 'Data Analysis with Python', 'desc' => 'Analyze data effectively'],
                ['title' => 'Google Analytics Certification', 'desc' => 'Master web analytics'],
                ['title' => 'Market Research Fundamentals', 'desc' => 'Understand your users'],
                ['title' => 'A/B Testing Masterclass', 'desc' => 'Data-driven decisions'],
            ],
            'Communication' => [
                ['title' => 'Public Speaking Mastery', 'desc' => 'Speak with confidence'],
                ['title' => 'Technical Writing Course', 'desc' => 'Write clear documentation'],
                ['title' => 'Business Communication Skills', 'desc' => 'Professional communication'],
                ['title' => 'Presentation Design & Delivery', 'desc' => 'Create impactful presentations'],
                ['title' => 'English for Business', 'desc' => 'Professional English skills'],
            ],
            'Data Analysis' => [
                ['title' => 'Data Analysis with Python & Pandas', 'desc' => 'Master data manipulation'],
                ['title' => 'SQL for Data Science', 'desc' => 'Database querying essentials'],
                ['title' => 'Tableau Desktop Specialist', 'desc' => 'Data visualization mastery'],
                ['title' => 'Excel for Business Analytics', 'desc' => 'Advanced Excel techniques'],
                ['title' => 'Machine Learning A-Z', 'desc' => 'ML algorithms and applications'],
            ],
            'Leadership' => [
                ['title' => 'Project Management Professional (PMP)', 'desc' => 'PM certification prep'],
                ['title' => 'Agile & Scrum Masterclass', 'desc' => 'Agile methodology mastery'],
                ['title' => 'Leadership & Management Skills', 'desc' => 'Develop leadership abilities'],
                ['title' => 'Team Building & Collaboration', 'desc' => 'Build high-performing teams'],
                ['title' => 'Strategic Planning Course', 'desc' => 'Business strategy fundamentals'],
            ],
        ];

        // Get templates for this skill or use Programming as default
        $templates = $courseTemplates[$skill] ?? $courseTemplates['Programming'];
        shuffle($templates);

        // PHP peso price options (common Udemy price points)
        $priceOptions = [449, 549, 649, 749, 899, 999, 1299, 1499];

        $courses = [];
        foreach (array_slice($templates, 0, $limit) as $index => $template) {
            // Randomize price
            $isFree = (rand(1, 10) === 1); // 10% chance of free
            $price = $isFree ? 'Free' : '₱' . $priceOptions[array_rand($priceOptions)];

            // Randomize rating between 4.2 and 4.9
            $rating = round(rand(42, 49) / 10, 1);

            // Randomize review count
            $reviews = rand(5000, 80000);

            // Alternate between Udemy and Coursera
            $provider = ($index % 2 === 0) ? 'Udemy' : 'Coursera';
            $providerLogo = $provider === 'Udemy' 
                ? 'https://www.udemy.com/staticx/udemy/images/v7/logo-udemy.svg'
                : 'https://d3njjcbhbojbot.cloudfront.net/web/images/favicons/favicon-v2-194x194.png';

            // URL goes directly to search page on provider
            $searchQuery = urlencode($skill);
            $url = $provider === 'Udemy'
                ? "https://www.udemy.com/courses/search/?q={$searchQuery}"
                : "https://www.coursera.org/search?query={$searchQuery}";

            $courses[] = [
                'id' => strtolower($provider) . '_' . rand(10000, 99999),
                'title' => $template['title'],
                'description' => $template['desc'],
                'provider' => $provider,
                'providerLogo' => $providerLogo,
                'url' => $url,
                'image' => null,
                'price' => $price,
                'isFree' => $isFree,
                'rating' => $rating,
                'reviews' => $reviews,
                'skill' => $skill,
                'type' => 'online',
            ];
        }

        return $courses;
    }

    /**
     * Get all available courses for a list of skills
     */
    public function getCoursesBySkills(array $skills, int $limitPerSkill = 2): array
    {
        $allCourses = [];

        foreach ($skills as $skill) {
            $courses = $this->searchCourses($skill, $limitPerSkill);
            $allCourses = array_merge($allCourses, $courses);
        }

        return collect($allCourses)->unique('title')->values()->all();
    }

    /**
     * Batch scrape all skill categories using Python script
     * Useful for pre-populating cache before deployment
     */
    public function batchScrapeAllSkills(): array
    {
        if (!file_exists($this->pythonScript)) {
            Log::warning("Python scraper not found for batch scrape");
            return ['error' => 'Python scraper not found'];
        }

        try {
            $command = sprintf('python "%s" --batch --limit 5', $this->pythonScript);
            $result = Process::timeout(300)->run($command);

            if ($result->successful()) {
                $output = $result->output();
                return json_decode($output, true) ?? ['error' => 'Invalid JSON output'];
            }

            return ['error' => $result->errorOutput()];

        } catch (\Exception $e) {
            Log::error("Batch scrape failed: " . $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Clear course cache to force re-scraping
     */
    public function clearCache(): void
    {
        // Clear Laravel cache for courses
        $skills = array_keys($this->skillKeywordMap);
        foreach ($skills as $skill) {
            for ($limit = 1; $limit <= 10; $limit++) {
                $cacheKey = 'courses_' . md5($skill . '_' . $limit);
                Cache::forget($cacheKey);
            }
        }
    }
}
