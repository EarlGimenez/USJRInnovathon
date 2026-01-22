import React, { useState } from 'react';
import ProfileCard from '../components/cards/profile/ProfileCard';
import CredentialCard from '../components/cards/profile/CredentialCard';

const ProfileView = () => {
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
            credentials
        };
        console.log('Saving profile:', profileData);
        // Here you would send the data to your backend API
        alert('Profile saved successfully!');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Header */}
                <header className="mb-6">
                    <h1 className="text-xl font-bold" style={{ color: '#181818' }}>My Profile</h1>
                </header>

                {/* Profile Card Section */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Profile Information</h2>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                                <input
                                    type="text"
                                    value={profile.firstName}
                                    onChange={(e) => handleProfileChange('firstName', e.target.value)}
                                    placeholder="Enter first name"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                                <input
                                    type="text"
                                    value={profile.lastName}
                                    onChange={(e) => handleProfileChange('lastName', e.target.value)}
                                    placeholder="Enter last name"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Profile Picture</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload('profilePicture', e)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Cover Photo</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload('coverPhoto', e)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                                        onFocus={(e) => e.target.style.borderColor = '#114124'}
                                        onBlur={(e) => e.target.style.borderColor = ''}
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                                        onFocus={(e) => e.target.style.borderColor = '#114124'}
                                        onBlur={(e) => e.target.style.borderColor = ''}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Organization/Company</label>
                                    <input
                                        type="text"
                                        value={currentCredential.organization}
                                        onChange={(e) => handleCredentialChange('organization', e.target.value)}
                                        placeholder="e.g., Google, Coursera, Personal Project"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                                        onFocus={(e) => e.target.style.borderColor = '#114124'}
                                        onBlur={(e) => e.target.style.borderColor = ''}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                    <textarea
                                        value={currentCredential.description}
                                        onChange={(e) => handleCredentialChange('description', e.target.value)}
                                        placeholder="Describe your role, achievements, or project details"
                                        rows="4"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                                        onFocus={(e) => e.target.style.borderColor = '#114124'}
                                        onBlur={(e) => e.target.style.borderColor = ''}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                                        <input
                                            type="month"
                                            value={currentCredential.startDate}
                                            onChange={(e) => handleCredentialChange('startDate', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                                            onFocus={(e) => e.target.style.borderColor = '#114124'}
                                            onBlur={(e) => e.target.style.borderColor = ''}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                                        <input
                                            type="month"
                                            value={currentCredential.endDate}
                                            onChange={(e) => handleCredentialChange('endDate', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                                            onFocus={(e) => e.target.style.borderColor = '#114124'}
                                            onBlur={(e) => e.target.style.borderColor = ''}
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-sm"
                                        onFocus={(e) => e.target.style.borderColor = '#114124'}
                                        onBlur={(e) => e.target.style.borderColor = ''}
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
                            <p className="text-gray-500 text-center py-8">No credentials added yet. Click "Add Credential" to get started.</p>
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
