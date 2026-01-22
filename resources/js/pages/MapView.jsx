import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import JobMap from '../components/map/JobMap';
import ToggleTabs from '../components/ui/ToggleTabs';
import SearchBar from '../components/ui/SearchBar';
import ListingCard from '../components/cards/ListingCard';
import SkillProfileCard from '../components/cards/SkillProfileCard';
import { useSkills } from '../context/SkillContext';

export default function MapView() {
    const navigate = useNavigate();
    const { userSkills, calculateMatchPercentage, loading: skillsLoading } = useSkills();
    
    const [activeTab, setActiveTab] = useState('jobs'); // 'jobs' or 'seminars'
    const [searchQuery, setSearchQuery] = useState('');
    const [jobs, setJobs] = useState([]);
    const [seminars, setSeminars] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mapCenter, setMapCenter] = useState([10.3157, 123.8854]); // Cebu City

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'jobs') {
                const response = await axios.get('/api/jobs', {
                    params: { query: searchQuery, lat: mapCenter[0], lng: mapCenter[1] }
                });
                setJobs(response.data.jobs || []);
            } else {
                const response = await axios.get('/api/seminars', {
                    params: { query: searchQuery }
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
            navigate(`/job/${item.id}`);
        } else {
            navigate(`/seminar/${item.id}`);
        }
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

    if (skillsLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-white">
            {/* Header */}
            <header className="px-4 pt-4 pb-2 bg-white border-b border-gray-100">
                <h1 className="text-xl font-bold text-gray-900 mb-3">
                    {activeTab === 'jobs' ? 'Local Jobs Map' : 'Local Seminars'}
                </h1>
                <SearchBar 
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSearch={handleSearch}
                    placeholder={`Search ${activeTab}...`}
                />
                <ToggleTabs 
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />
            </header>

            {/* Map Section */}
            <div className="flex-1 relative">
                <JobMap
                    items={sortedItems}
                    center={mapCenter}
                    onMarkerClick={handleMarkerClick}
                    selectedItem={selectedItem}
                    type={activeTab}
                />
                
                {/* User Skills Badge */}
                <div className="absolute top-3 right-3 z-[1000]">
                    <SkillProfileCard skills={userSkills} compact />
                </div>
            </div>

            {/* Listings Section */}
            <div className="bg-white border-t border-gray-200 max-h-[40vh] overflow-y-auto">
                <div className="p-4">
                    <h2 className="text-lg font-semibold text-gray-800 mb-3">
                        {activeTab === 'jobs' ? 'Local Jobs' : 'Local Seminars'}
                        <span className="text-sm font-normal text-gray-500 ml-2">
                            ({sortedItems.length} found)
                        </span>
                    </h2>
                    
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    ) : sortedItems.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">
                            No {activeTab} found in this area.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {sortedItems.map(item => (
                                <ListingCard
                                    key={item.id}
                                    item={item}
                                    type={activeTab}
                                    onClick={() => handleItemClick(item)}
                                    isSelected={selectedItem?.id === item.id}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Mock data for demo purposes
function getMockJobs() {
    return [
        {
            id: 1,
            title: 'UX Designer',
            company: 'TechCorp Cebu',
            location: 'IT Park, Cebu City',
            latitude: 10.3301,
            longitude: 123.9056,
            salary: '₱35,000 - ₱50,000',
            type: 'Full-time',
            description: 'We are looking for a creative UX Designer to join our team...',
            requiredSkills: { Design: 80, Prototyping: 70, Tools: 60, Research: 50, Communication: 65 }
        },
        {
            id: 2,
            title: 'Frontend Developer',
            company: 'WebStudio Inc.',
            location: 'Ayala Center, Cebu',
            latitude: 10.3181,
            longitude: 123.9050,
            salary: '₱40,000 - ₱60,000',
            type: 'Full-time',
            description: 'Seeking experienced frontend developer proficient in React...',
            requiredSkills: { Design: 50, Prototyping: 60, Tools: 85, Research: 40, Communication: 55 }
        },
        {
            id: 3,
            title: 'Product Manager',
            company: 'StartupHub',
            location: 'Mandaue City',
            latitude: 10.3236,
            longitude: 123.9223,
            salary: '₱50,000 - ₱80,000',
            type: 'Full-time',
            description: 'Lead product development and work with cross-functional teams...',
            requiredSkills: { Design: 45, Prototyping: 55, Tools: 50, Research: 75, Communication: 85 }
        },
        {
            id: 4,
            title: 'Graphic Designer',
            company: 'Creative Agency',
            location: 'Lahug, Cebu City',
            latitude: 10.3256,
            longitude: 123.8892,
            salary: '₱25,000 - ₱35,000',
            type: 'Part-time',
            description: 'Create visual content for marketing campaigns...',
            requiredSkills: { Design: 90, Prototyping: 40, Tools: 75, Research: 30, Communication: 50 }
        },
        {
            id: 5,
            title: 'Junior Web Developer',
            company: 'Digital Solutions',
            location: 'Banilad, Cebu City',
            latitude: 10.3422,
            longitude: 123.9102,
            salary: '₱20,000 - ₱30,000',
            type: 'Full-time',
            description: 'Entry level position for web development...',
            requiredSkills: { Design: 35, Prototyping: 45, Tools: 60, Research: 35, Communication: 45 }
        }
    ];
}

function getMockSeminars() {
    return [
        {
            id: 1,
            title: 'Tech Workshop',
            organizer: 'Cebu IT Association',
            location: 'NS Design Center',
            latitude: 10.3157,
            longitude: 123.8854,
            date: 'May 25th, 2026',
            time: '9:00 AM - 5:00 PM',
            description: 'Hands-on workshop covering latest web technologies...',
            skillBoosts: { Tools: 15, Prototyping: 10 },
            attendees: 45,
            maxAttendees: 100
        },
        {
            id: 2,
            title: 'Career Fair',
            organizer: 'JobMatch PH',
            location: 'NS Grand Hotel',
            latitude: 10.3201,
            longitude: 123.8912,
            date: 'January 17, 2026',
            time: '10:00 AM - 6:00 PM',
            description: 'Connect with top employers in Cebu...',
            skillBoosts: { Communication: 10, Research: 8 },
            attendees: 230,
            maxAttendees: 500
        },
        {
            id: 3,
            title: 'Design Thinking Workshop',
            organizer: 'UX Philippines',
            location: 'IT Park, Cebu',
            latitude: 10.3301,
            longitude: 123.9056,
            date: 'February 5, 2026',
            time: '1:00 PM - 5:00 PM',
            description: 'Learn design thinking methodologies...',
            skillBoosts: { Design: 12, Research: 10, Prototyping: 8 },
            attendees: 28,
            maxAttendees: 50
        },
        {
            id: 4,
            title: 'Communication Masterclass',
            organizer: 'Professional Skills Hub',
            location: 'Ayala Center Cebu',
            latitude: 10.3181,
            longitude: 123.9050,
            date: 'February 20, 2026',
            time: '2:00 PM - 6:00 PM',
            description: 'Enhance your professional communication skills...',
            skillBoosts: { Communication: 15 },
            attendees: 55,
            maxAttendees: 80
        }
    ];
}
