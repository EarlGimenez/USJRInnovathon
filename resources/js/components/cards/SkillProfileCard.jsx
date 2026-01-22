import React, { useState } from 'react';
import { useSkills } from '../../context/SkillContext';

export default function SkillProfileCard({ skills, compact = false }) {
    const [expanded, setExpanded] = useState(false);
    const { resetSession } = useSkills();

    if (!skills) return null;

    const getValidationStatus = (value) => {
        // Preferred: if profile stores validation metadata.
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            if (value.credential_validated || value.credentialValidated || value.validation === 'credential') {
                return 'credential';
            }
            if (value.work_validated || value.workValidated || value.validation === 'work') {
                return 'work';
            }
            return 'none';
        }

        // If stored as a string status.
        if (typeof value === 'string') {
            const v = value.toLowerCase();
            if (v.includes('credential')) return 'credential';
            if (v.includes('work')) return 'work';
            return 'none';
        }

        // Demo fallback: map numeric proficiency into a validation-like label.
        // (Keeps reset skills working without changing the underlying session model.)
        if (typeof value === 'number' && !Number.isNaN(value)) {
            if (value >= 80) return 'credential';
            if (value >= 60) return 'work';
            return 'none';
        }

        return 'none';
    };

    const getStatusBadge = (status) => {
        if (status === 'credential') {
            return { label: 'Credential validated', className: 'bg-green-100 text-green-800' };
        }
        if (status === 'work') {
            return { label: 'Work experience validated', className: 'bg-yellow-100 text-yellow-800' };
        }
        return { label: 'No validations', className: 'bg-gray-100 text-gray-700' };
    };

    const counts = Object.values(skills).reduce(
        (acc, v) => {
            const status = getValidationStatus(v);
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        },
        { credential: 0, work: 0, none: 0 }
    );

    if (compact && !expanded) {
        return (
            <button
                onClick={() => setExpanded(true)}
                className="bg-white rounded-lg shadow-lg p-3 flex items-center gap-2 hover:shadow-xl transition-shadow"
            >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {counts.credential + counts.work}
                </div>
                <div className="text-left">
                    <p className="text-xs text-gray-500">Your Skills</p>
                    <p className="text-sm font-semibold text-gray-800">
                        {counts.credential} cred • {counts.work} work
                    </p>
                </div>
            </button>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-lg p-4 min-w-[250px]">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">Your Skill Profile</h3>
                {compact && (
                    <button 
                        onClick={() => setExpanded(false)}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            <div className="space-y-2">
                {Object.entries(skills).map(([skill, value]) => {
                    const status = getValidationStatus(value);
                    const badge = getStatusBadge(status);

                    return (
                        <div key={skill} className="flex items-center justify-between gap-3">
                            <span className="text-sm text-gray-700">{skill}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>
                                {badge.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Validated skills</span>
                    <span className="text-lg font-bold text-blue-600">{counts.credential + counts.work}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                    {counts.credential} credential • {counts.work} work • {counts.none} none
                </p>
            </div>

            <button
                onClick={resetSession}
                className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600 py-1"
            >
                Reset Skills (New Demo Profile)
            </button>
        </div>
    );
}
