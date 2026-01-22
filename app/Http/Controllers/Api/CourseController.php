<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CourseScraperService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class CourseController extends Controller
{
    protected CourseScraperService $courseService;

    public function __construct(CourseScraperService $courseService)
    {
        $this->courseService = $courseService;
    }

    /**
     * Get courses based on user skills or search query
     */
    public function index(Request $request)
    {
        $query = $request->input('query', '');
        $skills = $request->input('skills', []); // User's skill levels
        $limit = min($request->input('limit', 5), 10);

        // If skills provided, get recommended courses based on weak skills
        if (!empty($skills) && is_array($skills)) {
            $courses = $this->courseService->getRecommendedCourses($skills, $limit);
            
            // Find weak skills for display
            $weakSkills = [];
            foreach ($skills as $skill => $level) {
                if ($level < 50) {
                    $weakSkills[$skill] = $level;
                }
            }
            asort($weakSkills);
            
            // If we got courses from weak skills, return them
            if (!empty($courses)) {
                return response()->json([
                    'courses' => $courses,
                    'weakSkills' => array_keys(array_slice($weakSkills, 0, 3, true)),
                    'type' => 'recommended',
                    'message' => 'Courses recommended based on your skill gaps'
                ]);
            }
            
            // If no weak skills or no courses found, fall through to query-based search
        }

        // If query provided, search for specific courses
        if ($query) {
            // Try to map query to a skill category
            $skill = $this->mapQueryToSkill($query);
            $courses = $this->courseService->searchCourses($skill ?: $query, $limit);
            
            return response()->json([
                'courses' => $courses,
                'type' => 'search',
                'query' => $query
            ]);
        }

        // Default: return popular courses for common skills
        $defaultSkills = ['Design', 'Programming', 'Communication'];
        $courses = $this->courseService->getCoursesBySkills($defaultSkills, 2);

        return response()->json([
            'courses' => array_slice($courses, 0, $limit),
            'type' => 'popular'
        ]);
    }

    /**
     * Map search query to a skill category
     */
    protected function mapQueryToSkill(string $query): ?string
    {
        $queryLower = strtolower($query);
        
        $mappings = [
            'design' => 'Design',
            'ui' => 'Design',
            'ux' => 'Design',
            'graphic' => 'Design',
            'figma' => 'Prototyping',
            'prototype' => 'Prototyping',
            'wireframe' => 'Prototyping',
            'code' => 'Programming',
            'programming' => 'Programming',
            'developer' => 'Programming',
            'javascript' => 'Programming',
            'python' => 'Programming',
            'data' => 'Data Analysis',
            'analytics' => 'Data Analysis',
            'sql' => 'Data Analysis',
            'excel' => 'Data Analysis',
            'communication' => 'Communication',
            'speaking' => 'Communication',
            'writing' => 'Communication',
            'leadership' => 'Leadership',
            'management' => 'Leadership',
            'agile' => 'Leadership',
            'scrum' => 'Leadership',
            'research' => 'Research',
            'user research' => 'Research',
            'git' => 'Tools',
            'docker' => 'Tools',
            'aws' => 'Tools',
            'cloud' => 'Tools',
        ];

        foreach ($mappings as $keyword => $skill) {
            if (str_contains($queryLower, $keyword)) {
                return $skill;
            }
        }

        return null;
    }

    /**
     * Get courses for a specific skill
     */
    public function bySkill(Request $request, string $skill)
    {
        $limit = min($request->input('limit', 5), 10);
        
        $courses = $this->courseService->searchCourses($skill, $limit);

        return response()->json([
            'courses' => $courses,
            'skill' => $skill
        ]);
    }

    /**
     * Get recommended courses based on user's weak skills
     */
    public function recommended(Request $request)
    {
        $skills = $request->input('skills', []);
        $limit = min($request->input('limit', 5), 10);

        if (empty($skills)) {
            // Try to get from session
            $sessionId = $request->input('sessionId');
            if ($sessionId) {
                $sessionData = Cache::get($sessionId);
                $skills = $sessionData['skills'] ?? [];
            }
        }

        if (empty($skills)) {
            return response()->json([
                'courses' => [],
                'error' => 'No skills provided'
            ], 400);
        }

        $courses = $this->courseService->getRecommendedCourses($skills, $limit);

        // Find which skills are weak
        $weakSkills = [];
        foreach ($skills as $skill => $level) {
            if ($level < 50) {
                $weakSkills[$skill] = $level;
            }
        }
        asort($weakSkills);

        return response()->json([
            'courses' => $courses,
            'weakSkills' => array_keys(array_slice($weakSkills, 0, 3, true)),
            'message' => 'Courses to help improve your weaker skills'
        ]);
    }
}
