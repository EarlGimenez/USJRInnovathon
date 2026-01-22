import React from 'react';

export default function ToggleTabs({ activeTab, onTabChange }) {
    const tabs = [
        { id: 'jobs', label: 'Jobs' },
        { id: 'seminars', label: 'Seminars' }
    ];

    return (
        <div className="flex bg-gray-100 rounded-lg p-1">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                        activeTab === tab.id
                            ? 'bg-[#114124] text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
