import React, { useState, useEffect } from 'react';

const LOADING_STEPS = [
    {
        id: 'analyze',
        title: 'Analyzing your profile',
        subtitle: 'Understanding your skills and experience...',
        icon: '🧠',
        duration: 2000
    },
    {
        id: 'skills',
        title: 'Mapping your skillset',
        subtitle: 'Identifying Design, Tools, Communication, and more...',
        icon: '📊',
        duration: 1800
    },
    {
        id: 'collate',
        title: 'Collating job data',
        subtitle: 'Searching through thousands of opportunities...',
        icon: '📋',
        duration: 2200
    },
    {
        id: 'location',
        title: 'Finding locations',
        subtitle: 'Matching jobs near BGC, Taguig area...',
        icon: '📍',
        duration: 1500
    },
    {
        id: 'match',
        title: 'Calculating match scores',
        subtitle: 'Finding the best opportunities for you...',
        icon: '✨',
        duration: 1800
    }
];

export default function LoadingSequence({ agenticData, onComplete }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [itemCount, setItemCount] = useState(0);

    // Determine what type of search this is from agentic data
    const searchType = agenticData?.intent === 'SKILL_IMPROVEMENT' ? 'seminar' : 'job';
    const resultLabel = searchType === 'job' ? 'opportunities' : 'training programs';

    // Only allow the sequence to complete/navigate once the search is actually done.
    // LandingPage sets intent to JOB_SEARCH / SKILL_IMPROVEMENT only after results exist.
    const searchComplete = agenticData?.intent === 'JOB_SEARCH' || agenticData?.intent === 'SKILL_IMPROVEMENT';
    const lastStepIndex = LOADING_STEPS.length - 1;

    useEffect(() => {
        // Run through steps 0..lastStepIndex-1 normally.
        if (currentStep < lastStepIndex) {
            const timer = setTimeout(() => {
                setCompletedSteps((prev) => [...prev, LOADING_STEPS[currentStep].id]);
                setCurrentStep((prev) => prev + 1);
            }, LOADING_STEPS[currentStep].duration);

            return () => clearTimeout(timer);
        }

        // Pause on the last step until the search is complete.
        if (currentStep === lastStepIndex) {
            if (!searchComplete) {
                return;
            }

            // Mark final step complete, then move to results screen.
            const timer = setTimeout(() => {
                setCompletedSteps((prev) => {
                    const next = [...prev, LOADING_STEPS[currentStep].id];
                    return Array.from(new Set(next));
                });
                setCurrentStep((prev) => prev + 1);
            }, LOADING_STEPS[currentStep].duration);

            return () => clearTimeout(timer);
        }

        // currentStep > lastStepIndex => results phase
        return;
    }, [currentStep, lastStepIndex, searchComplete]);

    // Switch to the results view only after the last step has finished AND the search is complete.
    useEffect(() => {
        if (currentStep <= lastStepIndex) {
            return;
        }

        if (!searchComplete) {
            return;
        }

        const timer = setTimeout(() => {
            setShowResults(true);
        }, 300);

        return () => clearTimeout(timer);
    }, [currentStep, lastStepIndex, searchComplete]);

    // Animate item count and navigate only once search is complete.
    useEffect(() => {
        if (!showResults) {
            return;
        }

        if (!searchComplete) {
            return;
        }

        let doneTimer = null;
        let interval = null;

        const jobCount = Array.isArray(agenticData?.jobs) ? agenticData.jobs.length : 0;
        const trainingCount = Array.isArray(agenticData?.trainings) ? agenticData.trainings.length : 0;
        const targetCount = searchType === 'job' ? jobCount : trainingCount;

        // If no results, still proceed (but only after search is done).
        if (targetCount <= 0) {
            setItemCount(0);
            doneTimer = setTimeout(() => {
                onComplete && onComplete();
            }, 1200);

            return () => {
                if (doneTimer) {
                    clearTimeout(doneTimer);
                }
            };
        }

        setItemCount(0);
        let count = 0;

        interval = setInterval(() => {
            count++;
            setItemCount(count);
            if (count >= targetCount) {
                clearInterval(interval);
                doneTimer = setTimeout(() => {
                    onComplete && onComplete();
                }, 1200);
            }
        }, 120);

        return () => {
            if (interval) {
                clearInterval(interval);
            }
            if (doneTimer) {
                clearTimeout(doneTimer);
            }
        };
    }, [showResults, searchComplete, agenticData, searchType, onComplete]);

    // Extract query and user skills for display from agentic data
    const displayQuery = agenticData?.query || '';
    const topSkills = agenticData?.user_skills?.slice(0, 3) || [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col items-center justify-center px-4 py-10 relative">
            <div className="w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                        {showResults ? '🎉 Great news!' : 'Finding your matches...'}
                    </h1>
                    {!showResults && (
                        <p className="text-gray-500 text-sm">
                            Our AI is working hard to find the best opportunities for you
                        </p>
                    )}
                </div>

                {/* User's prompt summary */}
                {agenticData?.prompt && !showResults && (
                    <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100">
                        <p className="text-xs text-gray-400 mb-1">You said:</p>
                        <p className="text-gray-700 text-sm italic">"{agenticData.prompt.slice(0, 100)}{agenticData.prompt.length > 100 ? '...' : ''}"</p>
                    </div>
                )}

                {/* Loading Steps */}
                {!showResults && (
                    <div className="space-y-3 mb-8">
                        {LOADING_STEPS.map((step, index) => {
                            const isCompleted = completedSteps.includes(step.id);
                            const isCurrent = index === currentStep;
                            const isPending = index > currentStep;

                            return (
                                <div
                                    key={step.id}
                                    className={`
                                        flex items-center gap-4 p-4 rounded-xl transition-all duration-500
                                        ${isCompleted ? 'bg-green-50 border border-green-200' : ''}
                                        ${isCurrent ? 'bg-blue-50 border border-blue-200 shadow-md' : ''}
                                        ${isPending ? 'bg-gray-50 border border-gray-100 opacity-50' : ''}
                                    `}
                                >
                                    {/* Icon/Status */}
                                    <div className={`
                                        w-10 h-10 rounded-full flex items-center justify-center text-lg
                                        ${isCompleted ? 'bg-green-100' : ''}
                                        ${isCurrent ? 'bg-blue-100' : ''}
                                        ${isPending ? 'bg-gray-100' : ''}
                                    `}>
                                        {isCompleted ? (
                                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : isCurrent ? (
                                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <span>{step.icon}</span>
                                        )}
                                    </div>

                                    {/* Text */}
                                    <div className="flex-1">
                                        <p className={`
                                            font-medium text-sm
                                            ${isCompleted ? 'text-green-700' : ''}
                                            ${isCurrent ? 'text-blue-700' : ''}
                                            ${isPending ? 'text-gray-400' : ''}
                                        `}>
                                            {step.title}
                                        </p>
                                        <p className={`
                                            text-xs
                                            ${isCompleted ? 'text-green-600' : ''}
                                            ${isCurrent ? 'text-blue-600' : ''}
                                            ${isPending ? 'text-gray-400' : ''}
                                        `}>
                                            {step.subtitle}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {!showResults && currentStep === lastStepIndex && !searchComplete && (
                    <div className="text-center text-sm text-gray-500 mb-6">
                        Still fetching results…
                    </div>
                )}

                {/* Results Section */}
                {showResults && (
                    <div className="text-center animate-fadeIn">
                        {/* Big number */}
                        <div className="mb-6">
                            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-4">
                                <span className="text-4xl font-bold text-green-600">{itemCount}</span>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                matching {resultLabel} found!
                            </h2>
                        </div>

                        {/* Skills identified */}
                        {topSkills.length > 0 && (
                            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
                                <p className="text-sm text-gray-500 mb-2">
                                    {searchType === 'job' ? 'Top skills identified:' : 'Skills to develop:'}
                                </p>
                                <div className="flex justify-center gap-2 flex-wrap">
                                    {topSkills.map(skill => (
                                        <span 
                                            key={skill}
                                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Skill gap warning if applicable */}
                        {agenticData?.ui?.show_skill_gap_popup && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <div className="text-left flex-1">
                                        <p className="font-medium text-sm text-yellow-900 mb-1">{agenticData.ui.popup_title}</p>
                                        <p className="text-xs text-yellow-700">
                                            We've also found {agenticData?.trainings?.length || 0} training programs to help you
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Loading indicator */}
                        <div className="flex items-center justify-center gap-2 text-gray-500">
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm">Preparing your personalized view...</span>
                        </div>
                    </div>
                )}

                {/* Progress bar */}
                {!showResults && (
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
                            style={{ width: `${(completedSteps.length / LOADING_STEPS.length) * 100}%` }}
                        ></div>
                    </div>
                )}
            </div>

            {/* Decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-40 right-10 w-64 h-64 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-20 left-1/2 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            {/* Custom styles for animations */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.5s ease-out forwards;
                }
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
            `}</style>
        </div>
    );
}
