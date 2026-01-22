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

    const extractTitleKeywords = (text) => {
        const raw = String(text || '')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const stop = new Set([
            'i','im','me','my','we','our','you','your','they','them','the','a','an','and','or','to','for','of','in','on',
            'with','at','from','by','about','please','find','look','looking','want','need','show','give','me','courses',
            'course','seminar','seminars','training','trainings','workshop','workshops','tutorial','tutorials','teach',
            'teaching','class','classes','program','programs','online','in','person','inperson','hybrid'
        ]);

        return raw
            .split(' ')
            .map((w) => w.trim())
            .filter((w) => w.length >= 3 && !stop.has(w))
            .slice(0, 8);
    };

    const titleMatchesKeywords = (title, keywords) => {
        const t = String(title || '').toLowerCase();
        if (!keywords || keywords.length === 0) return true;
        return keywords.some((k) => t.includes(k));
    };

    const getLatLngForCity = (city) => {
        const c = String(city || '').toLowerCase();
        if (c.includes('cebu')) return { lat: 10.3157, lng: 123.8854 };
        if (c.includes('manila')) return { lat: 14.5995, lng: 120.9842 };
        if (c.includes('taguig') || c.includes('bgc')) return { lat: 14.5176, lng: 121.0509 };
        return null;
    };

    const toCandidateSkillEntries = (skills) => {
        if (!skills) return [];

        // Accept: string[], { skillName: score }, or [{ skill, credential_count, experience_count }]
        if (Array.isArray(skills)) {
            const out = [];
            for (const entry of skills) {
                if (typeof entry === 'string') {
                    const s = entry.trim();
                    if (!s) continue;
                    out.push({ skill: s, credential_count: 0, experience_count: 1 });
                    continue;
                }
                if (entry && typeof entry === 'object' && typeof entry.skill === 'string') {
                    const s = entry.skill.trim();
                    if (!s) continue;
                    out.push({
                        skill: s,
                        credential_count: Number.isFinite(entry.credential_count) ? entry.credential_count : 0,
                        experience_count: Number.isFinite(entry.experience_count) ? entry.experience_count : 1,
                    });
                }
            }

            // Deduplicate by normalized skill name
            const seen = new Set();
            const uniq = [];
            for (const e of out) {
                const k = String(e.skill || '').toLowerCase().trim();
                if (!k || seen.has(k)) continue;
                seen.add(k);
                uniq.push(e);
            }
            return uniq.slice(0, 16);
        }

        if (skills && typeof skills === 'object') {
            const entries = [];
            for (const [k, v] of Object.entries(skills)) {
                const s = String(k || '').trim();
                if (!s) continue;
                // If there's a score/proficiency present, treat it as "experience" evidence.
                const n = Number(v);
                entries.push({
                    skill: s,
                    credential_count: 0,
                    experience_count: Number.isFinite(n) ? Math.max(1, Math.round(n / 30)) : 1,
                });
            }
            return entries.slice(0, 16);
        }

        return [];
    };

    const computeSkillGapFromJobs = (jobsList) => {
        const jobs = Array.isArray(jobsList) ? jobsList : [];
        const scores = jobs
            .map((j) => Number(j?.match?.score))
            .filter((n) => Number.isFinite(n));

        const average = scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : 0;

        // Prefer missing_skills from the match result if available.
        // Aggregate from top jobs to recommend the most common gaps.
        const sorted = [...jobs].sort((a, b) => {
            const sa = Number(a?.match?.score);
            const sb = Number(b?.match?.score);
            if (!Number.isFinite(sa) && !Number.isFinite(sb)) return 0;
            if (!Number.isFinite(sa)) return 1;
            if (!Number.isFinite(sb)) return -1;
            return sb - sa;
        });

        const counts = new Map();
        for (const j of sorted.slice(0, 5)) {
            const missing = Array.isArray(j?.match?.missing_skills) ? j.match.missing_skills : [];
            for (const s of missing) {
                const key = String(s || '').trim();
                if (!key) continue;
                counts.set(key, (counts.get(key) || 0) + 1);
            }
        }

        const skillGaps = [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([skill]) => skill)
            .slice(0, 8);

        return {
            average_match_score: Math.round(average * 10) / 10,
            skill_gaps: skillGaps,
        };
    };

    const fetchRelevantJobs = async ({ query, city, candidateSkills, similarityThreshold }) => {
        try {
            const coords = getLatLngForCity(city);
            const res = await axios.get('/api/jobs', {
                params: {
                    query: query || '',
                    city: city || 'Cebu',
                    ...(coords ? coords : {}),
                    ...(Array.isArray(candidateSkills) && candidateSkills.length > 0
                        ? { candidate_skills: candidateSkills }
                        : {}),
                    ...(typeof similarityThreshold === 'number'
                        ? { similarity_threshold: similarityThreshold }
                        : {}),
                },
            });
            return res.data?.jobs || [];
        } catch (err) {
            console.warn('Job listings fetch failed, using mock jobs:', err);
            // Minimal mock fallback that still reflects the prompt/query
            return Array(5).fill(null).map((_, i) => ({
                id: i + 1,
                title: `${query || 'Job'} Position ${i + 1}`,
                company: `Company ${i + 1}`,
                location: city || 'Cebu',
                type: 'job',
                isMockData: true,
            }));
        }
    };

    const fetchRelevantTrainings = async ({ query, city, keywords }) => {
        let eventsList = [];
        let coursesList = [];
        try {
            const [eventsRes, coursesRes] = await Promise.all([
                axios.get('/api/events', {
                    params: {
                        query: query,
                        city: city || 'Cebu',
                        limit: 25,
                    },
                }),
                axios.get('/api/courses', {
                    params: {
                        query: query,
                        limit: 25,
                    },
                }),
            ]);

            eventsList = (eventsRes.data?.events || []).filter((e) => titleMatchesKeywords(e.title, keywords));
            coursesList = (coursesRes.data?.courses || []).filter((c) => titleMatchesKeywords(c.title, keywords));

            // If keyword filtering yields nothing, keep originals so UI isn't empty
            if (eventsList.length === 0) eventsList = eventsRes.data?.events || [];
            if (coursesList.length === 0) coursesList = coursesRes.data?.courses || [];
        } catch (fetchErr) {
            console.warn('Training listings fetch failed, continuing with empty trainings:', fetchErr);
            eventsList = [];
            coursesList = [];
        }

        return [
            ...eventsList.map((e) => ({ ...e, mode: e.mode || 'OFFLINE' })),
            ...coursesList.map((c) => ({ ...c, mode: c.mode || 'ONLINE' })),
        ];
    };

    const inferTrainingPreference = (prompt, extracted) => {
        const p = String(prompt || '').toLowerCase();
        const fmt = String(extracted?.format || '').toLowerCase();

        const wantsOnline =
            fmt === 'online' ||
            p.includes('online') ||
            p.includes('course') ||
            p.includes('tutorial') ||
            p.includes('teach') ||
            p.includes('coursera') ||
            p.includes('udemy');

        const wantsInPerson =
            fmt === 'in-person' ||
            p.includes('in person') ||
            p.includes('seminar') ||
            p.includes('workshop') ||
            p.includes('event');

        if (wantsOnline && !wantsInPerson) return 'online';
        if (wantsInPerson && !wantsOnline) return 'in-person';
        // Default to online for “teaching/tutorial/course” style prompts
        return wantsOnline ? 'online' : 'in-person';
    };

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

                const topicOrPrompt = extractedData.query || prompt;
                const keywords = [
                    ...extractTitleKeywords(extractedData.query),
                    ...extractTitleKeywords(prompt),
                ];
                const preferred = inferTrainingPreference(prompt, { format: null });

                // Always populate both jobs + trainings so either tab has relevant results
                const [jobsList, trainings] = await Promise.all([
                    fetchRelevantJobs({
                        query: topicOrPrompt,
                        city: extractedData.location || 'Cebu',
                        candidateSkills: toCandidateSkillEntries(extractedData.skills || []),
                        similarityThreshold: 0.75,
                    }),
                    fetchRelevantTrainings({
                        query: topicOrPrompt,
                        city: extractedData.location || 'Cebu',
                        keywords,
                    }),
                ]);

                const decoratedJobs = (jobsList || []).map((j) => {
                    const match = j?.match;
                    const score = Number(match?.score);
                    return {
                        ...j,
                        match_score: Number.isFinite(score) ? score : null,
                        missing_skills: Array.isArray(match?.missing_skills) ? match.missing_skills : [],
                        matched_skills: Array.isArray(match?.matched_skills) ? match.matched_skills : [],
                    };
                });

                const { average_match_score, skill_gaps } = computeSkillGapFromJobs(decoratedJobs);
                const q = String(topicOrPrompt || '').toLowerCase();
                const matchThreshold = (q.includes('intern') || q.includes('junior') || q.includes('entry')) ? 65 : 70;
                const showSkillGapPopup = average_match_score < matchThreshold;

                results = (jobsList || []).slice(0, 5).map((j, i) => ({
                    id: j.id || i + 1,
                    title: j.title,
                    company: j.company || j.company_name || 'Company',
                    location: j.location || extractedData.location || 'Cebu',
                    type: 'job',
                }));

                setAgenticData({
                    intent: 'JOB_SEARCH',
                    prompt: prompt,
                    query: topicOrPrompt,
                    extracted_skills: extractedData.skills || [],
                    jobs: decoratedJobs,
                    trainings,
                    results,
                    average_match_score,
                    has_good_matches: !showSkillGapPopup,
                    ui: {
                        default_tab: 'jobs',
                        default_seminar_filter: preferred,
                        show_skill_gap_popup: showSkillGapPopup,
                        popup_title: showSkillGapPopup ? 'Suggested Skills to Strengthen' : '',
                        popup_body: showSkillGapPopup
                            ? `Your average match score is ${average_match_score}%. Based on the postings we found, a few skills look worth strengthening to improve matches.`
                            : '',
                        suggested_next_steps: showSkillGapPopup
                            ? [
                                'Review the missing skills and prioritize 1–2 to learn first',
                                'Open the Training tab to see recommended courses/seminars',
                                'Update your profile skills and re-run the search',
                              ]
                            : [],
                    },
                    has_skill_gap: showSkillGapPopup,
                    skill_gaps,
                    match_percentage: Math.round(average_match_score || 0)
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

                const topicOrPrompt = extractedData.topic || prompt;
                const keywords = [
                    ...extractTitleKeywords(extractedData.topic),
                    ...extractTitleKeywords(prompt),
                ];
                const preferred = inferTrainingPreference(prompt, extractedData);

                const [jobsList, trainings] = await Promise.all([
                    fetchRelevantJobs({
                        query: topicOrPrompt,
                        city: extractedData.location || 'Cebu',
                        // For training prompts, we still fetch relevant jobs using prompt keywords.
                        candidateSkills: toCandidateSkillEntries(keywords.slice(0, 8)),
                        similarityThreshold: 0.75,
                    }),
                    fetchRelevantTrainings({
                        query: topicOrPrompt,
                        city: extractedData.location || 'Cebu',
                        keywords,
                    }),
                ]);

                const decoratedJobs = (jobsList || []).map((j) => {
                    const match = j?.match;
                    const score = Number(match?.score);
                    return {
                        ...j,
                        match_score: Number.isFinite(score) ? score : null,
                        missing_skills: Array.isArray(match?.missing_skills) ? match.missing_skills : [],
                        matched_skills: Array.isArray(match?.matched_skills) ? match.matched_skills : [],
                    };
                });

                const { average_match_score, skill_gaps } = computeSkillGapFromJobs(decoratedJobs);

                // Also keep a small “results” list for the loading screen copy
                results = trainings.slice(0, 5).map((t, i) => ({
                    id: t.id || i + 1,
                    title: t.title,
                    organizer: t.organizer || t.provider || t.platform || 'Provider',
                    location: t.location || extractedData.location || 'Cebu',
                    type: 'seminar',
                }));

                setAgenticData({
                    // Keep MapView behavior: training mode should land on seminars tab
                    intent: 'SKILL_IMPROVEMENT',
                    prompt: prompt,
                    query: topicOrPrompt,
                    extracted_skills: extractedData.topic ? [extractedData.topic] : [],
                    jobs: decoratedJobs,
                    trainings,
                    results,
                    average_match_score,
                    ui: {
                        default_tab: 'seminars',
                        default_seminar_filter: preferred,
                        show_skill_gap_popup: false,
                        popup_title: '',
                        popup_body: '',
                        suggested_next_steps: [],
                    },
                    has_skill_gap: false,
                    skill_gaps,
                    match_percentage: Math.round(average_match_score || 0)
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
