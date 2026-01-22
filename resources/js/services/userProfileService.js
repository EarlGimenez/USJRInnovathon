import axios from 'axios';

/**
 * User Profile Service
 * Manages saving and loading user profiles without authentication
 */

/**
 * Get the latest user profile
 * @returns {Promise<Object|null>}
 */
export async function getLatestProfile() {
    try {
        const response = await axios.get('/api/profile');
        return response.data.profile;
    } catch (error) {
        console.error('Error loading profile:', error);
        return null;
    }
}

/**
 * Save user profile
 * @param {Object} profileData
 * @returns {Promise<Object>}
 */
export async function saveProfile(profileData) {
    try {
        console.log('📤 Sending profile to API:', profileData);
        const response = await axios.post('/api/profile', profileData);
        console.log('✅ API Response:', response.data);
        return response.data.profile;
    } catch (error) {
        console.error('❌ Error saving profile:', error);
        console.error('Error details:', error.response?.data);
        throw error;
    }
}

/**
 * Update profile with extracted skills from prompt
 * @param {Object} extractedData - Data extracted from AI agents
 * @param {Object} currentProfile - Current profile data
 * @returns {Promise<Object>}
 */
export async function updateProfileFromPrompt(extractedData, currentProfile = null) {
    const updatedProfile = {
        name: currentProfile?.name || 'Anonymous User',
        location: extractedData.location || currentProfile?.location || 'Cebu',
        job_type: extractedData.jobType || currentProfile?.job_type,
        experience_level: extractedData.experience || currentProfile?.experience_level,
        skills: {
            ...(currentProfile?.skills || {}),
            // Add new skills with default proficiency if not already present
            ...extractedData.skills?.reduce((acc, skill) => {
                if (!currentProfile?.skills?.[skill]) {
                    acc[skill] = 50; // Default proficiency
                }
                return acc;
            }, {})
        }
    };
    
    return await saveProfile(updatedProfile);
}

/**
 * Get default profile if none exists
 * @returns {Object}
 */
export function getDefaultProfile() {
    return {
        name: 'Anonymous User',
        location: 'Cebu',
        skills: {
            'Design': 50,
            'Prototyping': 50,
            'Communication': 50
        },
        job_type: null,
        experience_level: 'entry'
    };
}
