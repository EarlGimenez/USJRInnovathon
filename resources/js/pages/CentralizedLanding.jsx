import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SearchBar from '../components/ui/SearchBar';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export default function CentralizedLanding() {
    const [searchQuery, setSearchQuery] = useState('');
    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);

    // Fetch jobs when search query changes
    useEffect(() => {
        if (searchQuery.length >= 2) {
            fetchJobs();
        } else {
            setJobs([]);
            setShowDropdown(false);
        }
    }, [searchQuery]);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/jobs?search=${searchQuery}&limit=10`);
            setJobs(response.data.jobs || []);
            setShowDropdown(true);
        } catch (error) {
            console.error('Error fetching jobs:', error);
            // Mock data for demo
            setJobs(getMockJobs(searchQuery));
            setShowDropdown(true);
        }
        setLoading(false);
    };

    const handleJobSelect = (job) => {
        setSelectedJob(job);
        setSearchQuery(job.title);
        setShowDropdown(false);
    };

    // Generate demand/potential data
    const getDemandPotentialData = () => {
        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: 10 }, (_, i) => currentYear + i);
        
        const demandData = years.map((_, index) => {
            return 100 + (15 * index) + (Math.random() * 20 - 10);
        });

        return {
            labels: years,
            datasets: [
                {
                    label: 'Job Demand/Potential',
                    data: demandData,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    fill: true,
                    tension: 0.4,
                },
            ],
        };
    };

    // Generate abundance/scarcity data
    const getAbundanceScarcityData = () => {
        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: 10 }, (_, i) => currentYear + i);
        
        const abundanceData = years.map(() => Math.random() * 100);

        return {
            labels: years,
            datasets: [
                {
                    label: 'Abundance/Scarcity Index',
                    data: abundanceData,
                    borderColor: 'rgb(16, 185, 129)',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    fill: true,
                    tension: 0.4,
                },
            ],
        };
    };

    // Generate applicants vs job takers forecast
    const getApplicantsVsJobTakersData = () => {
        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: 10 }, (_, i) => currentYear + i);
        
        const applicantsData = years.map((_, index) => {
            return 1000 + (200 * index) + (Math.random() * 300);
        });
        
        const jobTakersData = years.map((_, index) => {
            return applicantsData[index] * (0.2 + Math.random() * 0.3); // 20-50% conversion
        });

        return {
            labels: years,
            datasets: [
                {
                    label: 'Forecasted Applicants',
                    data: applicantsData,
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    fill: true,
                    tension: 0.4,
                },
                {
                    label: 'Actual Job Takers',
                    data: jobTakersData,
                    borderColor: 'rgb(147, 51, 234)',
                    backgroundColor: 'rgba(147, 51, 234, 0.2)',
                    fill: true,
                    tension: 0.4,
                },
            ],
        };
    };

    const demandChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Job Demand/Potential Forecast',
                font: {
                    size: 16,
                    weight: 'bold',
                },
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `Demand Index: ${context.parsed.y.toFixed(1)}`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                title: {
                    display: true,
                    text: 'Demand Index',
                },
            },
            x: {
                title: {
                    display: true,
                    text: 'Year',
                },
            },
        },
    };

    const abundanceChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Abundance/Scarcity Graph',
                font: {
                    size: 16,
                    weight: 'bold',
                },
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const value = context.parsed.y;
                        const status = value > 70 ? 'Abundant' : value > 40 ? 'Balanced' : 'Scarce';
                        return `Index: ${value.toFixed(1)} (${status})`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                title: {
                    display: true,
                    text: 'Abundance Index (0=Scarce, 100=Abundant)',
                },
            },
            x: {
                title: {
                    display: true,
                    text: 'Year',
                },
            },
        },
    };

    const applicantsChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Applicants vs Actual Job Takers Forecast',
                font: {
                    size: 16,
                    weight: 'bold',
                },
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Number of People',
                },
            },
            x: {
                title: {
                    display: true,
                    text: 'Year',
                },
            },
        },
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Introduction Section */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        Career Insights Hub
                    </h1>
                    <p className="text-xl md:text-2xl mb-6 text-blue-100">
                        Explore job market trends and future demand forecasts
                    </p>
                    <p className="text-lg text-blue-100 max-w-2xl mx-auto">
                        Discover career opportunities with data-driven insights. Search for any job title 
                        to see projected market demand, growth trends, and make informed career decisions.
                    </p>
                </div>
            </div>

            {/* Search Section */}
            <div className="max-w-4xl mx-auto px-4 -mt-8">
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                        Search Job Title
                    </h2>
                    <div className="relative">
                        <SearchBar
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Enter job title (e.g., Software Engineer, Data Analyst...)"
                        />
                        
                        {/* Dropdown Results */}
                        {showDropdown && jobs.length > 0 && (
                            <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 overflow-y-auto">
                                {loading ? (
                                    <div className="p-4 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                                    </div>
                                ) : (
                                    <ul>
                                        {jobs.map((job, index) => (
                                            <li
                                                key={index}
                                                onClick={() => handleJobSelect(job)}
                                                className="p-4 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                                            >
                                                <div className="font-semibold text-gray-800">{job.title}</div>
                                                <div className="text-sm text-gray-600 mt-1">
                                                    {job.company && `${job.company} • `}
                                                    {job.location}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Forecast Graphs Section */}
            {selectedJob && (
                <div className="max-w-6xl mx-auto px-4 mt-8 mb-12">
                    <div className="bg-white rounded-xl shadow-lg p-8">
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-gray-800">
                                {selectedJob.title}
                            </h2>
                        </div>

                        {/* Demand/Potential Graph */}
                        <div className="mb-8">
                            <div className="h-80 bg-white rounded-lg p-4 border border-gray-200">
                                <Line
                                    data={getDemandPotentialData()}
                                    options={demandChartOptions}
                                />
                            </div>
                        </div>

                        {/* Abundance/Scarcity Graph */}
                        <div className="mb-8">
                            <div className="h-80 bg-white rounded-lg p-4 border border-gray-200">
                                <Line
                                    data={getAbundanceScarcityData()}
                                    options={abundanceChartOptions}
                                />
                            </div>
                        </div>

                        {/* Applicants vs Job Takers Forecast */}
                        <div className="mb-8">
                            <div className="h-80 bg-white rounded-lg p-4 border border-gray-200">
                                <Line
                                    data={getApplicantsVsJobTakersData()}
                                    options={applicantsChartOptions}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!selectedJob && (
                <div className="max-w-4xl mx-auto px-4 mt-12 mb-12">
                    <div className="text-center text-gray-500">
                        <svg 
                            className="mx-auto h-24 w-24 text-gray-400 mb-4" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={1.5} 
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
                            />
                        </svg>
                        <p className="text-lg">Search for a job title to view the demand forecast</p>
                    </div>
                </div>
            )}
        </div>
    );
}

// Mock data generator
function getMockJobs(query) {
    const mockJobs = [
        { title: 'Software Engineer', company: 'Tech Corp', location: 'San Francisco, CA', description: 'Develop and maintain software applications' },
        { title: 'Data Analyst', company: 'DataCo', location: 'New York, NY', description: 'Analyze data trends and create reports' },
        { title: 'Product Manager', company: 'Startup Inc', location: 'Austin, TX', description: 'Lead product development and strategy' },
        { title: 'UX Designer', company: 'Design Studio', location: 'Seattle, WA', description: 'Create user-centered design solutions' },
        { title: 'Marketing Manager', company: 'Brand Co', location: 'Los Angeles, CA', description: 'Develop and execute marketing strategies' },
        { title: 'DevOps Engineer', company: 'Cloud Systems', location: 'Boston, MA', description: 'Manage cloud infrastructure and deployments' },
        { title: 'Cybersecurity Analyst', company: 'SecureNet', location: 'Washington, DC', description: 'Protect systems from security threats' },
        { title: 'Machine Learning Engineer', company: 'AI Labs', location: 'San Francisco, CA', description: 'Build and deploy ML models' },
    ];

    return mockJobs.filter(job => 
        job.title.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);
}
