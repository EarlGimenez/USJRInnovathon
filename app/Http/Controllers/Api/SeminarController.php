<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class SeminarController extends Controller
{
    /**
     * List all seminars
     */
    public function index(Request $request)
    {
        $query = $request->input('query', '');

        $seminars = $this->getMockSeminars();

        // Simple search filter
        if ($query) {
            $seminars = collect($seminars)->filter(function ($seminar) use ($query) {
                return str_contains(strtolower($seminar['title']), strtolower($query)) ||
                       str_contains(strtolower($seminar['organizer']), strtolower($query)) ||
                       str_contains(strtolower($seminar['description']), strtolower($query));
            })->values()->all();
        }

        return response()->json([
            'seminars' => $seminars
        ]);
    }

    /**
     * Get single seminar details
     */
    public function show(string $id)
    {
        $seminars = $this->getMockSeminars();
        $seminar = collect($seminars)->firstWhere('id', (int)$id);

        if (!$seminar) {
            return response()->json([
                'error' => 'Seminar not found'
            ], 404);
        }

        return response()->json([
            'seminar' => $seminar
        ]);
    }

    /**
     * Register for a seminar
     */
    public function register(Request $request, string $id)
    {
        $validated = $request->validate([
            'sessionId' => 'required|string'
        ]);

        $sessionId = $validated['sessionId'];
        $sessionData = Cache::get($sessionId);

        if (!$sessionData) {
            return response()->json([
                'error' => 'Session not found'
            ], 404);
        }

        // Add seminar to registered list
        $sessionData['registered_seminars'] = $sessionData['registered_seminars'] ?? [];
        if (!in_array($id, $sessionData['registered_seminars'])) {
            $sessionData['registered_seminars'][] = $id;
        }

        Cache::put($sessionId, $sessionData, now()->addHours(24));

        return response()->json([
            'success' => true,
            'message' => 'Successfully registered for seminar'
        ]);
    }

    /**
     * Verify seminar attendance via QR code
     */
    public function verify(Request $request, string $id)
    {
        $validated = $request->validate([
            'qrCode' => 'required|string',
            'sessionId' => 'required|string'
        ]);

        $sessionId = $validated['sessionId'];
        $qrCode = $validated['qrCode'];

        // Get seminar data
        $seminars = $this->getMockSeminars();
        $seminar = collect($seminars)->firstWhere('id', (int)$id);

        if (!$seminar) {
            return response()->json([
                'error' => 'Seminar not found'
            ], 404);
        }

        // Verify QR code (for demo, accept any code or specific patterns)
        $validCodes = [
            'DEMO_QR_CODE',
            'VERIFY_' . $id,
            $seminar['qr_code'] ?? 'SEMINAR_' . $id
        ];

        if (!in_array($qrCode, $validCodes) && !str_starts_with($qrCode, 'DEMO')) {
            return response()->json([
                'success' => false,
                'error' => 'Invalid QR code'
            ], 400);
        }

        // Get session and update skills
        $sessionData = Cache::get($sessionId);
        
        if ($sessionData) {
            // Mark as attended
            $sessionData['seminars_attended'] = $sessionData['seminars_attended'] ?? [];
            if (!in_array($id, $sessionData['seminars_attended'])) {
                $sessionData['seminars_attended'][] = $id;
            }

            // Update skills based on seminar
            $skillBoosts = $seminar['skillBoosts'] ?? [];
            foreach ($skillBoosts as $skill => $boost) {
                $currentValue = $sessionData['skills'][$skill] ?? 0;
                $sessionData['skills'][$skill] = min(100, $currentValue + $boost);
            }

            Cache::put($sessionId, $sessionData, now()->addHours(24));

            return response()->json([
                'success' => true,
                'message' => 'Attendance verified successfully',
                'skillBoosts' => $skillBoosts,
                'updatedSkills' => $sessionData['skills']
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Attendance verified (session not found, skills not updated)',
            'skillBoosts' => $seminar['skillBoosts'] ?? []
        ]);
    }

    /**
     * Mock seminar data - Taguig/BGC locations
     */
    protected function getMockSeminars(): array
    {
        return [
            [
                'id' => 1,
                'title' => 'Tech Workshop: Modern Web Development',
                'organizer' => 'Google Developer Groups Philippines',
                'location' => 'Mind Museum, BGC',
                'latitude' => 14.5518,
                'longitude' => 121.0465,
                'date' => 'February 15, 2026',
                'time' => '9:00 AM - 5:00 PM',
                'description' => 'A comprehensive hands-on workshop covering the latest web technologies including React, Node.js, and cloud services. Perfect for developers looking to upgrade their skills. Includes certificate of completion.',
                'skillBoosts' => ['Tools' => 15, 'Prototyping' => 10],
                'attendees' => 45,
                'maxAttendees' => 100,
                'qr_code' => 'SEMINAR_1_VERIFY'
            ],
            [
                'id' => 2,
                'title' => 'Career Fair BGC 2026',
                'organizer' => 'JobStreet Philippines',
                'location' => 'SMX Convention Center, SM Aura',
                'latitude' => 14.5449,
                'longitude' => 121.0546,
                'date' => 'January 25, 2026',
                'time' => '10:00 AM - 6:00 PM',
                'description' => 'Connect with top employers in Metro Manila and learn about job opportunities in tech, finance, and BPO. Network with professionals, attend mini workshops, and get your resume reviewed by HR experts.',
                'skillBoosts' => ['Communication' => 10, 'Research' => 8],
                'attendees' => 230,
                'maxAttendees' => 500,
                'qr_code' => 'SEMINAR_2_VERIFY'
            ],
            [
                'id' => 3,
                'title' => 'Design Thinking Workshop',
                'organizer' => 'UXPH (UX Philippines)',
                'location' => 'WeWork, High Street South',
                'latitude' => 14.5503,
                'longitude' => 121.0451,
                'date' => 'February 8, 2026',
                'time' => '1:00 PM - 5:00 PM',
                'description' => 'Learn design thinking methodologies used by top companies. This hands-on workshop will teach you how to solve complex problems through empathy, ideation, and prototyping.',
                'skillBoosts' => ['Design' => 12, 'Research' => 10, 'Prototyping' => 8],
                'attendees' => 28,
                'maxAttendees' => 50,
                'qr_code' => 'SEMINAR_3_VERIFY'
            ],
            [
                'id' => 4,
                'title' => 'Professional Communication Masterclass',
                'organizer' => 'Toastmasters BGC',
                'location' => 'Shangri-La at The Fort, BGC',
                'latitude' => 14.5535,
                'longitude' => 121.0489,
                'date' => 'February 22, 2026',
                'time' => '2:00 PM - 6:00 PM',
                'description' => 'Enhance your professional communication skills for the workplace. Learn effective presentation techniques, email etiquette, and how to communicate with confidence in any situation.',
                'skillBoosts' => ['Communication' => 15],
                'attendees' => 55,
                'maxAttendees' => 80,
                'qr_code' => 'SEMINAR_4_VERIFY'
            ],
            [
                'id' => 5,
                'title' => 'Figma & Prototyping Bootcamp',
                'organizer' => 'Canva Philippines',
                'location' => 'Globe Tower, BGC',
                'latitude' => 14.5547,
                'longitude' => 121.0462,
                'date' => 'March 10, 2026',
                'time' => '9:00 AM - 4:00 PM',
                'description' => 'Intensive one-day bootcamp on Figma and prototyping. Learn to create interactive prototypes, design systems, and collaborate effectively with developers.',
                'skillBoosts' => ['Prototyping' => 18, 'Tools' => 12, 'Design' => 8],
                'attendees' => 15,
                'maxAttendees' => 30,
                'qr_code' => 'SEMINAR_5_VERIFY'
            ]
        ];
    }
}
