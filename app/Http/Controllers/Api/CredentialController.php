<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Credential;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CredentialController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $credentials = Credential::where('user_id', Auth::id())
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
            'type' => 'required|in:work,certificate,project',
            'title' => 'required|string|max:255',
            'organization' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'required|string',
            'end_date' => 'nullable|string',
        ]);

        $credential = Credential::create([
            'user_id' => Auth::id(),
            ...$validated
        ]);

        return response()->json([
            'message' => 'Credential created successfully',
            'credential' => $credential
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $credential = Credential::where('user_id', Auth::id())
            ->findOrFail($id);

        return response()->json($credential);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $credential = Credential::where('user_id', Auth::id())
            ->findOrFail($id);

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
    public function destroy(string $id)
    {
        $credential = Credential::where('user_id', Auth::id())
            ->findOrFail($id);

        $credential->delete();

        return response()->json([
            'message' => 'Credential deleted successfully'
        ]);
    }
}
