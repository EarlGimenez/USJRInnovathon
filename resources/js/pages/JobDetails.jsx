import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useSkills } from '../context/SkillContext';

export default function JobDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { userSkills, calculateMatchPercentage } = useSkills();
    
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const normalizeSkillsForApi = (skills) => {
        // Agent flow: array of skill strings
        if (Array.isArray(skills)) {
            const normalized = skills
                .map((s) => (typeof s === 'string' ? s : (s?.name ?? s?.label ?? s?.value ?? '')))
                .map((s) => (typeof s === 'string' ? s.trim() : ''))
                .filter(Boolean);
            return normalized.length > 0 ? normalized : undefined;
        }

        // Demo session: category->level map
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

        if (
            skill.includes('javascript') || skill.includes('typescript') || skill.includes('react') ||
            skill.includes('node') || skill.includes('php') || skill.includes('laravel') ||
            skill.includes('python') || skill.includes('java') || skill.includes('c#') ||
            skill.includes('html') || skill.includes('css') || skill.includes('api')
        ) return 'Programming';

        if (
            skill.includes('figma') || skill.includes('sketch') || skill.includes('adobe') ||
            skill.includes('photoshop') || skill.includes('illustrator') || skill.includes('xd') ||
            skill.includes('canva')
        ) return 'Tools';

        if (skill.includes('ui') || skill.includes('ux') || skill.includes('design') || skill.includes('wireframe')) {
            return 'Design';
        }

        if (skill.includes('prototype') || skill.includes('prototyp')) return 'Prototyping';

        if (
            skill.includes('research') || skill.includes('user testing') || skill.includes('usability') ||
            skill.includes('interview')
        ) return 'Research';

        if (
            skill.includes('sql') || skill.includes('excel') || skill.includes('tableau') ||
            skill.includes('power bi') || skill.includes('analytics') || skill.includes('data') ||
            skill.includes('statistics')
        ) return 'Data Analysis';

        if (
            skill.includes('communication') || skill.includes('collaboration') || skill.includes('teamwork') ||
            skill.includes('stakeholder') || skill.includes('presentation') || skill.includes('writing')
        ) return 'Communication';

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
                requiredByCategory[category] = 70;
            }
        });

        return Object.keys(requiredByCategory).length > 0 ? requiredByCategory : null;
    };

    useEffect(() => {
        fetchJobDetails();
    }, [id, userSkills]);

    const fetchJobDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            // Include search context from URL parameters
            const query = searchParams.get('query') || 'developer';
            const city = searchParams.get('city') || 'Manila';
            const lat = searchParams.get('lat') || '14.5995';
            const lng = searchParams.get('lng') || '120.9842';
            const radiusKm = searchParams.get('radius_km') || '3';

            const normalizedSkills = normalizeSkillsForApi(userSkills);
            
            const response = await axios.get(`/api/jobs/${id}`, {
                params: {
                    query,
                    city,
                    lat,
                    lng,
                    radius_km: radiusKm,
                    // Ensure backend can compute and return match results.
                    candidate_skills: normalizedSkills,
                }
            });
            setJob(response.data.job);
        } catch (error) {
            console.error('Error fetching job details:', error);
            setJob(null);
            setError('Unable to load job details right now.');
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
                <p className="text-gray-600 mb-4">{error || 'Job not found'}</p>
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

    const backendScore = job?.match?.score;
    let matchPercentage;
    if (typeof backendScore === 'number' && !Number.isNaN(backendScore)) {
        matchPercentage = Math.round(backendScore);
    } else if (userSkills && typeof userSkills === 'object' && !Array.isArray(userSkills)) {
        // Category-based demo profile; map required skills to categories before scoring.
        const requiredByCategory = buildCategoryRequirementsFromRequiredSkills(job.requiredSkills || {});
        matchPercentage = calculateMatchPercentage(requiredByCategory || {});
    } else {
        matchPercentage = calculateMatchPercentage(job.requiredSkills || {});
    }

    const matchBadgeClass = matchPercentage >= 80
        ? 'bg-green-100 text-green-800'
        : matchPercentage >= 60
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800';

    const matchBarColor = matchPercentage >= 80
        ? '#22c55e'
        : matchPercentage >= 60
            ? '#eab308'
            : '#ef4444';

    const matchedSkills = Array.isArray(job?.match?.matched_skills) ? job.match.matched_skills : [];
    const missingSkills = Array.isArray(job?.match?.missing_skills) ? job.match.missing_skills : [];

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
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${matchBadgeClass}`}>
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

                {/* Match Score (Bar) */}
                <section className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <span className="w-1 h-5 mr-2 rounded" style={{ backgroundColor: '#114124' }}></span>
                        Skill Match
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-700">Match score</p>
                            <p className="text-sm font-semibold text-gray-900">{matchPercentage}%</p>
                        </div>
                        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-3 rounded-full"
                                style={{ width: `${Math.max(0, Math.min(100, matchPercentage))}%`, backgroundColor: matchBarColor }}
                            />
                        </div>

                        {job?.match?.coverage_label && (
                            <p className="mt-2 text-xs text-gray-600">{job.match.coverage_label}</p>
                        )}

                        {(matchedSkills.length > 0 || missingSkills.length > 0) && (
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-gray-800 mb-2">Matched skills</p>
                                    {matchedSkills.length === 0 ? (
                                        <p className="text-xs text-gray-500">No validated matches.</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {matchedSkills.slice(0, 24).map((s) => (
                                                <span key={s} className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-800 mb-2">Missing skills</p>
                                    {missingSkills.length === 0 ? (
                                        <p className="text-xs text-gray-500">None — great coverage.</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {missingSkills.slice(0, 24).map((s) => (
                                                <span key={s} className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
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
