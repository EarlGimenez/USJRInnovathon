import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSkills } from '../context/SkillContext';

export default function SeminarDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { userSkills, updateSkill } = useSkills();
    
    const [seminar, setSeminar] = useState(null);
    const [loading, setLoading] = useState(true);
    const [registered, setRegistered] = useState(false);
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [verified, setVerified] = useState(false);

    useEffect(() => {
        fetchSeminarDetails();
    }, [id]);

    const fetchSeminarDetails = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/seminars/${id}`);
            setSeminar(response.data.seminar);
        } catch (error) {
            console.error('Error fetching seminar details:', error);
            setSeminar(getMockSeminar(id));
        }
        setLoading(false);
    };

    const handleRegister = () => {
        setRegistered(true);
        // In real app, would POST to /api/seminars/{id}/register
    };

    const handleVerifyAttendance = async (qrCode) => {
        try {
            const response = await axios.post(`/api/seminars/${id}/verify`, {
                qrCode,
                sessionId: localStorage.getItem('lookal_session') 
                    ? JSON.parse(localStorage.getItem('lookal_session')).sessionId 
                    : null
            });
            
            if (response.data.success) {
                // Update user skills based on seminar
                Object.entries(seminar.skillBoosts || {}).forEach(([skill, boost]) => {
                    updateSkill(skill, boost);
                });
                setVerified(true);
                setShowQRScanner(false);
            }
        } catch (error) {
            console.error('Verification error:', error);
            // Demo mode - simulate success
            Object.entries(seminar.skillBoosts || {}).forEach(([skill, boost]) => {
                updateSkill(skill, boost);
            });
            setVerified(true);
            setShowQRScanner(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#114124' }}></div>
            </div>
        );
    }

    if (!seminar) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <p className="text-gray-500 mb-4">Seminar not found</p>
                <button 
                    onClick={() => navigate('/')}
                    style={{ color: '#114124' }}
                    className="hover:underline"
                >
                    Back to Map
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 z-10">
                <div className="flex items-center">
                    <button 
                        onClick={() => navigate('/')}
                        className="mr-3 p-2 hover:bg-gray-100 rounded-full"
                    >
                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-lg font-semibold text-gray-900">Seminar Details</h1>
                </div>
            </header>

            {/* Content */}
            <div className="p-4 pb-24">
                {/* Seminar Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">{seminar.title}</h2>
                    <p className="text-gray-600">{seminar.organizer}</p>
                    
                    <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm" style={{ backgroundColor: '#e8f5e9', color: '#114124' }}>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {seminar.date}
                        </span>
                        <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {seminar.location}
                        </span>
                    </div>
                </div>

                {/* Description */}
                <section className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                        <span className="w-1 h-5 bg-green-500 mr-2 rounded"></span>
                        About This Seminar
                    </h3>
                    <p className="text-gray-700 leading-relaxed">{seminar.description}</p>
                </section>

                {/* Skill Boosts */}
                <section className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <span className="w-1 h-5 bg-green-500 mr-2 rounded"></span>
                        Skills You'll Gain
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {Object.entries(seminar.skillBoosts || {}).map(([skill, boost]) => (
                            <div key={skill} className="bg-green-50 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-800">{skill}</span>
                                    <span className="text-green-600 font-semibold">+{boost}%</span>
                                </div>
                                <div className="mt-2 h-2 bg-green-200 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-green-500 rounded-full transition-all"
                                        style={{ width: `${Math.min(100, boost * 5)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Attendance Info */}
                <section className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <span className="w-1 h-5 bg-green-500 mr-2 rounded"></span>
                        Attendance
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-600">Registered</span>
                            <span className="font-semibold">{seminar.attendees} / {seminar.maxAttendees}</span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                                className="h-full rounded-full transition-all"
                                style={{ width: `${(seminar.attendees / seminar.maxAttendees) * 100}%`, backgroundColor: '#114124' }}
                            />
                        </div>
                    </div>
                </section>

                {/* Verified Badge */}
                {verified && (
                    <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-lg">
                        <div className="flex items-center">
                            <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <p className="font-semibold text-green-800">Attendance Verified!</p>
                                <p className="text-sm text-green-700">Your skills have been updated.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons - Fixed at bottom */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
                {!registered ? (
                    <button
                        onClick={handleRegister}
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                        Register for Seminar
                    </button>
                ) : !verified ? (
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowQRScanner(true)}
                            className="flex-1 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                            style={{ backgroundColor: '#114124' }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#0d3118'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#114124'}
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                            Verify Attendance
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => navigate('/')}
                        className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                        Back to Map
                    </button>
                )}
            </div>

            {/* QR Scanner Modal */}
            {showQRScanner && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-sm w-full">
                        <h3 className="text-lg font-semibold mb-4">Scan Organizer's QR Code</h3>
                        <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center mb-4">
                            <div className="text-center text-gray-500">
                                <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                                <p>Camera preview would appear here</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                            Ask the event organizer to show their verification QR code.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowQRScanner(false)}
                                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleVerifyAttendance('DEMO_QR_CODE')}
                                className="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600"
                            >
                                Simulate Scan (Demo)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Mock seminar data
function getMockSeminar(id) {
    const seminars = {
        '1': {
            id: 1,
            title: 'Tech Workshop',
            organizer: 'Cebu IT Association',
            location: 'NS Design Center',
            date: 'May 25th, 2026',
            time: '9:00 AM - 5:00 PM',
            description: 'A comprehensive hands-on workshop covering the latest web technologies including React, Node.js, and cloud services. Perfect for developers looking to upgrade their skills.',
            skillBoosts: { Tools: 15, Prototyping: 10 },
            attendees: 45,
            maxAttendees: 100
        },
        '2': {
            id: 2,
            title: 'Career Fair',
            organizer: 'JobMatch PH',
            location: 'NS Grand Hotel',
            date: 'January 17, 2026',
            time: '10:00 AM - 6:00 PM',
            description: 'Connect with top employers in Cebu and learn about job opportunities in the tech industry. Network with professionals and attend mini workshops.',
            skillBoosts: { Communication: 10, Research: 8 },
            attendees: 230,
            maxAttendees: 500
        }
    };
    
    return seminars[id] || seminars['1'];
}
