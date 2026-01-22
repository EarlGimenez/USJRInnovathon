import React, { useState } from 'react';

export default function EmailApplicationModal({ isOpen, onClose, job, userSkills }) {
    const [step, setStep] = useState('compose'); // 'compose', 'sending', 'sent'
    const [userEmail, setUserEmail] = useState('');
    const [userName, setUserName] = useState('');
    const [customMessage, setCustomMessage] = useState('');

    if (!isOpen) return null;

    const generateCoverLetter = () => {
        const topSkills = userSkills 
            ? Object.entries(userSkills)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([skill]) => skill)
            : ['Design', 'Communication', 'Tools'];

        return `Dear Hiring Manager,

I am writing to express my strong interest in the ${job.title} position at ${job.company}. With my expertise in ${topSkills.join(', ')}, I am confident I would be a valuable addition to your team.

${job.description ? `The opportunity to ${job.description.slice(0, 100).toLowerCase()}... aligns perfectly with my career goals and skill set.` : 'I am excited about this opportunity to contribute to your organization.'}

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
        
        // Simulate sending process with typing effect
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        setStep('sent');
    };

    const handleClose = () => {
        setStep('compose');
        setUserEmail('');
        setUserName('');
        setCustomMessage('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleClose}
            ></div>

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-slideUp">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="font-bold text-lg">Apply via AI Assistant</h2>
                                <p className="text-sm text-white/80">{job.company}</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleClose}
                            className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    {step === 'compose' && (
                        <>
                            {/* Job Info */}
                            <div className="bg-gray-50 rounded-xl p-4 mb-6">
                                <h3 className="font-semibold text-gray-900">{job.title}</h3>
                                <p className="text-sm text-gray-600">{job.location}</p>
                                <p className="text-sm text-blue-600 font-medium mt-1">{job.salary}</p>
                            </div>

                            {/* User Info */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Your Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={userName}
                                        onChange={(e) => setUserName(e.target.value)}
                                        placeholder="John Doe"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Your Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={userEmail}
                                        onChange={(e) => setUserEmail(e.target.value)}
                                        placeholder="john@example.com"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Generated Cover Letter */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        AI-Generated Cover Letter
                                    </label>
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        Auto-generated
                                    </span>
                                </div>
                                <textarea
                                    value={generateCoverLetter()}
                                    readOnly
                                    className="w-full h-64 px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-700 resize-none"
                                />
                            </div>

                            {/* Additional Message */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Additional Message (Optional)
                                </label>
                                <textarea
                                    value={customMessage}
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                    placeholder="Add any additional information you'd like to include..."
                                    className="w-full h-24 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                                />
                            </div>

                            {/* Disclaimer */}
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                                <p className="text-xs text-yellow-800">
                                    <strong>Demo Mode:</strong> This is a simulated application process. In a production environment, 
                                    your application would be sent directly to the employer's recruitment system.
                                </p>
                            </div>
                        </>
                    )}

                    {step === 'sending' && (
                        <div className="py-12 text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
                                <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                Sending your application...
                            </h3>
                            <div className="space-y-2 text-sm text-gray-600">
                                <p className="flex items-center justify-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                    Attaching cover letter...
                                </p>
                                <p className="flex items-center justify-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                    Adding skill profile...
                                </p>
                                <p className="flex items-center justify-center gap-2">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                                    Connecting to {job.company}...
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 'sent' && (
                        <div className="py-12 text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6 animate-bounce">
                                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                Application Sent! 🎉
                            </h3>
                            <p className="text-gray-600 mb-4">
                                Your application for <strong>{job.title}</strong> at <strong>{job.company}</strong> has been submitted successfully.
                            </p>
                            <div className="bg-gray-50 rounded-xl p-4 inline-block text-left">
                                <p className="text-sm text-gray-600">
                                    <strong>Confirmation sent to:</strong><br/>
                                    {userEmail}
                                </p>
                            </div>
                            <p className="text-sm text-gray-500 mt-6">
                                The employer typically responds within 3-5 business days.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                    {step === 'compose' && (
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={handleClose}
                                className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={!userEmail || !userName}
                                className={`
                                    px-6 py-2 rounded-xl font-medium transition-all flex items-center gap-2
                                    ${userEmail && userName 
                                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' 
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                                `}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                Send Application
                            </button>
                        </div>
                    )}
                    {step === 'sent' && (
                        <div className="flex justify-center">
                            <button
                                onClick={handleClose}
                                className="px-8 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Animation styles */}
            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slideUp {
                    animation: slideUp 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
