<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\EventScraperService;
use Illuminate\Http\Request;

class EventController extends Controller
{
    protected EventScraperService $eventService;

    public function __construct(EventScraperService $eventService)
    {
        $this->eventService = $eventService;
    }

    /**
     * Get events near user's location
     */
    public function index(Request $request)
    {
        $latitude = $request->input('latitude', 10.3157); // Default: Cebu City
        $longitude = $request->input('longitude', 123.8854);
        $city = $request->input('city', 'Cebu');
        $limit = min($request->input('limit', 5), 10);
        $query = $request->input('query', '');

        $events = $this->eventService->getEventsNearLocation(
            (float) $latitude,
            (float) $longitude,
            $city,
            $limit
        );

        // Filter by search query if provided
        if ($query) {
            $events = array_filter($events, function ($event) use ($query) {
                $queryLower = strtolower($query);
                return str_contains(strtolower($event['title'] ?? ''), $queryLower) ||
                       str_contains(strtolower($event['description'] ?? ''), $queryLower) ||
                       str_contains(strtolower($event['organizer'] ?? ''), $queryLower);
            });
            $events = array_values($events);
        }

        return response()->json([
            'events' => $events,
            'location' => [
                'latitude' => $latitude,
                'longitude' => $longitude,
                'city' => $city
            ]
        ]);
    }

    /**
     * Get a single event by ID
     */
    public function show(Request $request, string $id)
    {
        $latitude = $request->input('latitude', 10.3157);
        $longitude = $request->input('longitude', 123.8854);
        $city = $request->input('city', 'Cebu');

        // Get all events and find the one with matching ID
        $events = $this->eventService->getEventsNearLocation(
            (float) $latitude,
            (float) $longitude,
            $city,
            20
        );

        $event = collect($events)->firstWhere('id', $id);

        if (!$event) {
            return response()->json([
                'error' => 'Event not found'
            ], 404);
        }

        return response()->json([
            'event' => $event
        ]);
    }

    /**
     * Get events filtered by skill
     */
    public function bySkill(Request $request, string $skill)
    {
        $latitude = $request->input('latitude', 10.3157);
        $longitude = $request->input('longitude', 123.8854);
        $city = $request->input('city', 'Cebu');
        $limit = min($request->input('limit', 5), 10);

        $events = $this->eventService->searchEventsBySkill(
            $skill,
            (float) $latitude,
            (float) $longitude,
            $city,
            $limit
        );

        return response()->json([
            'events' => $events,
            'skill' => $skill
        ]);
    }
}
