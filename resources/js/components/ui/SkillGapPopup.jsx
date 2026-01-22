import React from 'react';

export default function SkillGapPopup({ skillGaps, matchPercentage, suggestedSteps, onClose, onViewTraining }) {
    const handleViewTraining = () => {
        onViewTraining();
        onClose();
    };

    // Handle both formats: array of strings or array of objects
    const normalizedGaps = skillGaps?.map(gap =>
        typeof gap === 'string' ? gap : gap.skill
    ) || [];

    return (
        <div className="fixed inset-0 bg-gray-900/40 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-slideUp">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Suggested Skills to Strengthen</h3>
                                <p className="text-sm text-white text-opacity-90">
                                    Current match: {matchPercentage}%
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full hover:bg-white hover:bg-opacity-20 flex items-center justify-center transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Match percentage bar */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Match Percentage</span>
                            <span className="text-sm font-bold text-gray-900">{matchPercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                    matchPercentage >= 80
                                        ? 'bg-green-500'
                                        : matchPercentage >= 60
                                        ? 'bg-yellow-500'
                                        : 'bg-red-500'
                                }`}
                                style={{ width: `${matchPercentage}%` }}
                            ></div>
                        </div>
                    </div>

                    <p className="text-gray-700 mb-4">
                        Based on your prompt and the job postings we found, these look like helpful areas to learn or improve:
                    </p>

                    {/* Missing skills */}
                    {normalizedGaps.length > 0 && (
                        <div className="mb-6">
                            <div className="flex flex-wrap gap-2">
                                {normalizedGaps.slice(0, 5).map((skill, index) => (
                                    <span
                                        key={index}
                                        className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium"
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Suggested next steps */}
                    {suggestedSteps && suggestedSteps.length > 0 && (
                        <div className="mb-6">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">
                                Suggested Next Steps:
                            </h4>
                            <ul className="space-y-2">
                                {suggestedSteps.map((step, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                        <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span>{step}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleViewTraining}
                            className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                        >
                            <div className="flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                View Training
                            </div>
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Continue
                        </button>
                    </div>

                    {/* Info note */}
                    <p className="text-xs text-gray-500 text-center mt-4">
                        Tip: This is an estimate — improving even 1–2 areas can make matches stronger.
                    </p>
                </div>
            </div>
        </div>
    );
}
