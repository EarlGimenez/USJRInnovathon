import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import MapView from '../pages/MapView';
import JobDetails from '../pages/JobDetails';
import SeminarDetails from '../pages/SeminarDetails';
import ProfileView from '../pages/ProfileView';
import ApplyPage from '../pages/ApplyPage';
import AdminDashboard from '../pages/AdminDashboard';
import { SkillProvider } from '../context/SkillContext';
import Navbar from './ui/Navbar';

function AppContent() {
    const location = useLocation();
    const isAdminPage = location.pathname.startsWith('/admin');

    return (
        <div className="min-h-screen bg-gray-50">
            {!isAdminPage && <Navbar />}
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/map" element={<MapView />} />
                <Route path="/job/:id" element={<JobDetails />} />
                <Route path="/seminar/:id" element={<SeminarDetails />} />
                <Route path="/profile" element={<ProfileView />} />
                <Route path="/apply" element={<ApplyPage />} />
                <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
        </div>
    );
}

export default function App() {
    return (
        <SkillProvider>
            <AppContent />
        </SkillProvider>
    );
}
