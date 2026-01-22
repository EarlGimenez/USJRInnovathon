import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import MapView from '../pages/MapView';
import JobDetails from '../pages/JobDetails';
import SeminarDetails from '../pages/SeminarDetails';
import ProfileView from '../pages/ProfileView';
import ApplyPage from '../pages/ApplyPage';
import { SkillProvider } from '../context/SkillContext';
import Navbar from './ui/Navbar';

export default function App() {
    return (
        <SkillProvider>
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/map" element={<MapView />} />
                    <Route path="/job/:id" element={<JobDetails />} />
                    <Route path="/seminar/:id" element={<SeminarDetails />} />
                    <Route path="/profile" element={<ProfileView />} />
                    <Route path="/apply" element={<ApplyPage />} />
                </Routes>
            </div>
        </SkillProvider>
    );
}
