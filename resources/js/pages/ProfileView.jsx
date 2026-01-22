import React, { useState, useCallback } from 'react';
import ProfileCard from '../components/cards/profile/ProfileCard';
import CredentialCard from '../components/cards/profile/CredentialCard';
import { useSkills } from '../context/SkillContext';

const ProfileView = () => {
    // Resume Upload State
    const [showResumeUpload, setShowResumeUpload] = useState(true);
    const [isParsingResume, setIsParsingResume] = useState(false);
    const [parseError, setParseError] = useState(null);
    const [parsedPreview, setParsedPreview] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    // Profile State
    const [profile, setProfile] = useState({
        firstName: '',
        lastName: '',
        profilePicture: null,
        coverPhoto: null
    });

    // Skills State
    const [skills, setSkills] = useState([]);
    const [newSkill, setNewSkill] = useState('');

    // Credentials State
    const [credentials, setCredentials] = useState([]);
    const [showCredentialForm, setShowCredentialForm] = useState(false);
    const [currentCredential, setCurrentCredential] = useState({
        type: 'work',
        title: '',
        organization: '',
        description: '',
        startDate: '',
        endDate: '',
        file: null,
        fileName: ''
    });

    // Competency Ratings (from SkillContext categories)
    const [competencyRatings, setCompetencyRatings] = useState({
        Design: 0,
        Prototyping: 0,
        Tools: 0,
        Research: 0,
        Communication: 0,
        Programming: 0,
        'Data Analysis': 0,
        Leadership: 0
    });

    // Get skill context for updating global state
    const { setUserSkills } = useSkills();

    // Handle Resume Upload
    const handleResumeUpload = async (file) => {
        if (!file) return;

        // Validate file type
        const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setParseError('Invalid file type. Please upload a PDF or image file (PNG, JPG, JPEG, GIF, WEBP).');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            setParseError('File too large. Maximum size is 10MB.');
            return;
        }

        setIsParsingResume(true);
        setParseError(null);
        setParsedPreview(null);

        try {
            // Convert file to base64
            const base64Data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // Send to API
            const response = await fetch('/api/resume/parse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    resumeData: base64Data,
                    fileName: file.name
                })
            });

            const result = await response.json();

            if (!result.success) {
                setParseError(result.error || 'Failed to parse resume. Please try again.');
                return;
            }

            // Show parsed data for preview
            setParsedPreview(result.data);

        } catch (error) {
            console.error('Resume parse error:', error);
            setParseError('Failed to connect to server. Please try again.');
        } finally {
            setIsParsingResume(false);
        }
    };

    // Apply parsed resume data to profile
    const applyParsedData = () => {
        if (!parsedPreview) return;

        // Update profile
        setProfile(prev => ({
            ...prev,
            firstName: parsedPreview.firstName || prev.firstName,
            lastName: parsedPreview.lastName || prev.lastName
        }));

        // Update skills
        const skillNames = (parsedPreview.skills || []).map(s => s.name);
        setSkills(prev => [...new Set([...prev, ...skillNames])]);

        // Update credentials
        const newCredentials = (parsedPreview.credentials || []).map((cred, idx) => ({
            id: Date.now() + idx,
            type: cred.type || 'work',
            title: cred.title || '',
            organization: cred.organization || '',
            description: cred.description || '',
            startDate: cred.startDate || '',
            endDate: cred.endDate || '',
            file: null,
            fileName: ''
        }));
        setCredentials(prev => [...prev, ...newCredentials]);

        // Update competency ratings
        if (parsedPreview.competencyRatings) {
            setCompetencyRatings(prev => ({
                ...prev,
                ...parsedPreview.competencyRatings
            }));

            // Also update the global skill context
            setUserSkills(parsedPreview.competencyRatings);
        }

        // Close preview and upload section
        setParsedPreview(null);
        setShowResumeUpload(false);
    };

    // Drag and drop handlers
    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleResumeUpload(e.dataTransfer.files[0]);
        }
    }, []);

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleResumeUpload(e.target.files[0]);
        }
    };

    // Handle Profile Info Changes
    const handleProfileChange = (field, value) => {
        setProfile(prev => ({ ...prev, [field]: value }));
    };

    // Handle Image Upload
    const handleImageUpload = (field, e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfile(prev => ({ ...prev, [field]: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    // Skills Management
    const addSkill = () => {
        if (newSkill.trim()) {
            setSkills(prev => [...prev, newSkill.trim()]);
            setNewSkill('');
        }
    };

    const removeSkill = (index) => {
        setSkills(prev => prev.filter((_, i) => i !== index));
    };

    // Credentials Management
    const handleCredentialChange = (field, value) => {
        setCurrentCredential(prev => ({ ...prev, [field]: value }));
    };

    const handleCredentialFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCurrentCredential(prev => ({ 
                    ...prev, 
                    file: reader.result,
                    fileName: file.name
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const addCredential = () => {
        if (currentCredential.title && currentCredential.organization) {
            setCredentials(prev => [...prev, { ...currentCredential, id: Date.now() }]);
            setCurrentCredential({
                type: 'work',
                title: '',
                organization: '',
                description: '',
                startDate: '',
                endDate: '',
                file: null,
                fileName: ''
            });
            setShowCredentialForm(false);
        }
    };

    const deleteCredential = (id) => {
        setCredentials(prev => prev.filter(cred => cred.id !== id));
    };

    const saveProfile = () => {
        const profileData = {
            profile,
            skills,
            credentials,
            competencyRatings
        };
        console.log('Saving profile:', profileData);
        // Here you would send the data to your backend API
        alert('Profile saved successfully!');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Header */}
                <header className="mb-6 flex items-center justify-between">
                    <h1 className="text-xl font-bold" style={{ color: '#181818' }}>My Profile</h1>
                    <img src="/lookal_logo.png" alt="Lookal" className="h-8" />
                </header>

                {/* Resume Upload Quick Start Section */}
                {showResumeUpload && !parsedPreview && (
                    <section className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg shadow-sm border border-green-200 p-6 mb-6">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-lg font-semibold text-gray-800 mb-1">Expedite Your Profile Setup</h2>
                                <p className="text-gray-600 text-sm mb-4">
                                    Upload your resume and let our AI automatically extract your information, skills, and work history. 
                                    You can review and edit everything before saving.
                                </p>

                                {/* Error Message */}
                                {parseError && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                        {parseError}
                                    </div>
                                )}

                                {/* Loading State */}
                                {isParsingResume ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
                                            <p className="text-gray-600 text-sm">Analyzing your resume with AI...</p>
                                            <p className="text-gray-400 text-xs">This may take up to 30 seconds</p>
                                        </div>
                                    </div>
                                ) : (
                                    /* Drag and Drop Zone */
                                    <div
                                        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                                            dragActive 
                                                ? 'border-green-500 bg-green-50' 
                                                : 'border-gray-300 hover:border-green-400'
                                        }`}
                                        onDragEnter={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDragOver={handleDrag}
                                        onDrop={handleDrop}
                                    >
                                        <input
                                            type="file"
                                            accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,image/*,application/pdf"
                                            onChange={handleFileInput}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <div className="flex flex-col items-center gap-2">
                                            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <p className="text-gray-600 font-medium">
                                                Drop your resume here or <span className="text-green-600">browse</span>
                                            </p>
                                            <p className="text-gray-400 text-xs">Supports PDF, PNG, JPG (max 10MB)</p>
                                        </div>
                                    </div>
                                )}

                                {/* Skip Button */}
                                <button
                                    onClick={() => setShowResumeUpload(false)}
                                    className="mt-3 text-sm text-gray-500 hover:text-gray-700 underline"
                                >
                                    Skip and fill manually
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                {/* Parsed Data Preview */}
                {parsedPreview && (
                    <section className="bg-white rounded-lg shadow-sm border border-green-200 p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Resume Parsed Successfully
                        </h2>
                        
                        <div className="space-y-4">
                            {/* Name Preview */}
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-500 mb-1">Name</p>
                                <p className="font-medium">{parsedPreview.firstName} {parsedPreview.lastName}</p>
                            </div>

                            {/* Skills Preview */}
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-500 mb-2">Skills Detected ({parsedPreview.skills?.length || 0})</p>
                                <div className="flex flex-wrap gap-2">
                                    {(parsedPreview.skills || []).slice(0, 10).map((skill, idx) => (
                                        <span key={idx} className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                                            {skill.name} ({skill.rating}%)
                                        </span>
                                    ))}
                                    {(parsedPreview.skills || []).length > 10 && (
                                        <span className="px-2 py-1 text-xs text-gray-500">
                                            +{parsedPreview.skills.length - 10} more
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Credentials Preview */}
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-500 mb-2">Credentials Found ({parsedPreview.credentials?.length || 0})</p>
                                <div className="space-y-2">
                                    {(parsedPreview.credentials || []).slice(0, 3).map((cred, idx) => (
                                        <div key={idx} className="text-sm">
                                            <span className="font-medium">{cred.title}</span>
                                            <span className="text-gray-500"> at {cred.organization}</span>
                                        </div>
                                    ))}
                                    {(parsedPreview.credentials || []).length > 3 && (
                                        <p className="text-xs text-gray-500">+{parsedPreview.credentials.length - 3} more</p>
                                    )}
                                </div>
                            </div>

                            {/* Competency Ratings Preview */}
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-500 mb-2">Competency Ratings</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {Object.entries(parsedPreview.competencyRatings || {}).map(([category, rating]) => (
                                        rating > 0 && (
                                            <div key={category} className="text-sm">
                                                <span className="text-gray-600">{category}:</span>
                                                <span className="ml-1 font-medium text-green-600">{rating}%</span>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={applyParsedData}
                                className="flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors"
                                style={{ backgroundColor: '#114124' }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#0d3118'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#114124'}
                            >
                                Apply & Continue Editing
                            </button>
                            <button
                                onClick={() => setParsedPreview(null)}
                                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Try Another File
                            </button>
                        </div>
                    </section>
                )}

                {/* Profile Card Section */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-800">Profile Information</h2>
                        {!showResumeUpload && !parsedPreview && (
                            <button
                                onClick={() => setShowResumeUpload(true)}
                                className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Upload Resume
                            </button>
                        )}
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                                <input
                                    type="text"
                                    value={profile.firstName}
                                    onChange={(e) => handleProfileChange('firstName', e.target.value)}
                                    placeholder="Enter first name"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                                <input
                                    type="text"
                                    value={profile.lastName}
                                    onChange={(e) => handleProfileChange('lastName', e.target.value)}
                                    placeholder="Enter last name"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Profile Picture</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload('profilePicture', e)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Cover Photo</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload('coverPhoto', e)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                            />
                        </div>
                    </div>
                    {profile.firstName && profile.lastName && (
                        <div className="mt-6">
                            <ProfileCard
                                firstName={profile.firstName}
                                lastName={profile.lastName}
                                profilePicture={profile.profilePicture}
                                coverPhoto={profile.coverPhoto}
                            />
                        </div>
                    )}
                </section>

                {/* Competency Ratings Section */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Competency Ratings</h2>
                    <p className="text-sm text-gray-500 mb-4">
                        These ratings are auto-generated from your resume. You can adjust them manually.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(competencyRatings).map(([category, rating]) => (
                            <div key={category} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-gray-700">{category}</span>
                                    <span className="text-gray-500">{rating}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={rating}
                                    onChange={(e) => setCompetencyRatings(prev => ({
                                        ...prev,
                                        [category]: parseInt(e.target.value)
                                    }))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                                />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Skills Section */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Skills</h2>
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            placeholder="Enter a skill"
                            onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                        <button 
                            onClick={addSkill} 
                            className="px-4 py-2 text-white rounded-lg transition-colors font-medium"
                            style={{ backgroundColor: '#114124' }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#0d3118'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#114124'}
                        >
                            Add Skill
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {skills.map((skill, index) => (
                            <div key={index} className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: '#e8f5e9', color: '#114124', border: '1px solid #a5d6a7' }}>
                                <span className="text-sm font-medium">{skill}</span>
                                <button 
                                    onClick={() => removeSkill(index)} 
                                    className="font-bold text-lg leading-none"
                                    style={{ color: '#114124' }}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                    {skills.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No skills added yet. Add skills manually or upload your resume.</p>
                    )}
                </section>

                {/* Credentials Section */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-800">Credentials</h2>
                        <button 
                            onClick={() => setShowCredentialForm(!showCredentialForm)} 
                            className="px-4 py-2 text-white rounded-lg transition-colors font-medium text-sm"
                            style={{ backgroundColor: '#114124' }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#0d3118'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#114124'}
                        >
                            {showCredentialForm ? 'Cancel' : 'Add Credential'}
                        </button>
                    </div>

                    {/* Credential Form */}
                    {showCredentialForm && (
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                                    <select
                                        value={currentCredential.type}
                                        onChange={(e) => handleCredentialChange('type', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    >
                                        <option value="work">Work Experience</option>
                                        <option value="certificate">Certificate</option>
                                        <option value="project">Project</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                                    <input
                                        type="text"
                                        value={currentCredential.title}
                                        onChange={(e) => handleCredentialChange('title', e.target.value)}
                                        placeholder="e.g., Software Engineer, AWS Certification, E-commerce Website"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Organization/Company</label>
                                    <input
                                        type="text"
                                        value={currentCredential.organization}
                                        onChange={(e) => handleCredentialChange('organization', e.target.value)}
                                        placeholder="e.g., Google, Coursera, Personal Project"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                    <textarea
                                        value={currentCredential.description}
                                        onChange={(e) => handleCredentialChange('description', e.target.value)}
                                        placeholder="Describe your role, achievements, or project details"
                                        rows="4"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                                        <input
                                            type="month"
                                            value={currentCredential.startDate}
                                            onChange={(e) => handleCredentialChange('startDate', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                                        <input
                                            type="month"
                                            value={currentCredential.endDate}
                                            onChange={(e) => handleCredentialChange('endDate', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        />
                                        <small className="text-gray-500 text-xs mt-1 block">Leave empty if currently ongoing</small>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Upload Certificate/Document (PNG or PDF)
                                    </label>
                                    <input
                                        type="file"
                                        accept=".png,.pdf,image/png,application/pdf"
                                        onChange={handleCredentialFileUpload}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                    />
                                    {currentCredential.fileName && (
                                        <p className="text-sm mt-2" style={{ color: '#114124' }}>
                                            ✓ {currentCredential.fileName}
                                        </p>
                                    )}
                                </div>
                                <button 
                                    onClick={addCredential} 
                                    className="w-full px-4 py-2 text-white rounded-lg transition-colors font-medium"
                                    style={{ backgroundColor: '#114124' }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#0d3118'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#114124'}
                                >
                                    Save Credential
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Credentials List */}
                    <div className="space-y-3">
                        {credentials.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No credentials added yet. Click "Add Credential" to get started or upload your resume.</p>
                        ) : (
                            credentials.map((cred) => (
                                <CredentialCard
                                    key={cred.id}
                                    type={cred.type}
                                    title={cred.title}
                                    organization={cred.organization}
                                    description={cred.description}
                                    startDate={cred.startDate}
                                    endDate={cred.endDate}
                                    file={cred.file}
                                    fileName={cred.fileName}
                                    onDelete={() => deleteCredential(cred.id)}
                                />
                            ))
                        )}
                    </div>
                </section>

                {/* Save Button */}
                <div className="flex justify-end">
                    <button 
                        onClick={saveProfile} 
                        className="px-6 py-3 text-white rounded-lg transition-colors font-medium shadow-sm"
                        style={{ backgroundColor: '#114124' }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#0d3118'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#114124'}
                    >
                        Save Profile
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileView;
