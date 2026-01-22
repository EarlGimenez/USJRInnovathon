import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import JobMap from '../components/map/JobMap';
import ToggleTabs from '../components/ui/ToggleTabs';
import SearchBar from '../components/ui/SearchBar';
import ListingCard from '../components/cards/ListingCard';
import CourseCard from '../components/cards/CourseCard';
import EventCard from '../components/cards/EventCard';
import SkillProfileCard from '../components/cards/SkillProfileCard';
import SkillGapPopup from '../components/ui/SkillGapPopup';
import { useSkills } from '../context/SkillContext';

// Default location: Cebu City (for USJR)
const DEFAULT_LOCATION = { lat: 10.3157, lng: 123.8854, city: 'Cebu' };

export default function MapView() {
    const navigate = useNavigate();
    const location = useLocation();
    const { userSkills, calculateMatchPercentage, loading: skillsLoading, setUserSkills } = useSkills();
    
    // Check if we came from the agentic workflow
    const agenticData = location.state?.agenticData;
    const fromAgentic = location.state?.fromAgentic;
    
    const [activeTab, setActiveTab] = useState('jobs'); // 'jobs' or 'seminars'
    const [seminarFilter, setSeminarFilter] = useState('in-person'); // 'in-person' or 'online'
    const [searchQuery, setSearchQuery] = useState(''); // Search query
    const [pendingSearchQuery, setPendingSearchQuery] = useState(''); // For input field
    const [savedJobsSearchQuery, setSavedJobsSearchQuery] = useState(''); // Saved jobs search when switching to seminars
    const [jobs, setJobs] = useState([]);
    const [seminars, setSeminars] = useState([]);
    const [events, setEvents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mapCenter, setMapCenter] = useState([DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng]);
    const [userCity, setUserCity] = useState(DEFAULT_LOCATION.city);
    const [radiusKm, setRadiusKm] = useState(3); // Keep UI + backend distance filtering in sync
    const [locationLoading, setLocationLoading] = useState(true);
    const [cacheStatus, setCacheStatus] = useState(''); // 'cached' or 'fresh'
    const [weakSkills, setWeakSkills] = useState([]); // Skills that need improvement
    
    // Agentic workflow states
    const [showAgentBanner, setShowAgentBanner] = useState(fromAgentic);
    const [showSkillGapPopup, setShowSkillGapPopup] = useState(false);

    // Handle agentic workflow results from LangGraph
    useEffect(() => {
        if (fromAgentic && agenticData) {
            console.log('📊 Processing agentic data:', agenticData);

            // Allow agentic payload to control initial UI state (keeps backwards compatibility)
            const requestedTab = agenticData.ui?.default_tab;
            const requestedSeminarFilter = agenticData.ui?.default_seminar_filter;

            if (requestedTab === 'seminars' || agenticData.intent === 'SKILL_IMPROVEMENT') {
                setActiveTab('seminars');
                if (requestedSeminarFilter === 'online' || requestedSeminarFilter === 'in-person') {
                    setSeminarFilter(requestedSeminarFilter);
                } else if (agenticData.intent === 'SKILL_IMPROVEMENT') {
                    setSeminarFilter('online'); // default for skill improvement
                }
            } else {
                setActiveTab('jobs');
            }

            // Load jobs from LangGraph agentic data
            if (agenticData.jobs && agenticData.jobs.length > 0) {
                console.log(`✅ Loading ${agenticData.jobs.length} jobs from LangGraph`);
                setJobs(agenticData.jobs);
            }

            // Load trainings from LangGraph agentic data
            if (agenticData.trainings && agenticData.trainings.length > 0) {
                console.log(`✅ Loading ${agenticData.trainings.length} trainings from LangGraph`);

                // Separate into events and courses based on mode
                const eventsList = agenticData.trainings.filter(t => t.mode === 'OFFLINE');
                const coursesList = agenticData.trainings.filter(t => t.mode === 'ONLINE' || t.mode === 'HYBRID');

                setEvents(eventsList);
                setCourses(coursesList);
            }

            setLoading(false);

            // Show skill gap popup if UI config indicates
            if (agenticData.ui?.show_skill_gap_popup) {
                console.log('⚠️ Skill gap detected, showing popup');
                setTimeout(() => {
                    setShowSkillGapPopup(true);
                }, 1500); // Show popup after 1.5 seconds
            }

            // Update user skills if provided by LangGraph
            if (agenticData.user_skills && agenticData.user_skills.length > 0 && setUserSkills) {
                const skillsObj = {};
                agenticData.user_skills.forEach(skill => {
                    skillsObj[skill] = 70; // Default proficiency
                });
                setUserSkills(skillsObj);
                console.log(`✅ Updated user skills:`, skillsObj);
            }
        }
    }, [fromAgentic, agenticData, setUserSkills]);

    // Read URL search parameters on mount to restore search state
    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const queryParam = urlParams.get('query');
        const cityParam = urlParams.get('city');
        const latParam = urlParams.get('lat');
        const lngParam = urlParams.get('lng');
        const radiusParam = urlParams.get('radius_km');

        // Also check localStorage for persisted search state
        const persistedState = localStorage.getItem('mapSearchState');
        let searchState = null;
        if (persistedState) {
            try {
                searchState = JSON.parse(persistedState);
            } catch (e) {
                console.error('Error parsing persisted search state:', e);
            }
        }

        // Priority: URL params > localStorage > defaults
        if (queryParam) {
            console.log('Restoring search state from URL:', { queryParam, cityParam, latParam, lngParam });
            setSearchQuery(queryParam);
            setPendingSearchQuery(queryParam);
        } else if (searchState?.query) {
            console.log('Restoring search state from localStorage:', searchState);
            setSearchQuery(searchState.query);
            setPendingSearchQuery(searchState.query);
        }

        if (cityParam) {
            setUserCity(cityParam);
        } else if (searchState?.city) {
            setUserCity(searchState.city);
        }

        if (latParam && lngParam) {
            const lat = parseFloat(latParam);
            const lng = parseFloat(lngParam);
            if (!isNaN(lat) && !isNaN(lng)) {
                setMapCenter([lat, lng]);
            }
        } else if (searchState?.mapCenter) {
            setMapCenter(searchState.mapCenter);
        }

        if (radiusParam) {
            const parsedRadius = parseFloat(radiusParam);
            if (!isNaN(parsedRadius) && parsedRadius > 0) {
                setRadiusKm(parsedRadius);
            }
        } else if (searchState?.radiusKm) {
            const parsedRadius = parseFloat(searchState.radiusKm);
            if (!isNaN(parsedRadius) && parsedRadius > 0) {
                setRadiusKm(parsedRadius);
            }
        }
    }, []); // Only run on mount

    // Persist search state to localStorage when it changes
    useEffect(() => {
        if (!locationLoading) {
            const searchState = {
                query: searchQuery,
                city: userCity,
                mapCenter: mapCenter,
                radiusKm: radiusKm,
            };
            localStorage.setItem('mapSearchState', JSON.stringify(searchState));
            console.log('Saved search state to localStorage:', searchState);
        }
    }, [searchQuery, userCity, mapCenter, radiusKm, locationLoading]);

    // Get user's current location on mount
    useEffect(() => {
        getUserLocation();
    }, []);

    // Fetch data when location or tab changes, or when search query changes
    useEffect(() => {
        if (!locationLoading) {
            if (!fromAgentic) {
                // Only fetch if not from agentic workflow
                fetchData();
            }
        }
    }, [activeTab, seminarFilter, userCity, locationLoading, fromAgentic, searchQuery, radiusKm]);

    const normalizeSkillsForApi = (skills) => {
        // Agent flow often provides an array of skill strings.
        if (Array.isArray(skills)) {
            const normalized = skills
                .map((s) => (typeof s === 'string' ? s : (s?.name ?? s?.label ?? s?.value ?? '')))
                .map((s) => (typeof s === 'string' ? s.trim() : ''))
                .filter(Boolean);
            return normalized.length > 0 ? normalized : undefined;
        }

        // Demo skill session stores a category->level map.
        // Use the stronger categories as candidate skills so the backend can still rank.
        if (skills && typeof skills === 'object') {
            const normalized = Object.entries(skills)
                .filter(([_, v]) => typeof v === 'number' && !Number.isNaN(v) && v >= 50)
                .map(([k]) => String(k).trim())
                .filter(Boolean);
            return normalized.length > 0 ? normalized : undefined;
        }

        return undefined;
    };

    const mapRequiredSkillToCategory = (rawSkill) => {
        const skill = String(rawSkill || '').toLowerCase();
        if (!skill) return null;

        // Programming
        if (
            skill.includes('javascript') || skill.includes('typescript') || skill.includes('react') ||
            skill.includes('node') || skill.includes('php') || skill.includes('laravel') ||
            skill.includes('python') || skill.includes('java') || skill.includes('c#') ||
            skill.includes('html') || skill.includes('css') || skill.includes('api')
        ) return 'Programming';

        // Tools / Design tools
        if (
            skill.includes('figma') || skill.includes('sketch') || skill.includes('adobe') ||
            skill.includes('photoshop') || skill.includes('illustrator') || skill.includes('xd') ||
            skill.includes('canva')
        ) return 'Tools';

        // Design / UX
        if (skill.includes('ui') || skill.includes('ux') || skill.includes('design') || skill.includes('wireframe')) {
            return 'Design';
        }

        // Prototyping
        if (skill.includes('prototype') || skill.includes('prototyp')) return 'Prototyping';

        // Research
        if (
            skill.includes('research') || skill.includes('user testing') || skill.includes('usability') ||
            skill.includes('interview')
        ) return 'Research';

        // Data analysis
        if (
            skill.includes('sql') || skill.includes('excel') || skill.includes('tableau') ||
            skill.includes('power bi') || skill.includes('analytics') || skill.includes('data') ||
            skill.includes('statistics')
        ) return 'Data Analysis';

        // Communication
        if (
            skill.includes('communication') || skill.includes('collaboration') || skill.includes('teamwork') ||
            skill.includes('stakeholder') || skill.includes('presentation') || skill.includes('writing')
        ) return 'Communication';

        // Leadership
        if (
            skill.includes('lead') || skill.includes('management') || skill.includes('mentor') ||
            skill.includes('strategy')
        ) return 'Leadership';

        return null;
    };

    const buildCategoryRequirementsFromRequiredSkills = (requiredSkills) => {
        if (!requiredSkills || typeof requiredSkills !== 'object') return null;

        const requiredByCategory = {};
        Object.keys(requiredSkills).forEach((skillName) => {
            const category = mapRequiredSkillToCategory(skillName);
            if (category) {
                // Use a constant requirement; we just need a stable signal for demo scoring.
                requiredByCategory[category] = 70;
            }
        });

        return Object.keys(requiredByCategory).length > 0 ? requiredByCategory : null;
    };

    const getUserLocation = () => {
        setLocationLoading(true);
        
        if (!navigator.geolocation) {
            console.log('Geolocation not supported, using default location');
            setLocationLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setMapCenter([latitude, longitude]);
                
                // Reverse geocode to get city name using free Nominatim API
                try {
                    const response = await axios.get(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
                    );
                    
                    const address = response.data.address;
                    // Try to get city, town, municipality, or default to Taguig
                    const city = address.city || address.town || address.municipality || 
                                 address.suburb || address.district || DEFAULT_LOCATION.city;
                    setUserCity(city);
                    console.log('Detected location:', city);
                } catch (error) {
                    console.error('Reverse geocoding failed:', error);
                    // Keep default city
                }
                
                setLocationLoading(false);
            },
            (error) => {
                console.log('Geolocation error:', error.message, '- using default location');
                setLocationLoading(false);
            },
            { timeout: 3000, maximumAge: 300000, enableHighAccuracy: false }
        );
    };

    // Cache management functions
    // This caching system prevents excessive API calls by storing results in sessionStorage
    // Cache keys are based on: tab-filter-query-city-lat-lng
    // Cache expires after 24 hours
    // New searches clear the cache to ensure fresh data
    const getCacheKey = (tab, filter, query, city, lat, lng) => {
        return `${tab}-${filter}-${query}-${city}-${lat.toFixed(2)}-${lng.toFixed(2)}`;
    };

    const getCachedData = (cacheKey) => {
        try {
            const cached = sessionStorage.getItem(`jobSearch_${cacheKey}`);
            if (cached) {
                const parsed = JSON.parse(cached);
                // Check if cache is still valid (24 hours)
                const cacheTime = parsed.timestamp;
                const now = Date.now();
                if (now - cacheTime < 24 * 60 * 60 * 1000) { // 24 hours
                    return parsed.data;
                } else {
                    // Cache expired, remove it
                    sessionStorage.removeItem(`jobSearch_${cacheKey}`);
                }
            }
        } catch (error) {
            console.error('Error reading cache:', error);
        }
        return null;
    };

    const setCachedData = (cacheKey, data) => {
        try {
            const cacheEntry = {
                data: data,
                timestamp: Date.now()
            };
            sessionStorage.setItem(`jobSearch_${cacheKey}`, JSON.stringify(cacheEntry));
        } catch (error) {
            console.error('Error setting cache:', error);
        }
    };

    const clearSearchCache = () => {
        // Clear all job search related cache entries
        const keys = Object.keys(sessionStorage);
        keys.forEach(key => {
            if (key.startsWith('jobSearch_')) {
                sessionStorage.removeItem(key);
            }
        });
        console.log('Search cache cleared');
    };

    // Expose clearSearchCache to window for debugging (optional)
    if (typeof window !== 'undefined') {
        window.clearSearchCache = clearSearchCache;
        window.clearSearchState = () => {
            localStorage.removeItem('mapSearchState');
            console.log('Search state cleared');
        };
    }

    const fetchData = async () => {
        setLoading(true);
        
        // Clear ALL data to prevent stale data when switching tabs
        setJobs([]);
        setEvents([]);
        setCourses([]);
        
        // Create cache key based on current parameters
        const cacheKey = `${activeTab}-${seminarFilter}-${searchQuery}-${userCity}-${mapCenter[0].toFixed(2)}-${mapCenter[1].toFixed(2)}-${activeTab === 'jobs' ? radiusKm : ''}`;
        
        // Check cache first
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
            console.log('Using cached data for:', cacheKey);
            setCacheStatus('cached');
            if (activeTab === 'jobs') {
                setJobs(cachedData.jobs || []);
            } else if (activeTab === 'seminars') {
                if (seminarFilter === 'in-person') {
                    setEvents(cachedData.events || []);
                } else {
                    setCourses(cachedData.courses || []);
                    if (cachedData.weakSkills) {
                        setWeakSkills(cachedData.weakSkills);
                    }
                }
            }
            setLoading(false);
            return;
        }
        
        try {
            let response;
            let cacheData = {};
            
            if (activeTab === 'jobs') {
                const skillsToUse = normalizeSkillsForApi(agenticData?.skills || userSkills);
                const response = await axios.get('/api/jobs', {
                    params: { 
                        query: searchQuery, 
                        city: userCity,
                        lat: mapCenter[0], 
                        lng: mapCenter[1],
                        radius_km: radiusKm,
                        candidate_skills: skillsToUse,
                    }
                });
                setJobs(response.data.jobs || []);
                cacheData = { jobs: response.data.jobs || [] };
            } else if (activeTab === 'seminars') {
                if (seminarFilter === 'in-person') {
                    response = await axios.get('/api/events', {
                        params: { 
                            query: searchQuery, 
                            city: userCity,
                            latitude: mapCenter[0],
                            longitude: mapCenter[1],
                            limit: 5
                        }
                    });
                    setEvents(response.data.events || []);
                    cacheData = { events: response.data.events || [] };
                } else {
                    response = await axios.get('/api/courses', {
                        params: { 
                            query: searchQuery,
                            skills: userSkills,
                            limit: 5
                        }
                    });
                    setCourses(response.data.courses || []);
                    cacheData = { 
                        courses: response.data.courses || [],
                        weakSkills: response.data.weakSkills 
                    };
                    
                    // Track which skills are weak for display
                    if (response.data.weakSkills) {
                        setWeakSkills(response.data.weakSkills);
                        cacheData.weakSkills = response.data.weakSkills;
                    }
                }
            }
            
            // Cache the successful response
            setCachedData(cacheKey, cacheData);
            setCacheStatus('fresh');
            console.log('Fetched fresh data for:', cacheKey);
            
        } catch (error) {
            console.error('Error fetching data:', error);
            setJobs([]);
            setEvents([]);
            setCourses([]);
            setWeakSkills([]);
        }
        setLoading(false);
    };

    const handleSearch = (query) => {
        setPendingSearchQuery(query);
    };

    const handleSearchSubmit = () => {
        // Clear cache when performing a new search to ensure fresh data
        clearSearchCache();
        setSearchQuery(pendingSearchQuery);
    };

    const handleItemClick = (item) => {
        setSelectedItem(item);
        if (activeTab === 'jobs') {
            // Pass search context to job details
            navigate(`/job/${item.id}?query=${encodeURIComponent(searchQuery)}&city=${encodeURIComponent(userCity)}&lat=${mapCenter[0]}&lng=${mapCenter[1]}&radius_km=${encodeURIComponent(radiusKm)}`);
        } else if (activeTab === 'seminars') {
            if (seminarFilter === 'in-person') {
                navigate(`/seminar/${item.id}`);
            } else {
                // Open course URL in new tab
                if (item.url) {
                    window.open(item.url, '_blank', 'noopener,noreferrer');
                }
            }
        }
    };
    
    const handleMarkerClick = (item) => {
        setSelectedItem(item);
    };

    // Get items based on active tab and filter
    // Filter to ensure we only show items matching the current view
    const getItems = () => {
        if (activeTab === 'jobs') {
            // Only return items that look like jobs (have company field, no provider field)
            return jobs.filter(item => item.company && !item.provider);
        }
        if (activeTab === 'seminars') {
            if (seminarFilter === 'in-person') {
                // Only return items that look like events (have organizer or attendees)
                return events.filter(item => item.organizer || item.attendees !== undefined);
            } else {
                // Only return items that look like courses (have provider field)
                return courses.filter(item => item.provider || item.platform);
            }
        }
        return [];
    };

    const items = getItems();
    
    // Add match percentage to items (for jobs)
    const getJobMatchPercentage = (item) => {
        const backendScore = item?.match?.score;
        if (typeof backendScore === 'number' && !Number.isNaN(backendScore)) {
            return Math.round(backendScore);
        }

        if (typeof item?.matchPercentage === 'number' && !Number.isNaN(item.matchPercentage)) {
            return Math.round(item.matchPercentage);
        }

        // Fallback only if backend match isn't present.
        // If the user's skill profile is category-based (object), map required skills into categories first.
        if (userSkills && typeof userSkills === 'object' && !Array.isArray(userSkills)) {
            const requiredByCategory = buildCategoryRequirementsFromRequiredSkills(item?.requiredSkills);
            if (requiredByCategory) {
                return calculateMatchPercentage(requiredByCategory);
            }
        }

        return calculateMatchPercentage(item?.requiredSkills || {});
    };

    const itemsWithMatch = items.map(item => ({
        ...item,
        matchPercentage: activeTab === 'jobs' 
            ? getJobMatchPercentage(item)
            : item.matchPercentage || 0
    }));

    // Sort by match percentage (highest first) for jobs, keep order for others
    const sortedItems = activeTab === 'jobs'
        ? [...itemsWithMatch].sort((a, b) => b.matchPercentage - a.matchPercentage)
        : itemsWithMatch;

    // Get tab title
    const getTabTitle = () => {
        if (activeTab === 'jobs') return 'Job Listings';
        if (activeTab === 'seminars') {
            return seminarFilter === 'in-person' ? 'In-Person Seminars' : 'Online Courses';
        }
        return 'Listings';
    };

    // Get search placeholder
    const getSearchPlaceholder = () => {
        if (activeTab === 'jobs') return 'Search jobs...';
        if (activeTab === 'seminars') {
            return seminarFilter === 'in-person' 
                ? 'Search seminars and events...' 
                : 'Search courses (e.g., Python, Design)...';
        }
        return 'Search...';
    };

    // Custom tab change handler that manages search query state
    const handleTabChange = (newTab) => {
        if (newTab === 'seminars' && activeTab === 'jobs') {
            // Switching to seminars: save current jobs search and clear it
            setSavedJobsSearchQuery(searchQuery);
            setSearchQuery('');
            setPendingSearchQuery('');
        } else if (newTab === 'jobs' && activeTab === 'seminars') {
            // Switching back to jobs: restore saved jobs search
            setSearchQuery(savedJobsSearchQuery);
            setPendingSearchQuery(savedJobsSearchQuery);
        }
        setActiveTab(newTab);
    };

    if (skillsLoading || locationLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 mb-4" style={{ borderColor: '#114124' }}></div>
                <p className="text-gray-600">
                    {locationLoading ? 'Detecting your location...' : 'Loading your skills...'}
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Skill Gap Popup - from LangGraph UI config */}
            {showSkillGapPopup && agenticData?.ui && (
                <SkillGapPopup
                    skillGaps={agenticData.skill_gaps || agenticData.jobs?.[0]?.missing_skills || []}
                    matchPercentage={Math.round(agenticData.average_match_score || agenticData.jobs?.[0]?.match_score || 50)}
                    suggestedSteps={agenticData.ui.suggested_next_steps || []}
                    onClose={() => setShowSkillGapPopup(false)}
                    onViewTraining={() => {
                        setActiveTab('seminars');
                        setSeminarFilter('online');
                        setShowSkillGapPopup(false);
                    }}
                />
            )}

            {/* Agent Success Banner from LangGraph */}
            {showAgentBanner && agenticData && (
                <div className={`text-white px-4 py-3 relative ${
                    agenticData.intent === 'JOB_SEARCH'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                }`}>
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-medium text-sm">
                                    {agenticData.intent === 'JOB_SEARCH'
                                        ? `AI found ${jobs.length} matching opportunities for "${agenticData.query}"!`
                                        : `Found ${events.length + courses.length} training programs for "${agenticData.query}"!`
                                    }
                                </p>
                                <p className="text-xs text-white/80">
                                    {agenticData.ui?.show_skill_gap_popup
                                        ? 'We detected some skill gaps - check the recommendations'
                                        : agenticData.intent === 'JOB_SEARCH'
                                            ? 'Sorted by match score - top matches first'
                                            : 'Select a program to enhance your skills'
                                    }
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowAgentBanner(false)}
                            className="w-6 h-6 rounded-full hover:bg-white/20 flex items-center justify-center"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
            
            {/* Controls Bar */}
            <div className="bg-white border-b border-gray-200 z-20">
                <div className="px-4 py-3 lg:px-6 lg:py-4">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm flex items-center gap-1" style={{ color: '#181818', opacity: 0.7 }}>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            {userCity}, Philippines
                        </p>
                        <ToggleTabs 
                            activeTab={activeTab}
                            onTabChange={handleTabChange}
                        />
                    </div>
                    <div className="flex gap-2">
                        <SearchBar 
                            value={pendingSearchQuery}
                            onChange={setPendingSearchQuery}
                            onSearch={handleSearch}
                            placeholder={getSearchPlaceholder()}
                        />

                        {activeTab === 'jobs' && (
                            <select
                                value={radiusKm}
                                onChange={(e) => {
                                    const next = parseFloat(e.target.value);
                                    if (!Number.isNaN(next) && next > 0) {
                                        setRadiusKm(next);
                                    }
                                }}
                                className="px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                title="Search radius"
                            >
                                <option value={3}>3 km</option>
                                <option value={5}>5 km</option>
                                <option value={10}>10 km</option>
                                <option value={15}>15 km</option>
                                <option value={25}>25 km</option>
                            </select>
                        )}

                        <button
                            onClick={handleSearchSubmit}
                            className="px-4 py-2.5 bg-[#114124] text-white rounded-lg hover:bg-[#0f3a1a] focus:outline-none focus:ring-2 focus:ring-[#114124] focus:ring-offset-2 transition-all font-medium"
                        >
                            Search
                        </button>
                    </div>
                    
                    {/* Seminar Filter Toggle - Only show when on seminars tab */}
                    {activeTab === 'seminars' && (
                        <div className="flex mt-3 bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setSeminarFilter('in-person')}
                                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                    seminarFilter === 'in-person'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                In-Person
                            </button>
                            <button
                                onClick={() => setSeminarFilter('online')}
                                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                    seminarFilter === 'online'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Online
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content - Responsive Layout */}
            {/* Mobile: Vertical (map top, listings bottom) */}
            {/* Desktop: Horizontal Google Maps style (listings left, map right) */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                
                {/* Listings Sidebar */}
                {/* Mobile: Bottom panel with max height */}
                {/* Desktop: Left sidebar with fixed width */}
                <aside className="
                    order-2 lg:order-1
                    bg-white 
                    max-h-[40vh] lg:max-h-none lg:h-full
                    lg:w-[420px] lg:min-w-[380px]
                    overflow-y-auto 
                    border-t lg:border-t-0 lg:border-r border-gray-200
                    lg:shadow-lg
                ">
                    <div className="p-4 lg:p-5">
                        {/* Desktop Header */}
                        <div className="hidden lg:block mb-4 pb-4 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">
                                {getTabTitle()}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {fromAgentic && activeTab === 'jobs' ? 'AI-matched results' : 
                                 activeTab === 'seminars' && seminarFilter === 'online' ? 'Recommended for your skill gaps' :
                                 activeTab === 'seminars' && seminarFilter === 'in-person' ? 'Nearby seminars and events' : 
                                 'Sorted by skill match'} - {sortedItems.length} results
                                {cacheStatus && (
                                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                                        cacheStatus === 'cached' 
                                            ? 'bg-green-100 text-green-700' 
                                            : 'bg-[#114124] text-white'
                                    }`}>
                                        {cacheStatus === 'cached' ? '⚡ Cached' : '🔄 Fresh'}
                                    </span>
                                )}
                            </p>
                            {/* Weak Skills Indicator for Online Courses */}
                            {activeTab === 'seminars' && seminarFilter === 'online' && weakSkills.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    <span className="text-xs text-gray-500">Improving:</span>
                                    {weakSkills.map(skill => (
                                        <span key={skill} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {/* Mobile Header */}
                        <h2 className="lg:hidden text-lg font-semibold text-gray-800 mb-3">
                            {activeTab === 'jobs' ? 'Local Jobs' : 
                             seminarFilter === 'in-person' ? 'In-Person Seminars' : 'Online Courses'}
                            <span className="text-sm font-normal text-gray-500 ml-2">
                                ({sortedItems.length} found)
                                {cacheStatus && (
                                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                                        cacheStatus === 'cached' 
                                            ? 'bg-green-100 text-green-700' 
                                            : 'bg-[#114124] text-white'
                                    }`}>
                                        {cacheStatus === 'cached' ? '⚡' : '🔄'}
                                    </span>
                                )}
                            </span>
                        </h2>
                        
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#114124' }}></div>
                            </div>
                        ) : sortedItems.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">
                                No {seminarFilter === 'online' ? 'courses' : 'seminars'} found{seminarFilter === 'in-person' ? ' in this area' : ''}.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {sortedItems.map(item => (
                                    <div key={item.id} className="relative">
                                        {activeTab === 'jobs' && (
                                            <>
                                                <ListingCard
                                                    item={item}
                                                    type="jobs"
                                                    onClick={() => handleItemClick(item)}
                                                    isSelected={selectedItem?.id === item.id}
                                                />
                                                {/* Apply button for mock jobs from agent */}
                                                {item.isMockData && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleApplyClick(item);
                                                        }}
                                                        className="absolute bottom-3 right-3 px-3 py-1.5 bg-[#114124] text-white text-xs font-medium rounded-lg hover:bg-[#0f3a1a] transition-colors shadow-sm flex items-center gap-1"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                        </svg>
                                                        Apply with AI
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        {activeTab === 'seminars' && seminarFilter === 'in-person' && (
                                            <EventCard
                                                event={item}
                                                onClick={() => handleItemClick(item)}
                                            />
                                        )}
                                        {activeTab === 'seminars' && seminarFilter === 'online' && (
                                            <CourseCard
                                                course={item}
                                                onClick={() => handleItemClick(item)}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </aside>

                {/* Map Section */}
                {/* Mobile: Top section, takes remaining space */}
                {/* Desktop: Main area, fills remaining width */}
                <main className="order-1 lg:order-2 flex-1 relative min-h-[50vh] lg:min-h-0">
                    {activeTab === 'seminars' && seminarFilter === 'online' ? (
                        // Show course info panel instead of map for online courses
                        <div className="h-full bg-gradient-to-br from-purple-50 to-indigo-50 flex flex-col items-center justify-center p-8">
                            <div className="max-w-md text-center">
                                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                                    Online Learning
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    These courses are available online. 
                                    Learn at your own pace from anywhere!
                                </p>
                                
                                {/* Skill gap indicator */}
                                {weakSkills.length > 0 && (
                                    <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-100">
                                        <p className="text-sm font-medium text-gray-700 mb-2">
                                            Courses selected to improve:
                                        </p>
                                        <div className="flex flex-wrap justify-center gap-2">
                                            {weakSkills.map(skill => (
                                                <span 
                                                    key={skill}
                                                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {/* View More Links */}
                                <div className="mt-6 space-y-3">
                                    <p className="text-sm text-gray-500 mb-2">Browse more courses on:</p>
                                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                        <a 
                                            href={`https://www.udemy.com/courses/search/?q=${encodeURIComponent(searchQuery)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 0L1.608 6v12L12 24l10.392-6V6L12 0zm-1.524 17.462H8.618V9.59l1.858-1.054v8.926zm4.478 0h-1.857V8.536l1.857-1.054v10.98z"/>
                                            </svg>
                                            View on Udemy
                                        </a>
                                        <a 
                                            href={`https://www.coursera.org/search?query=${encodeURIComponent(searchQuery)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#114124] text-white rounded-lg hover:bg-[#0f3a1a] transition-colors font-medium"
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M11.374 23.977c-4.027-.251-7.64-2.509-9.94-6.104C-.881 14.058-.368 9.102 1.979 5.335a12.072 12.072 0 015.463-4.883C9.71-.486 12.542-.491 14.87.576c2.012.922 3.607 2.362 4.857 4.17.127.184-.11.48-.32.402-2.94-1.1-5.614-.654-7.955 1.356-1.953 1.677-2.782 3.859-2.47 6.343.316 2.514 1.54 4.454 3.592 5.908 1.25.884 2.63 1.398 4.138 1.586.233.029.319.15.3.343a12.075 12.075 0 01-1.257 3.67c-.125.234-.315.412-.532.529-.67.36-1.397.498-2.14.576-.498.053-.5.052-.709-.019z"/>
                                            </svg>
                                            View on Coursera
                                        </a>
                                    </div>
                                </div>

                            </div>
                        </div>
                    ) : (
                        // Show map for jobs and in-person seminars
                        <>
                            <JobMap
                                items={sortedItems}
                                center={mapCenter}
                                radiusKm={radiusKm}
                                onMarkerClick={handleMarkerClick}
                                selectedItem={selectedItem}
                                type={activeTab === 'seminars' ? 'seminars' : activeTab}
                            />
                            
                            {/* User Skills Badge - Positioned on map */}
                            <div className="absolute top-3 right-3 z-[1000]">
                                <SkillProfileCard skills={userSkills} compact />
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
