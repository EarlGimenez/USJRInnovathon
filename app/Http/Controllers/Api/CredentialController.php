<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Credential;
use Illuminate\Http\Request;

class CredentialController extends Controller
{
    /**
     * Display a listing of the resource for a user.
     */
    public function index(string $userId)
    {
        $credentials = Credential::where('user_id', $userId)
            ->orderBy('start_date', 'desc')
            ->get();

        return response()->json($credentials);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|string',
            'type' => 'required|in:work,certificate,project',
            'title' => 'required|string|max:255',
            'organization' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'nullable|string',
            'end_date' => 'nullable|string',
        ]);

        $credential = Credential::create($validated);

        return response()->json([
            'message' => 'Credential created successfully',
            'credential' => $credential
        ], 201);
    }

    /**
     * Bulk store credentials for a user (used by resume parser)
     */
    public function bulkStore(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|string',
            'credentials' => 'required|array',
            'credentials.*.type' => 'required|in:work,certificate,project',
            'credentials.*.title' => 'required|string|max:255',
            'credentials.*.organization' => 'required|string|max:255',
            'credentials.*.description' => 'nullable|string',
            'credentials.*.startDate' => 'nullable|string',
            'credentials.*.endDate' => 'nullable|string',
            'replace' => 'boolean', // If true, delete existing credentials first
        ]);

        $userId = $validated['user_id'];
        
        // Optionally replace existing credentials
        if ($request->input('replace', false)) {
            Credential::where('user_id', $userId)->delete();
        }

        $created = [];
        foreach ($validated['credentials'] as $credData) {
            $credential = Credential::create([
                'user_id' => $userId,
                'type' => $credData['type'],
                'title' => $credData['title'],
                'organization' => $credData['organization'],
                'description' => $credData['description'] ?? null,
                'start_date' => $credData['startDate'] ?? null,
                'end_date' => $credData['endDate'] ?? null,
            ]);
            $created[] = $credential;
        }

        return response()->json([
            'message' => 'Credentials added successfully',
            'credentials' => $created,
            'count' => count($created)
        ], 201);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $credentialId)
    {
        $credential = Credential::findOrFail($credentialId);

        $validated = $request->validate([
            'type' => 'sometimes|in:work,certificate,project',
            'title' => 'sometimes|string|max:255',
            'organization' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'sometimes|string',
            'end_date' => 'nullable|string',
        ]);

        $credential->update($validated);

        return response()->json([
            'message' => 'Credential updated successfully',
            'credential' => $credential
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $credentialId)
    {
        $credential = Credential::findOrFail($credentialId);
        $credential->delete();

        return response()->json([
            'message' => 'Credential deleted successfully'
        ]);
    }
}
