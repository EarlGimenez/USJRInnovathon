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
        endDate: ''
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

    const addCredential = () => {
        if (currentCredential.title && currentCredential.organization) {
            setCredentials(prev => [...prev, { ...currentCredential, id: Date.now() }]);
            setCurrentCredential({
                type: 'work',
                title: '',
                organization: '',
                description: '',
                startDate: '',
                endDate: ''
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
        <div className="profile-view">
            <div className="profile-container">
                <h1>My Profile</h1>

                {/* Profile Card Section */}
                <section className="profile-section">
                    <h2>Profile Information</h2>
                    <div className="profile-inputs">
                        <div className="input-group">
                            <label>First Name</label>
                            <input
                                type="text"
                                value={profile.firstName}
                                onChange={(e) => handleProfileChange('firstName', e.target.value)}
                                placeholder="Enter first name"
                            />
                        </div>
                        <div className="input-group">
                            <label>Last Name</label>
                            <input
                                type="text"
                                value={profile.lastName}
                                onChange={(e) => handleProfileChange('lastName', e.target.value)}
                                placeholder="Enter last name"
                            />
                        </div>
                        <div className="input-group">
                            <label>Profile Picture</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload('profilePicture', e)}
                            />
                        </div>
                        <div className="input-group">
                            <label>Cover Photo</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload('coverPhoto', e)}
                            />
                        </div>
                    </div>
                    {profile.firstName && profile.lastName && (
                        <ProfileCard
                            firstName={profile.firstName}
                            lastName={profile.lastName}
                            profilePicture={profile.profilePicture}
                            coverPhoto={profile.coverPhoto}
                        />
                    )}
                </section>

                {/* Skills Section */}
                <section className="skills-section">
                    <h2>Skills</h2>
                    <div className="skills-input">
                        <input
                            type="text"
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            placeholder="Enter a skill"
                            onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                        />
                        <button onClick={addSkill} className="btn-add">Add Skill</button>
                    </div>
                    <div className="skills-list">
                        {skills.map((skill, index) => (
                            <div key={index} className="skill-tag">
                                <span>{skill}</span>
                                <button onClick={() => removeSkill(index)} className="btn-remove">×</button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Credentials Section */}
                <section className="credentials-section">
                    <div className="section-header">
                        <h2>Credentials</h2>
                        <button 
                            onClick={() => setShowCredentialForm(!showCredentialForm)} 
                            className="btn-add-credential"
                        >
                            {showCredentialForm ? 'Cancel' : 'Add Credential'}
                        </button>
                    </div>

                    {/* Credential Form */}
                    {showCredentialForm && (
                        <div className="credential-form">
                            <div className="input-group">
                                <label>Type</label>
                                <select
                                    value={currentCredential.type}
                                    onChange={(e) => handleCredentialChange('type', e.target.value)}
                                >
                                    <option value="work">Work Experience</option>
                                    <option value="certificate">Certificate</option>
                                    <option value="project">Project</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Title</label>
                                <input
                                    type="text"
                                    value={currentCredential.title}
                                    onChange={(e) => handleCredentialChange('title', e.target.value)}
                                    placeholder="e.g., Software Engineer, AWS Certification, E-commerce Website"
                                />
                            </div>
                            <div className="input-group">
                                <label>Organization/Company</label>
                                <input
                                    type="text"
                                    value={currentCredential.organization}
                                    onChange={(e) => handleCredentialChange('organization', e.target.value)}
                                    placeholder="e.g., Google, Coursera, Personal Project"
                                />
                            </div>
                            <div className="input-group">
                                <label>Description</label>
                                <textarea
                                    value={currentCredential.description}
                                    onChange={(e) => handleCredentialChange('description', e.target.value)}
                                    placeholder="Describe your role, achievements, or project details"
                                    rows="4"
                                />
                            </div>
                            <div className="date-inputs">
                                <div className="input-group">
                                    <label>Start Date</label>
                                    <input
                                        type="month"
                                        value={currentCredential.startDate}
                                        onChange={(e) => handleCredentialChange('startDate', e.target.value)}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>End Date</label>
                                    <input
                                        type="month"
                                        value={currentCredential.endDate}
                                        onChange={(e) => handleCredentialChange('endDate', e.target.value)}
                                    />
                                    <small>Leave empty if currently ongoing</small>
                                </div>
                            </div>
                            <button onClick={addCredential} className="btn-save-credential">
                                Save Credential
                            </button>
                        </div>
                    )}

                    {/* Credentials List */}
                    <div className="credentials-list">
                        {credentials.length === 0 ? (
                            <p className="empty-state">No credentials added yet. Click "Add Credential" to get started.</p>
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
                                    onDelete={() => deleteCredential(cred.id)}
                                />
                            ))
                        )}
                    </div>
                </section>

                {/* Save Button */}
                <div className="profile-actions">
                    <button onClick={saveProfile} className="btn-save-profile">
                        Save Profile
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileView;
