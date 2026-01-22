import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import JobMap from '../components/map/JobMap';
import ToggleTabs from '../components/ui/ToggleTabs';
import SearchBar from '../components/ui/SearchBar';
import ListingCard from '../components/cards/ListingCard';
import SkillProfileCard from '../components/cards/SkillProfileCard';
import { useSkills } from '../context/SkillContext';
import { generateMockJobs } from '../services/MockJobGenerator';

// Default location: Taguig, Metro Manila
const DEFAULT_LOCATION = { lat: 14.5176, lng: 121.0509, city: 'Taguig' };

export default function MapView() {
    const navigate = useNavigate();
    const location = useLocation();
    const { userSkills, calculateMatchPercentage, loading: skillsLoading, setUserSkills } = useSkills();
    
    // Check if we came from the AI agent flow
    const agentData = location.state?.agentData;
    const fromAgent = location.state?.fromAgent;
    
    const [activeTab, setActiveTab] = useState('jobs'); // 'jobs' or 'seminars'
    const [searchQuery, setSearchQuery] = useState('');
    const [jobs, setJobs] = useState([]);
    const [seminars, setSeminars] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mapCenter, setMapCenter] = useState([DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng]);
    const [userCity, setUserCity] = useState(DEFAULT_LOCATION.city);
    const [locationLoading, setLocationLoading] = useState(true);
    
    // Agent welcome banner state
    const [showAgentBanner, setShowAgentBanner] = useState(fromAgent);

    // Apply agent-extracted skills if coming from agent flow
    useEffect(() => {
        if (agentData?.skills && setUserSkills) {
            // Update user skills with agent-extracted skills
            setUserSkills(agentData.skills);
        }
    }, [agentData]);

    // Get user's current location on mount
    useEffect(() => {
        getUserLocation();
    }, []);

    // Fetch data when location or tab changes - use mock jobs if from agent
    useEffect(() => {
        if (!locationLoading) {
            if (fromAgent && activeTab === 'jobs') {
                // Use generated mock jobs for agent flow
                const skillsToUse = agentData?.skills || userSkills;
                const mockJobs = generateMockJobs(skillsToUse, 5);
                setJobs(mockJobs);
                setLoading(false);
            } else {
                fetchData();
            }
        }
    }, [activeTab, userCity, locationLoading, fromAgent]);

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
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
                        { headers: { 'User-Agent': 'SkillMatch Demo App' } }
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
            { timeout: 10000, enableHighAccuracy: false }
        );
    };

    const fetchData = async () => {
        setLoading(true);
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
            } else {
                const response = await axios.get('/api/seminars', {
                    params: { query: searchQuery, city: userCity }
                });
                setSeminars(response.data.seminars || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            // Use mock data for demo if API fails
            if (activeTab === 'jobs') {
                setJobs(getMockJobs());
            } else {
                setSeminars(getMockSeminars());
            }
        }
        setLoading(false);
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
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
            navigate(`/job/${item.id}`);
        } else {
            navigate(`/seminar/${item.id}`);
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

    const items = activeTab === 'jobs' ? jobs : seminars;
    
    // Add match percentage to items
    const itemsWithMatch = items.map(item => ({
        ...item,
        matchPercentage: calculateMatchPercentage(item.requiredSkills || {})
    }));

    // Sort by match percentage (highest first)
    const sortedItems = [...itemsWithMatch].sort((a, b) => b.matchPercentage - a.matchPercentage);

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
            {/* Agent Success Banner */}
            {showAgentBanner && (
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 relative">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-medium text-sm">AI found {jobs.length} matching opportunities!</p>
                                <p className="text-xs text-white/80">Click a job to apply with AI-generated cover letter</p>
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
            
            {/* Header - Responsive: Compact on mobile, expanded on desktop */}
            <header className="bg-white shadow-sm border-b border-gray-200 z-20">
                <div className="px-4 py-3 lg:px-6 lg:py-4">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <Link to="/" className="hover:opacity-80 transition-opacity">
                                <img src="/lookal_logo.png" alt="Lookal" className="h-7 lg:h-8" />
                            </Link>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                                {userCity}, Philippines
                            </p>
                        </div>
                        <ToggleTabs 
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                        />
                    </div>
                    <SearchBar 
                        value={searchQuery}
                        onChange={setSearchQuery}
                        onSearch={handleSearch}
                        placeholder={`Search ${activeTab}...`}
                    />
                </div>
            </header>

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
                                {activeTab === 'jobs' ? 'Job Listings' : 'Upcoming Seminars'}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {fromAgent && activeTab === 'jobs' ? 'AI-matched results' : 'Sorted by skill match'} • {sortedItems.length} results
                            </p>
                        </div>
                        
                        {/* Mobile Header */}
                        <h2 className="lg:hidden text-lg font-semibold text-gray-800 mb-3">
                            {activeTab === 'jobs' ? 'Local Jobs' : 'Local Seminars'}
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
                                No {activeTab} found in this area.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {sortedItems.map(item => (
                                    <div key={item.id} className="relative">
                                        <ListingCard
                                            item={item}
                                            type={activeTab}
                                            onClick={() => handleItemClick(item)}
                                            isSelected={selectedItem?.id === item.id}
                                        />
                                        {/* Apply button for mock jobs from agent */}
                                        {item.isMockData && activeTab === 'jobs' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleApplyClick(item);
                                                }}
                                                className="absolute bottom-3 right-3 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition-colors shadow-sm flex items-center gap-1"
                                                style={{ backgroundColor: '#114124' }}
                                                onMouseEnter={(e) => e.target.style.backgroundColor = '#0d3118'}
                                                onMouseLeave={(e) => e.target.style.backgroundColor = '#114124'}
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                </svg>
                                                Apply with AI
                                            </button>
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
                    <JobMap
                        items={sortedItems}
                        center={mapCenter}
                        onMarkerClick={handleMarkerClick}
                        selectedItem={selectedItem}
                        type={activeTab}
                    />
                    
                    {/* User Skills Badge - Positioned on map */}
                    <div className="absolute top-3 right-3 z-[1000]">
                        <SkillProfileCard skills={userSkills} compact />
                    </div>
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
