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
import { generateMockJobs } from '../services/MockJobGenerator';

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
    const [searchQuery, setSearchQuery] = useState('Graphics designer'); // Default search
    const [pendingSearchQuery, setPendingSearchQuery] = useState('Graphics designer'); // For input field
    const [jobs, setJobs] = useState([]);
    const [seminars, setSeminars] = useState([]);
    const [events, setEvents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mapCenter, setMapCenter] = useState([DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng]);
    const [userCity, setUserCity] = useState(DEFAULT_LOCATION.city);
    const [locationLoading, setLocationLoading] = useState(true);
    const [weakSkills, setWeakSkills] = useState([]);
    
    // Agentic workflow states
    const [showAgentBanner, setShowAgentBanner] = useState(fromAgentic);
    const [showSkillGapPopup, setShowSkillGapPopup] = useState(false);

    // Handle agentic workflow results from LangGraph
    useEffect(() => {
        if (fromAgentic && agenticData) {
            console.log('📊 Processing agentic data:', agenticData);

            // Set the appropriate tab based on intent from LangGraph
            if (agenticData.intent === 'SKILL_IMPROVEMENT') {
                setActiveTab('seminars');
                setSeminarFilter('online'); // Show online courses for skill improvement
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
    }, [activeTab, seminarFilter, userCity, locationLoading, fromAgent, searchQuery]);

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

    const fetchData = async () => {
        setLoading(true);
        
        // Clear ALL data to prevent stale data when switching tabs
        setJobs([]);
        setEvents([]);
        setCourses([]);
        
        try {
            if (activeTab === 'jobs') {
                const response = await axios.get('/api/jobs', {
                    params: { 
                        query: searchQuery, 
                        city: userCity,
                        lat: mapCenter[0], 
                        lng: mapCenter[1] 
                    }
                });
                setJobs(response.data.jobs || []);
            } else if (activeTab === 'seminars') {
                if (seminarFilter === 'in-person') {
                    // Fetch real events from our scraper
                    const response = await axios.get('/api/events', {
                        params: { 
                            query: searchQuery, 
                            city: userCity,
                            latitude: mapCenter[0],
                            longitude: mapCenter[1],
                            limit: 5
                        }
                    });
                    setEvents(response.data.events || []);
                } else {
                    // Fetch recommended courses based on skills
                    const response = await axios.get('/api/courses', {
                        params: { 
                            query: searchQuery,
                            skills: userSkills,
                            limit: 5
                        }
                    });
                    setCourses(response.data.courses || []);
                    
                    // Track which skills are weak for display
                    if (response.data.weakSkills) {
                        setWeakSkills(response.data.weakSkills);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            // Use mock data for demo if API fails
            if (activeTab === 'jobs') {
                setJobs(getMockJobs());
            } else if (activeTab === 'seminars') {
                if (seminarFilter === 'in-person') {
                    setEvents(getMockEvents());
                } else {
                    setCourses(getMockCourses());
                }
            }
        }
        setLoading(false);
    };

    const handleSearch = (query) => {
        setPendingSearchQuery(query);
    };

    const handleSearchSubmit = () => {
        setSearchQuery(pendingSearchQuery);
        fetchData();
    };

    const handleItemClick = (item) => {
        setSelectedItem(item);
        if (activeTab === 'jobs') {
            // For mock jobs from agent flow, navigate to apply page
            if (item.isMockData) {
                handleApplyClick(item);
                return;
            }
            // Pass search context to job details
            navigate(`/job/${item.id}?query=${encodeURIComponent(searchQuery)}&city=${encodeURIComponent(userCity)}&lat=${mapCenter[0]}&lng=${mapCenter[1]}`);
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
    
    const handleApplyClick = (job) => {
        // Navigate to apply page with job data
        navigate('/apply', { 
            state: { 
                job,
                agentSkills: agentData?.skills || userSkills
            } 
        });
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
    const itemsWithMatch = items.map(item => ({
        ...item,
        matchPercentage: activeTab === 'jobs' 
            ? calculateMatchPercentage(item.requiredSkills || {})
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
                    skillGaps={agenticData.jobs?.[0]?.missing_skills || []}
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
                            onTabChange={setActiveTab}
                        />
                    </div>
                    <div className="flex gap-2">
                        <SearchBar 
                            value={pendingSearchQuery}
                            onChange={setPendingSearchQuery}
                            onSearch={handleSearch}
                            placeholder={getSearchPlaceholder()}
                        />
                        <button
                            onClick={handleSearchSubmit}
                            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all font-medium"
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
                                                        className="absolute bottom-3 right-3 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1"
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
                                

                            </div>
                        </div>
                    ) : (
                        // Show map for jobs and in-person seminars
                        <>
                            <JobMap
                                items={sortedItems}
                                center={mapCenter}
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

// Mock data for demo purposes - Taguig/BGC locations
function getMockJobs() {
    return [
        {
            id: 1,
            title: 'UX Designer',
            company: 'Accenture Philippines',
            location: 'BGC, Taguig',
            latitude: 14.5512,
            longitude: 121.0498,
            salary: '₱45,000 - ₱65,000',
            type: 'Full-time',
            description: 'We are looking for a creative UX Designer to join our team at BGC...',
            requiredSkills: { Design: 80, Prototyping: 70, Tools: 60, Research: 50, Communication: 65 }
        },
        {
            id: 2,
            title: 'Frontend Developer',
            company: 'Globe Telecom',
            location: 'The Globe Tower, BGC',
            latitude: 14.5547,
            longitude: 121.0462,
            salary: '₱50,000 - ₱80,000',
            type: 'Full-time',
            description: 'Seeking experienced frontend developer proficient in React...',
            requiredSkills: { Design: 50, Prototyping: 60, Tools: 85, Research: 40, Communication: 55 }
        },
        {
            id: 3,
            title: 'Product Manager',
            company: 'Maya (PayMaya)',
            location: 'Net One Center, BGC',
            latitude: 14.5489,
            longitude: 121.0505,
            salary: '₱70,000 - ₱120,000',
            type: 'Full-time',
            description: 'Lead product development for fintech solutions...',
            requiredSkills: { Design: 45, Prototyping: 55, Tools: 50, Research: 75, Communication: 85 }
        },
        {
            id: 4,
            title: 'Graphic Designer',
            company: 'Canva Philippines',
            location: 'High Street, BGC',
            latitude: 14.5503,
            longitude: 121.0451,
            salary: '₱35,000 - ₱50,000',
            type: 'Full-time',
            description: 'Create visual content for marketing campaigns...',
            requiredSkills: { Design: 90, Prototyping: 40, Tools: 75, Research: 30, Communication: 50 }
        },
        {
            id: 5,
            title: 'Junior Software Engineer',
            company: 'Kalibrr',
            location: 'Uptown BGC, Taguig',
            latitude: 14.5565,
            longitude: 121.0532,
            salary: '₱30,000 - ₱45,000',
            type: 'Full-time',
            description: 'Entry level position for software development...',
            requiredSkills: { Design: 35, Prototyping: 45, Tools: 60, Research: 35, Communication: 45 }
        }
    ];
}

function getMockSeminars() {
    return [
        {
            id: 1,
            title: 'Tech Workshop: Modern Web Development',
            organizer: 'Google Developer Groups PH',
            location: 'Mind Museum, BGC',
            latitude: 14.5518,
            longitude: 121.0465,
            date: 'February 15, 2026',
            time: '9:00 AM - 5:00 PM',
            description: 'Hands-on workshop covering latest web technologies...',
            skillBoosts: { Tools: 15, Prototyping: 10 },
            attendees: 45,
            maxAttendees: 100
        },
        {
            id: 2,
            title: 'Career Fair BGC 2026',
            organizer: 'JobStreet Philippines',
            location: 'SMX Convention Center, SM Aura',
            latitude: 14.5449,
            longitude: 121.0546,
            date: 'January 25, 2026',
            time: '10:00 AM - 6:00 PM',
            description: 'Connect with top employers in Metro Manila...',
            skillBoosts: { Communication: 10, Research: 8 },
            attendees: 230,
            maxAttendees: 500
        },
        {
            id: 3,
            title: 'Design Thinking Workshop',
            organizer: 'UXPH (UX Philippines)',
            location: 'WeWork, High Street South',
            latitude: 14.5503,
            longitude: 121.0451,
            date: 'February 8, 2026',
            time: '1:00 PM - 5:00 PM',
            description: 'Learn design thinking methodologies...',
            skillBoosts: { Design: 12, Research: 10, Prototyping: 8 },
            attendees: 28,
            maxAttendees: 50
        },
        {
            id: 4,
            title: 'Communication Masterclass',
            organizer: 'Toastmasters BGC',
            location: 'Shangri-La at The Fort, BGC',
            latitude: 14.5535,
            longitude: 121.0489,
            date: 'February 22, 2026',
            time: '2:00 PM - 6:00 PM',
            description: 'Enhance your professional communication skills...',
            skillBoosts: { Communication: 15 },
            attendees: 55,
            maxAttendees: 80
        },
        {
            id: 5,
            title: 'Figma & Prototyping Bootcamp',
            organizer: 'Canva Philippines',
            location: 'Globe Tower, BGC',
            latitude: 14.5547,
            longitude: 121.0462,
            date: 'March 10, 2026',
            time: '9:00 AM - 4:00 PM',
            description: 'Intensive one-day bootcamp on Figma and prototyping...',
            skillBoosts: { Prototyping: 18, Tools: 12, Design: 8 },
            attendees: 15,
            maxAttendees: 30
        }
    ];
}

// Mock events for Cebu area
function getMockEvents() {
    return [
        {
            id: 'cebu_1',
            title: 'Cebu Tech Summit 2026',
            organizer: 'Cebu IT-BPM Organization',
            location: 'Waterfront Cebu City Hotel',
            city: 'Cebu City',
            latitude: 10.3157,
            longitude: 123.8854,
            date: 'February 20, 2026',
            time: '9:00 AM - 6:00 PM',
            description: 'The biggest technology conference in the Visayas region.',
            price: '₱500',
            isFree: false,
            type: 'offline',
            skillBoosts: { Tools: 10, Communication: 8 },
            attendees: 150,
            maxAttendees: 300
        },
        {
            id: 'cebu_2',
            title: 'Google Developer Group Cebu Meetup',
            organizer: 'GDG Cebu',
            location: 'The Company Cebu',
            city: 'Cebu City',
            latitude: 10.3190,
            longitude: 123.8910,
            date: 'January 28, 2026',
            time: '6:00 PM - 9:00 PM',
            description: 'Monthly meetup for developers. This month: Flutter Development Workshop.',
            price: 'Free',
            isFree: true,
            type: 'offline',
            skillBoosts: { Prototyping: 12, Tools: 10 },
            attendees: 45,
            maxAttendees: 80
        },
        {
            id: 'cebu_3',
            title: 'USJR Career Fair 2026',
            organizer: 'USJR Office of Career Services',
            location: 'University of San Jose-Recoletos',
            city: 'Cebu City',
            latitude: 10.2988,
            longitude: 123.8914,
            date: 'February 5, 2026',
            time: '8:00 AM - 5:00 PM',
            description: 'Annual career fair featuring top companies in Cebu.',
            price: 'Free',
            isFree: true,
            type: 'offline',
            skillBoosts: { Communication: 15, Research: 8 },
            attendees: 320,
            maxAttendees: 500
        },
        {
            id: 'cebu_4',
            title: 'UX/UI Design Workshop for Beginners',
            organizer: 'UXPH Cebu',
            location: 'aSpace Cebu',
            city: 'Cebu City',
            latitude: 10.3210,
            longitude: 123.8990,
            date: 'February 12, 2026',
            time: '1:00 PM - 5:00 PM',
            description: 'Hands-on workshop covering design fundamentals.',
            price: '₱300',
            isFree: false,
            type: 'offline',
            skillBoosts: { Design: 15, Prototyping: 12, Tools: 8 },
            attendees: 25,
            maxAttendees: 40
        },
        {
            id: 'cebu_5',
            title: 'Startup Cebu: Pitch Night',
            organizer: 'Startup Cebu',
            location: 'The Tide Coworking Space',
            city: 'Cebu City',
            latitude: 10.3120,
            longitude: 123.8850,
            date: 'January 30, 2026',
            time: '6:00 PM - 9:00 PM',
            description: 'Watch local startups pitch their ideas to investors.',
            price: 'Free',
            isFree: true,
            type: 'offline',
            skillBoosts: { Communication: 10, Research: 8 },
            attendees: 60,
            maxAttendees: 100
        }
    ];
}

// Mock courses
function getMockCourses() {
    return [
        {
            id: 'udemy_1',
            title: 'Complete Web & Mobile Designer: UI/UX, Figma + more',
            description: 'Become a UI/UX Designer. Learn modern web design.',
            provider: 'Udemy',
            providerLogo: 'https://www.udemy.com/staticx/udemy/images/v7/logo-udemy.svg',
            url: 'https://www.udemy.com/courses/search/?q=ui+ux+design',
            price: '₱549',
            isFree: false,
            rating: 4.7,
            reviews: 45000,
            skill: 'Design'
        },
        {
            id: 'coursera_1',
            title: 'Google UX Design Professional Certificate',
            description: 'Start your career in UX design with Google.',
            provider: 'Coursera',
            providerLogo: 'https://d3njjcbhbojbot.cloudfront.net/api/utilities/v1/imageproxy/https://coursera.s3.amazonaws.com/media/coursera-logo-square.png',
            url: 'https://www.coursera.org/professional-certificates/google-ux-design',
            price: 'Free to audit',
            isFree: true,
            rating: 4.8,
            reviews: 52000,
            skill: 'Design',
            partner: 'Google'
        },
        {
            id: 'udemy_2',
            title: 'Communication Skills for Beginners',
            description: 'Master professional communication in the workplace.',
            provider: 'Udemy',
            providerLogo: 'https://www.udemy.com/staticx/udemy/images/v7/logo-udemy.svg',
            url: 'https://www.udemy.com/courses/search/?q=communication+skills',
            price: 'Free',
            isFree: true,
            rating: 4.4,
            reviews: 15000,
            skill: 'Communication'
        },
        {
            id: 'coursera_2',
            title: 'Improving Communication Skills',
            description: 'Learn to communicate more effectively.',
            provider: 'Coursera',
            providerLogo: 'https://d3njjcbhbojbot.cloudfront.net/api/utilities/v1/imageproxy/https://coursera.s3.amazonaws.com/media/coursera-logo-square.png',
            url: 'https://www.coursera.org/learn/wharton-communication-skills',
            price: 'Free to audit',
            isFree: true,
            rating: 4.7,
            reviews: 28000,
            skill: 'Communication',
            partner: 'University of Pennsylvania'
        },
        {
            id: 'udemy_3',
            title: 'Figma UI UX Design Essentials',
            description: 'Learn Figma for UI/UX Design from scratch.',
            provider: 'Udemy',
            providerLogo: 'https://www.udemy.com/staticx/udemy/images/v7/logo-udemy.svg',
            url: 'https://www.udemy.com/courses/search/?q=figma',
            price: '₱549',
            isFree: false,
            rating: 4.8,
            reviews: 28000,
            skill: 'Prototyping'
        }
    ];
}
