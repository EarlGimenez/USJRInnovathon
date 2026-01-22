import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useSkills } from '../context/SkillContext';

export default function ApplyPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { userSkills } = useSkills();
    
    const job = location.state?.job;
    const agentSkills = location.state?.agentSkills;
    const skills = agentSkills || userSkills;

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

    const computeMatchPercentage = (requiredSkills, candidateSkills) => {
        if (!requiredSkills || typeof requiredSkills !== 'object') return null;

        // Candidate is a category->level map (demo session)
        if (candidateSkills && typeof candidateSkills === 'object' && !Array.isArray(candidateSkills)) {
            const requiredByCategory = buildCategoryRequirementsFromRequiredSkills(requiredSkills);
            const effectiveRequired = requiredByCategory || requiredSkills;

            const entries = Object.entries(effectiveRequired);
            if (entries.length === 0) return null;

            let total = 0;
            let count = 0;
            for (const [skillName, required] of entries) {
                const requiredLevel = typeof required === 'number' && !Number.isNaN(required) && required > 0 ? required : 70;
                const userLevel = typeof candidateSkills[skillName] === 'number' ? candidateSkills[skillName] : 0;
                const match = Math.min(100, (userLevel / requiredLevel) * 100);
                total += match;
                count += 1;
            }

            return count > 0 ? Math.round(total / count) : null;
        }

        // Candidate is an array of skill strings (agent flow)
        if (Array.isArray(candidateSkills)) {
            const normalizedCandidate = candidateSkills
                .map((s) => (typeof s === 'string' ? s.trim().toLowerCase() : ''))
                .filter(Boolean);

            const requiredNames = Object.keys(requiredSkills)
                .map((s) => String(s).trim().toLowerCase())
                .filter(Boolean);

            if (requiredNames.length === 0) return null;
            if (normalizedCandidate.length === 0) return 0;

            const requiredSet = new Set(requiredNames);
            let matched = 0;
            for (const s of normalizedCandidate) {
                if (requiredSet.has(s)) matched += 1;
            }
            return Math.round((matched / requiredNames.length) * 100);
        }

        return null;
    };

    const backendScore = job?.match?.score;
    const matchPercentage = (typeof backendScore === 'number' && !Number.isNaN(backendScore))
        ? Math.round(backendScore)
        : (typeof job?.matchPercentage === 'number' && !Number.isNaN(job.matchPercentage))
            ? Math.round(job.matchPercentage)
            : computeMatchPercentage(job?.requiredSkills, skills);

    const matchBadgeClass = typeof matchPercentage === 'number'
        ? (matchPercentage >= 80
            ? 'bg-green-100 text-green-800'
            : matchPercentage >= 60
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800')
        : 'bg-gray-100 text-gray-700';

    const matchBarColor = typeof matchPercentage === 'number'
        ? (matchPercentage >= 80
            ? '#22c55e'
            : matchPercentage >= 60
                ? '#eab308'
                : '#ef4444')
        : '#9ca3af';
    
    const [step, setStep] = useState('compose'); // 'compose', 'sending', 'sent'
    const [userEmail, setUserEmail] = useState('');
    const [userName, setUserName] = useState('');
    const [customMessage, setCustomMessage] = useState('');

    // Redirect if no job data
    if (!job) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">No Job Selected</h2>
                    <p className="text-gray-600 mb-4">Please select a job from the map to apply.</p>
                    <Link 
                        to="/map"
                        className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors"
                        style={{ backgroundColor: '#114124' }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#0d3118'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#114124'}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Jobs
                    </Link>
                </div>
            </div>
        );
    }

    const generateCoverLetter = () => {
        const topSkills = Array.isArray(skills)
            ? skills
                .map((s) => (typeof s === 'string' ? s.trim() : (s?.name ?? s?.label ?? s?.value ?? '')))
                .map((s) => (typeof s === 'string' ? s.trim() : ''))
                .filter(Boolean)
                .slice(0, 3)
            : skills && typeof skills === 'object'
                ? Object.entries(skills)
                    .filter(([_, v]) => typeof v === 'number' && !Number.isNaN(v))
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([skill]) => skill)
                : ['Design', 'Communication', 'Tools'];

        return `Dear Hiring Manager,

I am writing to express my strong interest in the ${job.title} position at ${job.company}. With my expertise in ${topSkills.join(', ')}, I am confident I would be a valuable addition to your team.

${job.description ? `The opportunity to ${job.description.split('\n')[0].slice(0, 100).toLowerCase()}... aligns perfectly with my career goals and skill set.` : 'I am excited about this opportunity to contribute to your organization.'}

I have consistently demonstrated my abilities in:
${topSkills.map(skill => `• ${skill}: Strong proficiency with hands-on project experience`).join('\n')}

I am particularly drawn to ${job.company}'s innovative approach and would welcome the opportunity to discuss how my background and skills would benefit your team.

Thank you for considering my application. I look forward to the opportunity to discuss this position further.

Best regards,
${userName || '[Your Name]'}`;
    };

    const handleSend = async () => {
        if (!userEmail || !userName) return;
        
        setStep('sending');
        
        // Simulate sending process
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        setStep('sent');
    };

    const handleBackToJobs = () => {
        navigate('/map', { state: { fromAgent: true } });
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <img src="/lookal_logo.png" alt="Lookal" className="h-8" />
                    </Link>
                    <button
                        onClick={handleBackToJobs}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Jobs
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8">
                {step === 'compose' && (
                    <>
                        {/* Job Header Card */}
                        <div className="rounded-2xl p-6 text-white mb-6 shadow-lg" style={{ background: 'linear-gradient(to right, #114124, #0d3118)' }}>
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold mb-1">{job.title}</h2>
                                    <p className="text-white/90 text-lg">{job.company}</p>
                                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-white/80">
                                        <span className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            </svg>
                                            {job.location}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {job.salary}
                                        </span>
                                        {typeof matchPercentage === 'number' && (
                                            <span className="bg-white/20 px-2 py-1 rounded-full text-xs font-medium">
                                                {matchPercentage}% Match
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Skill Match (Bar + tags) */}
                        {typeof matchPercentage === 'number' && (
                            <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-gray-900">Skill Match</h3>
                                        <p className="text-sm text-gray-500">Based on your current profile</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${matchBadgeClass}`}>
                                        {matchPercentage}%
                                    </span>
                                </div>
                                <div className="p-6">
                                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-3 rounded-full"
                                            style={{ width: `${Math.max(0, Math.min(100, matchPercentage))}%`, backgroundColor: matchBarColor }}
                                        />
                                    </div>

                                    {(Array.isArray(job?.match?.matched_skills) || Array.isArray(job?.match?.missing_skills)) && (
                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-800 mb-2">Matched</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {(Array.isArray(job?.match?.matched_skills) ? job.match.matched_skills : [])
                                                        .slice(0, 16)
                                                        .map((s) => (
                                                            <span key={s} className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                                                {s}
                                                            </span>
                                                        ))}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-800 mb-2">Missing</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {(Array.isArray(job?.match?.missing_skills) ? job.match.missing_skills : [])
                                                        .slice(0, 16)
                                                        .map((s) => (
                                                            <span key={s} className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                                                                {s}
                                                            </span>
                                                        ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Application Form */}
                        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e8f5e9' }}>
                                    <svg className="w-5 h-5" style={{ color: '#114124' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Apply via AI Assistant</h3>
                                    <p className="text-sm text-gray-500">We'll generate a personalized cover letter for you</p>
                                </div>
                            </div>

                            <div className="p-6">
                                {/* User Info */}
                                <div className="grid md:grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Your Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={userName}
                                            onChange={(e) => setUserName(e.target.value)}
                                            placeholder="Juan Dela Cruz"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none transition-all"
                                            style={{ '&:focus': { borderColor: '#114124', ring: '2px solid #114124' } }}
                                            onFocus={(e) => { e.target.style.borderColor = '#114124'; e.target.style.boxShadow = '0 0 0 2px rgba(17,65,36,0.2)'; }}
                                            onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Your Email *
                                        </label>
                                        <input
                                            type="email"
                                            value={userEmail}
                                            onChange={(e) => setUserEmail(e.target.value)}
                                            placeholder="juan@example.com"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none transition-all"
                                            onFocus={(e) => { e.target.style.borderColor = '#114124'; e.target.style.boxShadow = '0 0 0 2px rgba(17,65,36,0.2)'; }}
                                            onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                                        />
                                    </div>
                                </div>

                                {/* Generated Cover Letter */}
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            AI-Generated Cover Letter
                                        </label>
                                        <span className="text-xs flex items-center gap-1 px-2 py-1 rounded-full" style={{ color: '#114124', backgroundColor: '#e8f5e9' }}>
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            Auto-generated based on your skills
                                        </span>
                                    </div>
                                    <textarea
                                        value={generateCoverLetter()}
                                        readOnly
                                        className="w-full h-72 px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-700 resize-none font-mono"
                                    />
                                </div>

                                {/* Additional Message */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Additional Message (Optional)
                                    </label>
                                    <textarea
                                        value={customMessage}
                                        onChange={(e) => setCustomMessage(e.target.value)}
                                        placeholder="Add any additional information you'd like to include..."
                                        className="w-full h-24 px-4 py-3 border border-gray-300 rounded-xl outline-none resize-none transition-all"
                                        onFocus={(e) => { e.target.style.borderColor = '#114124'; e.target.style.boxShadow = '0 0 0 2px rgba(17,65,36,0.2)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                                    />
                                </div>

                                {/* Disclaimer */}
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                                    <div className="flex gap-3">
                                        <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div>
                                            <p className="text-sm font-medium text-amber-800">Demo Mode</p>
                                            <p className="text-xs text-amber-700 mt-1">
                                                This is a simulated application process. In a production environment, 
                                                your application would be sent directly to the employer's recruitment system.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={handleBackToJobs}
                                        className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSend}
                                        disabled={!userEmail || !userName}
                                        className="px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg"
                                        style={{ 
                                            backgroundColor: userEmail && userName ? '#114124' : '#e5e7eb',
                                            color: userEmail && userName ? 'white' : '#9ca3af',
                                            cursor: userEmail && userName ? 'pointer' : 'not-allowed'
                                        }}
                                        onMouseEnter={(e) => { if (userEmail && userName) e.target.style.backgroundColor = '#0d3118'; }}
                                        onMouseLeave={(e) => { if (userEmail && userName) e.target.style.backgroundColor = '#114124'; }}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                        Send Application
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {step === 'sending' && (
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                        <div className="inline-flex items-center justify-center w-24 h-24 bg-blue-100 rounded-full mb-6">
                            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">
                            Sending your application...
                        </h3>
                        <div className="space-y-3 text-sm text-gray-600 max-w-xs mx-auto">
                            <p className="flex items-center justify-center gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                Preparing cover letter...
                            </p>
                            <p className="flex items-center justify-center gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                Attaching skill profile...
                            </p>
                            <p className="flex items-center justify-center gap-2">
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                                Connecting to {job.company}...
                            </p>
                        </div>
                    </div>
                )}

                {step === 'sent' && (
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                        <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
                            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                            Application Sent! 🎉
                        </h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                            Your application for <strong>{job.title}</strong> at <strong>{job.company}</strong> has been submitted successfully.
                        </p>
                        
                        <div className="bg-gray-50 rounded-xl p-4 inline-block text-left mb-6">
                            <p className="text-sm text-gray-600">
                                <span className="font-medium">Confirmation sent to:</span><br/>
                                <span className="text-blue-600">{userEmail}</span>
                            </p>
                        </div>
                        
                        <p className="text-sm text-gray-500 mb-8">
                            The employer typically responds within 3-5 business days.
                        </p>

                        <div className="flex flex-col sm:flex-row justify-center gap-3">
                            <button
                                onClick={handleBackToJobs}
                                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                Find More Jobs
                            </button>
                            <Link
                                to="/"
                                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                Back to Home
                            </Link>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
