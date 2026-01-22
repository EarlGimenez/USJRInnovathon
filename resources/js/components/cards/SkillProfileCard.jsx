import React, { useState } from 'react';
import { useSkills } from '../../context/SkillContext';

export default function SkillProfileCard({ skills, compact = false }) {
    const [expanded, setExpanded] = useState(false);
    const { resetSession } = useSkills();

    if (!skills) return null;

    const getSkillColor = (value) => {
        if (value >= 80) return 'bg-green-500';
        if (value >= 60) return 'bg-yellow-500';
        if (value >= 40) return 'bg-orange-500';
        return 'bg-red-500';
    };

    const averageSkill = Math.round(
        Object.values(skills).reduce((a, b) => a + b, 0) / Object.keys(skills).length
    );

    if (compact && !expanded) {
        return (
            <button
                onClick={() => setExpanded(true)}
                className="bg-white rounded-lg shadow-lg p-3 flex items-center gap-2 hover:shadow-xl transition-shadow"
            >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {averageSkill}
                </div>
                <div className="text-left">
                    <p className="text-xs text-gray-500">Your Skills</p>
                    <p className="text-sm font-semibold text-gray-800">{averageSkill}% Avg</p>
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
                {Object.entries(skills).map(([skill, value]) => (
                    <div key={skill}>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{skill}</span>
                            <span className="font-medium text-gray-800">{value}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                                className={`h-full ${getSkillColor(value)} rounded-full transition-all duration-500`}
                                style={{ width: `${value}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Overall Average</span>
                    <span className="text-lg font-bold text-blue-600">{averageSkill}%</span>
                </div>
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
