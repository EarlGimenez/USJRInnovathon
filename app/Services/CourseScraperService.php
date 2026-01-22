<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Course Scraper Service
 * 
 * Scrapes course data from Udemy and Coursera based on skill keywords
 * Returns top 5 courses for each skill
 */
class CourseScraperService
{
    // Cache duration: 6 hours (courses don't change often)
    protected int $cacheDuration = 21600;

    // Map internal skills to search-friendly keywords
    protected array $skillKeywordMap = [
        'Design' => ['UI UX design', 'graphic design', 'web design'],
        'Prototyping' => ['figma', 'prototyping', 'wireframing'],
        'Tools' => ['software tools', 'productivity tools', 'developer tools'],
        'Research' => ['user research', 'market research', 'data analysis'],
        'Communication' => ['communication skills', 'public speaking', 'business communication'],
        'Programming' => ['programming', 'coding', 'software development'],
        'Data Analysis' => ['data analysis', 'excel', 'data visualization'],
        'Leadership' => ['leadership', 'management', 'team leadership'],
        'Marketing' => ['digital marketing', 'social media marketing', 'marketing'],
        'Project Management' => ['project management', 'agile', 'scrum'],
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
     * @param string $skill Skill to search for
     * @param int $limit Max results per source
     * @return array
     */
    public function searchCourses(string $skill, int $limit = 5): array
    {
        $cacheKey = 'courses_' . md5($skill . '_' . $limit);

        return Cache::remember($cacheKey, $this->cacheDuration, function () use ($skill, $limit) {
            $courses = [];

            // Get search keywords for this skill
            $keywords = $this->skillKeywordMap[$skill] ?? [$skill];
            $searchQuery = $keywords[0]; // Use primary keyword

            // Scrape from Udemy
            $udemyCourses = $this->scrapeUdemy($searchQuery, $limit);
            $courses = array_merge($courses, $udemyCourses);

            // Scrape from Coursera
            $courseraCourses = $this->scrapeCoursera($searchQuery, $limit);
            $courses = array_merge($courses, $courseraCourses);

            // Shuffle and limit to get mix of both
            shuffle($courses);
            return array_slice($courses, 0, $limit);
        });
    }

    /**
     * Scrape Udemy courses
     * Uses Udemy's public search page
     * 
     * @param string $query Search query
     * @param int $limit Max results
     * @return array
     */
    protected function scrapeUdemy(string $query, int $limit = 5): array
    {
        try {
            $searchUrl = 'https://www.udemy.com/api-2.0/courses/';
            
            // Udemy has a public API endpoint that doesn't require auth for basic search
            $response = Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept' => 'application/json',
            ])->get($searchUrl, [
                'search' => $query,
                'page_size' => $limit,
                'ordering' => 'relevance',
                'ratings' => '4.0',
                'fields[course]' => 'title,headline,url,price,image_240x135,avg_rating,num_reviews,is_paid',
            ]);

            if (!$response->successful()) {
                Log::warning('Udemy scrape failed', ['status' => $response->status()]);
                return $this->getUdemyFallback($query, $limit);
            }

            $data = $response->json();
            $courses = [];

            foreach ($data['results'] ?? [] as $course) {
                $courses[] = [
                    'id' => 'udemy_' . ($course['id'] ?? uniqid()),
                    'title' => $course['title'] ?? 'Udemy Course',
                    'description' => $course['headline'] ?? '',
                    'provider' => 'Udemy',
                    'providerLogo' => 'https://www.udemy.com/staticx/udemy/images/v7/logo-udemy.svg',
                    'url' => 'https://www.udemy.com' . ($course['url'] ?? ''),
                    'image' => $course['image_240x135'] ?? null,
                    'price' => $course['is_paid'] ? ($course['price'] ?? 'Paid') : 'Free',
                    'isFree' => !($course['is_paid'] ?? true),
                    'rating' => round($course['avg_rating'] ?? 4.0, 1),
                    'reviews' => $course['num_reviews'] ?? 0,
                    'skill' => $query,
                    'type' => 'online',
                ];
            }

            return array_slice($courses, 0, $limit);

        } catch (\Exception $e) {
            Log::error('Udemy scrape error', ['error' => $e->getMessage()]);
            return $this->getUdemyFallback($query, $limit);
        }
    }

    /**
     * Scrape Coursera courses
     * 
     * @param string $query Search query
     * @param int $limit Max results
     * @return array
     */
    protected function scrapeCoursera(string $query, int $limit = 5): array
    {
        try {
            // Coursera has a public search API
            $searchUrl = 'https://www.coursera.org/api/search/v1';
            
            $response = Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept' => 'application/json',
            ])->get($searchUrl, [
                'query' => $query,
                'limit' => $limit,
                'index' => 'prod_all_launched_products_term_optimization',
            ]);

            if (!$response->successful()) {
                Log::warning('Coursera scrape failed', ['status' => $response->status()]);
                return $this->getCourseraFallback($query, $limit);
            }

            $data = $response->json();
            $courses = [];

            foreach ($data['hits'] ?? [] as $hit) {
                $courses[] = [
                    'id' => 'coursera_' . ($hit['objectID'] ?? uniqid()),
                    'title' => $hit['name'] ?? 'Coursera Course',
                    'description' => $hit['description'] ?? $hit['tagline'] ?? '',
                    'provider' => 'Coursera',
                    'providerLogo' => 'https://d3njjcbhbojbot.cloudfront.net/api/utilities/v1/imageproxy/https://coursera.s3.amazonaws.com/media/coursera-logo-square.png',
                    'url' => 'https://www.coursera.org/' . ($hit['objectUrl'] ?? 'search?query=' . urlencode($query)),
                    'image' => $hit['imageUrl'] ?? null,
                    'price' => isset($hit['isFreemium']) && $hit['isFreemium'] ? 'Free to audit' : 'Subscription',
                    'isFree' => $hit['isFreemium'] ?? false,
                    'rating' => round($hit['avgProductRating'] ?? 4.5, 1),
                    'reviews' => $hit['numProductRatings'] ?? 0,
                    'skill' => $query,
                    'type' => 'online',
                    'partner' => $hit['partners'][0]['name'] ?? 'Various',
                ];
            }

            return array_slice($courses, 0, $limit);

        } catch (\Exception $e) {
            Log::error('Coursera scrape error', ['error' => $e->getMessage()]);
            return $this->getCourseraFallback($query, $limit);
        }
    }

    /**
     * Fallback Udemy courses when scraping fails
     */
    protected function getUdemyFallback(string $query, int $limit): array
    {
        $fallbackCourses = [
            'UI UX design' => [
                ['title' => 'Complete Web & Mobile Designer: UI/UX, Figma + more', 'price' => '₱549', 'rating' => 4.7, 'reviews' => 45000],
                ['title' => 'User Experience Design Essentials', 'price' => '₱449', 'rating' => 4.6, 'reviews' => 32000],
                ['title' => 'UI Design Bootcamp: Master Typography & Color', 'price' => '₱399', 'rating' => 4.5, 'reviews' => 18000],
            ],
            'figma' => [
                ['title' => 'Figma UI UX Design Essentials', 'price' => '₱549', 'rating' => 4.8, 'reviews' => 28000],
                ['title' => 'Learn Figma: User Interface Design Basics', 'price' => 'Free', 'rating' => 4.5, 'reviews' => 12000],
                ['title' => 'Figma for Beginners: Design Your First App', 'price' => '₱449', 'rating' => 4.6, 'reviews' => 8500],
            ],
            'programming' => [
                ['title' => '100 Days of Code: Python Bootcamp', 'price' => '₱549', 'rating' => 4.7, 'reviews' => 250000],
                ['title' => 'The Complete JavaScript Course 2026', 'price' => '₱549', 'rating' => 4.7, 'reviews' => 180000],
                ['title' => 'Web Development Bootcamp', 'price' => '₱549', 'rating' => 4.7, 'reviews' => 320000],
            ],
            'communication skills' => [
                ['title' => 'Communication Skills for Beginners', 'price' => 'Free', 'rating' => 4.4, 'reviews' => 15000],
                ['title' => 'Effective Business Communication', 'price' => '₱399', 'rating' => 4.5, 'reviews' => 22000],
                ['title' => 'Public Speaking Masterclass', 'price' => '₱449', 'rating' => 4.6, 'reviews' => 35000],
            ],
            'data analysis' => [
                ['title' => 'Data Analysis with Excel & Python', 'price' => '₱549', 'rating' => 4.6, 'reviews' => 45000],
                ['title' => 'SQL for Data Analysis', 'price' => '₱449', 'rating' => 4.7, 'reviews' => 38000],
                ['title' => 'Statistics for Data Science', 'price' => '₱399', 'rating' => 4.5, 'reviews' => 28000],
            ],
        ];

        // Find best matching fallback
        $queryLower = strtolower($query);
        $courses = [];

        foreach ($fallbackCourses as $key => $items) {
            if (str_contains($queryLower, strtolower($key)) || str_contains(strtolower($key), $queryLower)) {
                $courses = $items;
                break;
            }
        }

        // Default fallback
        if (empty($courses)) {
            $courses = [
                ['title' => "Complete $query Masterclass 2026", 'price' => '₱549', 'rating' => 4.6, 'reviews' => 15000],
                ['title' => "$query for Beginners", 'price' => '₱399', 'rating' => 4.5, 'reviews' => 8000],
                ['title' => "Advanced $query Certification", 'price' => '₱649', 'rating' => 4.7, 'reviews' => 5000],
            ];
        }

        return array_slice(array_map(function ($course, $index) use ($query) {
            return [
                'id' => 'udemy_fallback_' . $index,
                'title' => $course['title'],
                'description' => "Learn $query with this comprehensive course",
                'provider' => 'Udemy',
                'providerLogo' => 'https://www.udemy.com/staticx/udemy/images/v7/logo-udemy.svg',
                'url' => 'https://www.udemy.com/courses/search/?q=' . urlencode($query),
                'image' => null,
                'price' => $course['price'],
                'isFree' => $course['price'] === 'Free',
                'rating' => $course['rating'],
                'reviews' => $course['reviews'],
                'skill' => $query,
                'type' => 'online',
            ];
        }, $courses, array_keys($courses)), 0, $limit);
    }

    /**
     * Fallback Coursera courses when scraping fails
     */
    protected function getCourseraFallback(string $query, int $limit): array
    {
        $fallbackCourses = [
            'UI UX design' => [
                ['title' => 'Google UX Design Professional Certificate', 'partner' => 'Google', 'price' => 'Free to audit', 'rating' => 4.8],
                ['title' => 'UI/UX Design Specialization', 'partner' => 'CalArts', 'price' => 'Subscription', 'rating' => 4.6],
            ],
            'programming' => [
                ['title' => 'Google IT Automation with Python', 'partner' => 'Google', 'price' => 'Free to audit', 'rating' => 4.8],
                ['title' => 'IBM Full Stack Software Developer', 'partner' => 'IBM', 'price' => 'Free to audit', 'rating' => 4.6],
            ],
            'data analysis' => [
                ['title' => 'Google Data Analytics Certificate', 'partner' => 'Google', 'price' => 'Free to audit', 'rating' => 4.8],
                ['title' => 'IBM Data Science Professional', 'partner' => 'IBM', 'price' => 'Free to audit', 'rating' => 4.6],
            ],
            'communication skills' => [
                ['title' => 'Improving Communication Skills', 'partner' => 'University of Pennsylvania', 'price' => 'Free to audit', 'rating' => 4.7],
                ['title' => 'Business Communication', 'partner' => 'University of Colorado', 'price' => 'Free to audit', 'rating' => 4.5],
            ],
            'leadership' => [
                ['title' => 'Organizational Leadership Specialization', 'partner' => 'Northwestern', 'price' => 'Subscription', 'rating' => 4.7],
                ['title' => 'Leading People and Teams', 'partner' => 'University of Michigan', 'price' => 'Free to audit', 'rating' => 4.8],
            ],
        ];

        // Find best matching fallback
        $queryLower = strtolower($query);
        $courses = [];

        foreach ($fallbackCourses as $key => $items) {
            if (str_contains($queryLower, strtolower($key)) || str_contains(strtolower($key), $queryLower)) {
                $courses = $items;
                break;
            }
        }

        // Default fallback
        if (empty($courses)) {
            $courses = [
                ['title' => "$query Fundamentals", 'partner' => 'Leading University', 'price' => 'Free to audit', 'rating' => 4.5],
                ['title' => "$query Professional Certificate", 'partner' => 'Industry Partner', 'price' => 'Subscription', 'rating' => 4.6],
            ];
        }

        return array_slice(array_map(function ($course, $index) use ($query) {
            return [
                'id' => 'coursera_fallback_' . $index,
                'title' => $course['title'],
                'description' => "Professional certificate program in $query",
                'provider' => 'Coursera',
                'providerLogo' => 'https://d3njjcbhbojbot.cloudfront.net/api/utilities/v1/imageproxy/https://coursera.s3.amazonaws.com/media/coursera-logo-square.png',
                'url' => 'https://www.coursera.org/search?query=' . urlencode($query),
                'image' => null,
                'price' => $course['price'],
                'isFree' => str_contains($course['price'], 'Free'),
                'rating' => $course['rating'],
                'reviews' => rand(5000, 50000),
                'skill' => $query,
                'type' => 'online',
                'partner' => $course['partner'],
            ];
        }, $courses, array_keys($courses)), 0, $limit);
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
}
