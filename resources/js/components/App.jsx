import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import MapView from '../pages/MapView';
import JobDetails from '../pages/JobDetails';
import SeminarDetails from '../pages/SeminarDetails';
import { SkillProvider } from '../context/SkillContext';

export default function App() {
    return (
        <SkillProvider>
            <div className="min-h-screen bg-gray-50">
                <Routes>
                    <Route path="/" element={<MapView />} />
                    <Route path="/job/:id" element={<JobDetails />} />
                    <Route path="/seminar/:id" element={<SeminarDetails />} />
                </Routes>
            </div>
        </SkillProvider>
    );
}
