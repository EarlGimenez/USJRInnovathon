import React from 'react';

export default function ToggleTabs({ activeTab, onTabChange }) {
    return (
        <div className="flex mt-3 bg-gray-100 rounded-lg p-1">
            <button
                onClick={() => onTabChange('jobs')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'jobs'
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                }`}
            >
                Jobs
            </button>
            <button
                onClick={() => onTabChange('seminars')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'seminars'
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                }`}
            >
                Seminars
            </button>
        </div>
    );
}
