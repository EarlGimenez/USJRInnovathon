import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import SkillRadarChart from '../components/charts/SkillRadarChart';
import { useSkills } from '../context/SkillContext';

export default function JobDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { userSkills, calculateMatchPercentage } = useSkills();
    
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchJobDetails();
    }, [id]);

    const fetchJobDetails = async () => {
        setLoading(true);
        try {
            // Include search context from URL parameters
            const query = searchParams.get('query') || 'developer';
            const city = searchParams.get('city') || 'Manila';
            const lat = searchParams.get('lat') || '14.5995';
            const lng = searchParams.get('lng') || '120.9842';
            
            const response = await axios.get(`/api/jobs/${id}`, {
                params: { query, city, lat, lng }
            });
            setJob(response.data.job);
        } catch (error) {
            console.error('Error fetching job details:', error);
            // Use mock data for demo
            setJob(getMockJob(id));
        }
        setLoading(false);
    };

    const handleApply = () => {
        // In a real app, this would open an application modal or redirect
        alert('Application submitted! (Demo)');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#114124' }}></div>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <p className="text-gray-500 mb-4">Job not found</p>
                <button 
                    onClick={() => navigate('/')}
                    style={{ color: '#114124' }}
                    className="hover:underline"
                >
                    Back to Map
                </button>
            </div>
        );
    }

    const matchPercentage = calculateMatchPercentage(job.requiredSkills || {});

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <button 
                            onClick={() => navigate('/')}
                            className="mr-3 p-2 hover:bg-gray-100 rounded-full"
                        >
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <h1 className="text-lg font-semibold text-gray-900">Job Description & Skills</h1>
                    </div>
                    <img src="/lookal_logo.png" alt="Lookal" className="h-7" />
                </div>
            </header>

            {/* Content */}
            <div className="p-4 pb-24">
                {/* Job Title Section */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">
                        Job Details: {job.title}
                    </h2>
                    <p className="text-gray-600">{job.company}</p>
                    <p className="text-gray-500 text-sm">{job.location}</p>
                    
                    {/* Match Badge */}
                    <div className="mt-3 inline-flex items-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            matchPercentage >= 80 ? 'bg-green-100 text-green-800' :
                            matchPercentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                        }`}>
                            {matchPercentage}% Match
                        </span>
                        {job.type && (
                            <span className="ml-3 px-2 py-1 rounded text-sm" style={{ backgroundColor: '#e8f5e9', color: '#114124' }}>
                                {job.type}
                            </span>
                        )}
                    </div>
                </div>

                {/* Description Section */}
                <section className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                        <span className="w-1 h-5 mr-2 rounded" style={{ backgroundColor: '#114124' }}></span>
                        Description
                    </h3>
                    <p className="text-gray-700 leading-relaxed">{job.description}</p>
                </section>

                {/* Responsibilities Section */}
                {job.responsibilities && (
                    <section className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                            <span className="w-1 h-5 mr-2 rounded" style={{ backgroundColor: '#114124' }}></span>
                            Responsibilities
                        </h3>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                            {job.responsibilities.map((item, index) => (
                                <li key={index}>{item}</li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* Qualifications Section */}
                {job.qualifications && (
                    <section className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                            <span className="w-1 h-5 mr-2 rounded" style={{ backgroundColor: '#114124' }}></span>
                            Qualifications
                        </h3>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                            {job.qualifications.map((item, index) => (
                                <li key={index}>{item}</li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* Skills Radar Chart */}
                <section className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <span className="w-1 h-5 mr-2 rounded" style={{ backgroundColor: '#114124' }}></span>
                        Qualifications
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <SkillRadarChart 
                            userSkills={userSkills}
                            requiredSkills={job.requiredSkills || {}}
                        />
                        <div className="flex justify-center gap-6 mt-4 text-sm">
                            <div className="flex items-center">
                                <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#114124' }}></span>
                                Required Skills
                            </div>
                            <div className="flex items-center">
                                <span className="w-3 h-3 rounded-full mr-2 border-2 border-dashed" style={{ backgroundColor: '#8bc34a', borderColor: '#689f38' }}></span>
                                User Skills
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Apply Button - Fixed at bottom */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
                <button
                    onClick={handleApply}
                    className="w-full text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    style={{ backgroundColor: '#114124' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#0d3118'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#114124'}
                >
                    Apply Now
                </button>
            </div>
        </div>
    );
}

// Mock job data for demo
function getMockJob(id) {
    const jobs = {
        '1': {
            id: 1,
            title: 'UX Designer',
            company: 'TechCorp Cebu',
            location: 'IT Park, Cebu City',
            salary: '₱35,000 - ₱50,000',
            type: 'Full-time',
            description: 'We are looking for a creative UX Designer to join our growing team. You will be responsible for creating intuitive and engaging user experiences for our web and mobile applications.',
            responsibilities: [
                'Create user flows, wireframes, and prototypes',
                'Conduct user research and usability testing',
                'Collaborate with developers and product managers',
                'Design responsive interfaces for web and mobile',
                'Maintain design systems and documentation'
            ],
            qualifications: [
                '2+ years of UX design experience',
                'Proficiency in Figma or similar design tools',
                'Strong portfolio demonstrating UX process',
                'Excellent communication skills',
                'Bachelor\'s degree in Design or related field'
            ],
            requiredSkills: { Design: 80, Prototyping: 70, Tools: 60, Research: 50, Communication: 65 }
        },
        '2': {
            id: 2,
            title: 'Frontend Developer',
            company: 'WebStudio Inc.',
            location: 'Ayala Center, Cebu',
            salary: '₱40,000 - ₱60,000',
            type: 'Full-time',
            description: 'Seeking experienced frontend developer proficient in React to build modern web applications for our clients.',
            responsibilities: [
                'Develop responsive web applications using React',
                'Write clean, maintainable code',
                'Collaborate with designers and backend developers',
                'Optimize applications for performance',
                'Participate in code reviews'
            ],
            qualifications: [
                '3+ years of frontend development experience',
                'Expert knowledge of React and JavaScript',
                'Familiarity with modern CSS and build tools',
                'Experience with REST APIs',
                'Good problem-solving skills'
            ],
            requiredSkills: { Design: 50, Prototyping: 60, Tools: 85, Research: 40, Communication: 55 }
        }
    };
    
    return jobs[id] || jobs['1'];
}
