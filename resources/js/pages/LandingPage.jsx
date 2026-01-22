import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AgentPromptBox from '../components/agent/AgentPromptBox';
import LoadingSequence from '../components/agent/LoadingSequence';
import { routeUserIntent, jobSearchAgent, trainingSearchAgent } from '../services/agentService';
import { getLatestProfile, updateProfileFromPrompt, getDefaultProfile } from '../services/userProfileService';

export default function LandingPage() {
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [agenticData, setAgenticData] = useState(null);
    const [error, setError] = useState(null);
    const [userProfile, setUserProfile] = useState(null);

    // Load user profile on mount
    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const profile = await getLatestProfile();
            if (profile) {
                setUserProfile(profile);
                console.log('✅ Loaded user profile:', profile);
            } else {
                const defaultProfile = getDefaultProfile();
                setUserProfile(defaultProfile);
                console.log('Using default profile:', defaultProfile);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            setUserProfile(getDefaultProfile());
        }
    };

    const handleManualSearch = () => {
        navigate('/map');
    };

    const handlePromptSubmit = async (prompt) => {
        setIsProcessing(true);
        setError(null);

        try {
            // Optional: Log to backend (don't fail if backend is down)
            try {
                await axios.post('/api/prompt-ai', {
                    user_id: 1,
                    prompt: prompt
                });
            } catch (backendErr) {
                console.warn('Backend logging failed, continuing with AI processing:', backendErr);
            }

            // Process with frontend AI agents (LangChain)
            console.log('Processing prompt with LangChain agents...');
            
            // Determine intent
            const intentResult = await routeUserIntent(prompt);
            console.log('Detected intent:', intentResult);

            let extractedData;
            let results = [];

            if (intentResult.intent === 'job') {
                // Extract job search parameters
                extractedData = await jobSearchAgent(prompt);
                console.log('Extracted job parameters:', extractedData);
                
                // Mock job results
                results = Array(5).fill(null).map((_, i) => ({
                    id: i + 1,
                    title: `${extractedData.query || 'Job'} Position ${i + 1}`,
                    company: `Company ${i + 1}`,
                    location: extractedData.location,
                    type: 'job'
                }));

                setAgenticData({
                    intent: 'job',
                    prompt: prompt,
                    extracted_skills: extractedData.skills || [],
                    results: results,
                    has_skill_gap: false,
                    skill_gaps: [],
                    match_percentage: 100
                });

                // Update user profile with extracted data
                try {
                    const updatedProfile = await updateProfileFromPrompt(extractedData, userProfile);
                    setUserProfile(updatedProfile);
                    console.log('✅ Profile updated:', updatedProfile);
                } catch (profileErr) {
                    console.warn('Failed to update profile:', profileErr);
                }

            } else {
                // Extract training search parameters
                extractedData = await trainingSearchAgent(prompt);
                console.log('Extracted training parameters:', extractedData);
                
                // Mock training results
                results = Array(5).fill(null).map((_, i) => ({
                    id: i + 1,
                    title: `${extractedData.topic || 'Training'} Workshop ${i + 1}`,
                    organizer: `Provider ${i + 1}`,
                    location: extractedData.location,
                    type: 'seminar'
                }));

                setAgenticData({
                    intent: 'seminar',
                    prompt: prompt,
                    extracted_skills: extractedData.topic ? [extractedData.topic] : [],
                    results: results,
                    has_skill_gap: false,
                    skill_gaps: [],
                    match_percentage: 100
                });

                // Update profile for training searches too
                try {
                    const updatedProfile = await updateProfileFromPrompt(
                        { skills: extractedData.topic ? [extractedData.topic] : [], location: extractedData.location },
                        userProfile
                    );
                    setUserProfile(updatedProfile);
                    console.log('✅ Profile updated:', updatedProfile);
                } catch (profileErr) {
                    console.warn('Failed to update profile:', profileErr);
                }
            }

        } catch (err) {
            console.error('AI processing error:', err);
            setError(err.message || 'Failed to process your request. Please try again.');
            setIsProcessing(false);

            setTimeout(() => {
                setError(null);
            }, 5000);
        }
    };

    const handleLoadingComplete = () => {
        // Navigate to map with the agentic workflow results
        navigate('/map', {
            state: {
                agenticData: agenticData,
                fromAgentic: true
            }
        });
    };

    // Show loading sequence when processing and data is ready
    if (isProcessing && agenticData) {
        return (
            <LoadingSequence
                agenticData={agenticData}
                onComplete={handleLoadingComplete}
            />
        );
    }

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header */}
            <header className="py-6 px-4">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <img src="/lookal_logo.png" alt="Lookal" className="h-12" />
                    
                    {/* Profile Indicator */}
                    {userProfile && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="text-sm">
                                <div className="font-medium text-gray-900">{userProfile.name}</div>
                                <div className="text-gray-500 text-xs">
                                    {Object.keys(userProfile.skills || {}).length} skills • {userProfile.location}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Error Banner */}
            {error && (
                <div className="max-w-2xl mx-auto w-full px-4 mb-4">
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3">
                        <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                            <p className="font-medium text-sm">Error</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center px-4 pb-12">
                <div className="w-full max-w-2xl">
                    {/* Hero Section */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6" style={{ backgroundColor: '#e8f5e9' }}>
                            <svg className="w-10 h-10" style={{ color: '#114124' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: '#181818' }}>
                            Tell me what you're looking for
                        </h2>
                        <p className="text-gray-600 max-w-md mx-auto">
                            Powered by AI agents, I'll understand your goals and find the perfect matches—jobs or trainings to level up your skills.
                        </p>

                        {/* AI Badge */}
                        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-full">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-medium text-blue-700">Powered by LangGraph AI</span>
                        </div>
                    </div>

                    {/* Agent Prompt Box */}
                    <AgentPromptBox onSubmit={handlePromptSubmit} />

                    {/* Divider */}
                    <div className="flex items-center my-8">
                        <div className="flex-1 border-t border-gray-300"></div>
                        <span className="px-4 text-sm text-gray-500">or</span>
                        <div className="flex-1 border-t border-gray-300"></div>
                    </div>

                    {/* Manual Search Button */}
                    <button
                        onClick={handleManualSearch}
                        className="w-full py-4 px-6 border-2 rounded-xl font-medium transition-all flex items-center justify-center gap-3"
                        style={{ borderColor: '#114124', color: '#114124' }}
                        onMouseEnter={(e) => { e.target.style.backgroundColor = '#e8f5e9'; }}
                        onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; }}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Manually Search for Jobs
                    </button>

                    {/* Example prompts */}
                    <div className="mt-8">
                        <p className="text-sm text-gray-500 text-center mb-3">Try saying something like:</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {[
                                "I want to work as a Full Stack Developer",
                                "I want to improve my React skills",
                                "Looking for UX Designer jobs in BGC",
                                "I want to learn Docker and Kubernetes"
                            ].map((example, i) => (
                                <span
                                    key={i}
                                    className="px-3 py-1.5 bg-gray-100 rounded-full text-xs text-gray-600 hover:bg-gray-200 cursor-pointer transition-colors"
                                    onClick={() => {
                                        const textarea = document.querySelector('textarea');
                                        if (textarea) {
                                            textarea.value = example;
                                            textarea.dispatchEvent(new Event('input', { bubbles: true }));
                                            textarea.focus();
                                        }
                                    }}
                                >
                                    "{example}"
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-4 text-center text-xs text-gray-400">
                Powered by LangChain + LangGraph AI • Lookal 2026
            </footer>
        </div>
    );
}
