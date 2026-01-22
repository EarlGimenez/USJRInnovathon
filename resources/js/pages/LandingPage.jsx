import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AgentPromptBox from '../components/agent/AgentPromptBox';
import LoadingSequence from '../components/agent/LoadingSequence';

export default function LandingPage() {
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [extractedData, setExtractedData] = useState(null);

    const handleManualSearch = () => {
        navigate('/map');
    };

    const handlePromptSubmit = async (prompt) => {
        setIsProcessing(true);
        
        // Extract skills and preferences from the user's prompt
        const extracted = extractSkillsFromPrompt(prompt);
        setExtractedData(extracted);
    };

    const handleLoadingComplete = () => {
        // Navigate to map with the extracted data
        navigate('/map', { 
            state: { 
                agentData: extractedData,
                fromAgent: true 
            } 
        });
    };

    if (isProcessing) {
        return (
            <LoadingSequence 
                extractedData={extractedData}
                onComplete={handleLoadingComplete}
            />
        );
    }

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header */}
            <header className="py-6 px-4">
                <div className="max-w-4xl mx-auto flex justify-center">
                    <img src="/lookal_logo.png" alt="Lookal" className="h-12" />
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center px-4 pb-12">
                <div className="w-full max-w-2xl">
                    {/* Hero Section */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6" style={{ backgroundColor: '#e8f5e9' }}>
                            <svg className="w-10 h-10" style={{ color: '#114124' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: '#181818' }}>
                            Tell me about yourself
                        </h2>
                        <p className="text-gray-600 max-w-md mx-auto">
                            Describe your skills, experience, and what you're looking for. 
                            Our AI will find the perfect job matches for you.
                        </p>
                    </div>

                    {/* Agent Prompt Box */}
                    <AgentPromptBox onSubmit={handlePromptSubmit} />

                    {/* Divider */}
                    <div className="flex items-center my-8">
                        <div className="flex-1 border-t border-gray-300"></div>
                        <span className="px-4 text-sm text-gray-500">or</span>
                        <div className="flex-1 border-t border-gray-300"></div>
                    </div>

                    {/* Manual Search Button */}
                    <button
                        onClick={handleManualSearch}
                        className="w-full py-4 px-6 border-2 rounded-xl font-medium transition-all flex items-center justify-center gap-3"
                        style={{ borderColor: '#114124', color: '#114124' }}
                        onMouseEnter={(e) => { e.target.style.backgroundColor = '#e8f5e9'; }}
                        onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; }}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Manually Search for Jobs
                    </button>

                    {/* Example prompts */}
                    <div className="mt-8">
                        <p className="text-sm text-gray-500 text-center mb-3">Try saying something like:</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {[
                                "I'm a UX designer with 3 years experience",
                                "I know React and Node.js",
                                "Fresh graduate in Computer Science",
                                "I'm good at communication and leadership"
                            ].map((example, i) => (
                                <span 
                                    key={i}
                                    className="px-3 py-1.5 bg-gray-100 rounded-full text-xs text-gray-600 hover:bg-gray-200 cursor-pointer transition-colors"
                                    onClick={() => document.querySelector('textarea')?.focus()}
                                >
                                    "{example}"
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-4 text-center text-xs text-gray-400">
                Powered by AI • Lookal 2026
            </footer>
        </div>
    );
}

// Extract skills from natural language prompt
function extractSkillsFromPrompt(prompt) {
    const promptLower = prompt.toLowerCase();
    const skills = {
        Design: 30,
        Prototyping: 30,
        Tools: 30,
        Research: 30,
        Communication: 30
    };

    // Design-related keywords
    const designKeywords = ['design', 'designer', 'ui', 'ux', 'ui/ux', 'graphic', 'creative', 'visual', 'adobe', 'photoshop', 'illustrator', 'canva', 'branding'];
    designKeywords.forEach(kw => {
        if (promptLower.includes(kw)) skills.Design = Math.min(95, skills.Design + 15);
    });

    // Prototyping keywords
    const prototypeKeywords = ['figma', 'sketch', 'prototype', 'prototyping', 'wireframe', 'mockup', 'invision', 'xd', 'adobe xd', 'framer'];
    prototypeKeywords.forEach(kw => {
        if (promptLower.includes(kw)) skills.Prototyping = Math.min(95, skills.Prototyping + 15);
    });

    // Tools/Technical keywords
    const toolsKeywords = ['react', 'node', 'javascript', 'python', 'java', 'code', 'coding', 'programming', 'developer', 'software', 'html', 'css', 'git', 'api', 'database', 'sql', 'typescript', 'vue', 'angular', 'laravel', 'php'];
    toolsKeywords.forEach(kw => {
        if (promptLower.includes(kw)) skills.Tools = Math.min(95, skills.Tools + 12);
    });

    // Research keywords
    const researchKeywords = ['research', 'analysis', 'data', 'analytics', 'user research', 'market', 'survey', 'study', 'insights', 'testing', 'usability'];
    researchKeywords.forEach(kw => {
        if (promptLower.includes(kw)) skills.Research = Math.min(95, skills.Research + 15);
    });

    // Communication keywords
    const commKeywords = ['communication', 'leadership', 'team', 'manage', 'management', 'presentation', 'writing', 'client', 'collaboration', 'agile', 'scrum', 'mentor'];
    commKeywords.forEach(kw => {
        if (promptLower.includes(kw)) skills.Communication = Math.min(95, skills.Communication + 15);
    });

    // Experience level boost
    if (promptLower.includes('senior') || promptLower.includes('lead') || promptLower.includes('manager')) {
        Object.keys(skills).forEach(k => skills[k] = Math.min(95, skills[k] + 10));
    }
    if (promptLower.includes('junior') || promptLower.includes('entry') || promptLower.includes('fresh graduate') || promptLower.includes('intern')) {
        // Keep skills modest for juniors
        Object.keys(skills).forEach(k => skills[k] = Math.min(60, skills[k]));
    }

    // Years of experience parsing
    const yearsMatch = promptLower.match(/(\d+)\s*years?/);
    if (yearsMatch) {
        const years = parseInt(yearsMatch[1]);
        const boost = Math.min(20, years * 3);
        Object.keys(skills).forEach(k => skills[k] = Math.min(95, skills[k] + boost));
    }

    // Extract job preferences
    const jobTypes = [];
    if (promptLower.includes('remote')) jobTypes.push('remote');
    if (promptLower.includes('full-time') || promptLower.includes('full time')) jobTypes.push('full-time');
    if (promptLower.includes('part-time') || promptLower.includes('part time')) jobTypes.push('part-time');
    if (promptLower.includes('freelance') || promptLower.includes('contract')) jobTypes.push('freelance');

    return {
        skills,
        prompt,
        jobTypes,
        timestamp: Date.now()
    };
}
