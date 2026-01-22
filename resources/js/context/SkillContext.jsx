import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const SkillContext = createContext(null);

// Expanded skill categories for better course/job matching
const SKILL_CATEGORIES = [
    'Design',
    'Prototyping', 
    'Tools',
    'Research',
    'Communication',
    'Programming',
    'Data Analysis',
    'Leadership'
];

// Core skills shown in radar chart (keeping original 5 for visual consistency)
const RADAR_SKILLS = [
    'Design',
    'Prototyping', 
    'Tools',
    'Research',
    'Communication'
];

// Generate random skill percentages
const generateRandomSkills = () => {
    const skills = {};
    SKILL_CATEGORIES.forEach(skill => {
        // Random value between 20-95 for more realistic demo
        skills[skill] = Math.floor(Math.random() * 76) + 20;
    });
    return skills;
};

// Get weak skills (below threshold)
const getWeakSkills = (skills, threshold = 50) => {
    if (!skills) return [];
    return Object.entries(skills)
        .filter(([_, level]) => level < threshold)
        .sort((a, b) => a[1] - b[1])
        .map(([skill, level]) => ({ skill, level }));
};

// Get strong skills (above threshold)
const getStrongSkills = (skills, threshold = 70) => {
    if (!skills) return [];
    return Object.entries(skills)
        .filter(([_, level]) => level >= threshold)
        .sort((a, b) => b[1] - a[1])
        .map(([skill, level]) => ({ skill, level }));
};

export function SkillProvider({ children }) {
    const [userSkills, setUserSkills] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        initializeSession();
    }, []);

    const initializeSession = async () => {
        // Check localStorage for existing session
        const storedSession = localStorage.getItem('skillmatch_session');
        
        if (storedSession) {
            const parsed = JSON.parse(storedSession);
            setUserSkills(parsed.skills);
            setSessionId(parsed.sessionId);
            setLoading(false);
            return;
        }

        // Create new session with random skills
        try {
            const response = await axios.post('/api/session', {
                skills: generateRandomSkills()
            });
            
            const { sessionId, skills } = response.data;
            
            // Store in localStorage
            localStorage.setItem('skillmatch_session', JSON.stringify({
                sessionId,
                skills
            }));
            
            setUserSkills(skills);
            setSessionId(sessionId);
        } catch (error) {
            // Fallback to client-side only if API fails
            console.error('Session API error, using local fallback:', error);
            const skills = generateRandomSkills();
            const fallbackSessionId = 'local_' + Date.now();
            
            localStorage.setItem('skillmatch_session', JSON.stringify({
                sessionId: fallbackSessionId,
                skills
            }));
            
            setUserSkills(skills);
            setSessionId(fallbackSessionId);
        }
        
        setLoading(false);
    };

    const updateSkill = (skillName, increment) => {
        setUserSkills(prev => {
            const newSkills = {
                ...prev,
                [skillName]: Math.min(100, (prev[skillName] || 0) + increment)
            };
            
            // Update localStorage
            const stored = JSON.parse(localStorage.getItem('skillmatch_session') || '{}');
            stored.skills = newSkills;
            localStorage.setItem('skillmatch_session', JSON.stringify(stored));
            
            return newSkills;
        });
    };

    const calculateMatchPercentage = (requiredSkills) => {
        if (!userSkills || !requiredSkills) return 0;
        
        let totalMatch = 0;
        let skillCount = 0;
        
        Object.entries(requiredSkills).forEach(([skill, required]) => {
            const userLevel = userSkills[skill] || 0;
            // Calculate how well user meets requirement (capped at 100%)
            const match = Math.min(100, (userLevel / required) * 100);
            totalMatch += match;
            skillCount++;
        });
        
        return skillCount > 0 ? Math.round(totalMatch / skillCount) : 0;
    };

    const resetSession = () => {
        localStorage.removeItem('skillmatch_session');
        setUserSkills(null);
        setSessionId(null);
        setLoading(true);
        initializeSession();
    };

    // Allow setting skills directly (e.g., from AI agent)
    const updateAllSkills = (newSkills) => {
        setUserSkills(newSkills);
        
        // Update localStorage
        const stored = JSON.parse(localStorage.getItem('skillmatch_session') || '{}');
        stored.skills = newSkills;
        localStorage.setItem('skillmatch_session', JSON.stringify(stored));
    };

    return (
        <SkillContext.Provider value={{
            userSkills,
            sessionId,
            loading,
            updateSkill,
            setUserSkills: updateAllSkills,
            calculateMatchPercentage,
            resetSession,
            getWeakSkills: () => getWeakSkills(userSkills),
            getStrongSkills: () => getStrongSkills(userSkills),
            SKILL_CATEGORIES,
            RADAR_SKILLS
        }}>
            {children}
        </SkillContext.Provider>
    );
}

export const useSkills = () => {
    const context = useContext(SkillContext);
    if (!context) {
        throw new Error('useSkills must be used within a SkillProvider');
    }
    return context;
};
