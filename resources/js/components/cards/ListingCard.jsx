import React from 'react';

export default function ListingCard({ item, type, onClick, isSelected }) {
    const isJob = type === 'jobs';

    return (
        <div
            onClick={onClick}
            className={`p-4 rounded-lg border cursor-pointer transition-all ${
                isSelected 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            }`}
        >
            <div className="flex gap-3">
                {/* Icon/Thumbnail */}
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isJob ? 'bg-blue-100' : 'bg-green-100'
                }`}>
                    {isJob ? (
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
                        {isJob && item.matchPercentage !== undefined && (
                            <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                                item.matchPercentage >= 80 ? 'bg-green-100 text-green-700' :
                                item.matchPercentage >= 60 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                            }`}>
                                {item.matchPercentage}%
                            </span>
                        )}
                    </div>

                    <p className="text-sm text-gray-600 truncate">
                        {isJob ? item.company : item.organizer}
                    </p>

                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {isJob ? (
                            <>
                                <span className="flex items-center">
                                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    </svg>
                                    {item.location}
                                </span>
                                {item.salary && (
                                    <span className="text-green-600 font-medium">{item.salary}</span>
                                )}
                            </>
                        ) : (
                            <>
                                <span className="flex items-center">
                                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {item.date}
                                </span>
                                <span className="flex items-center">
                                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    </svg>
                                    {item.location}
                                </span>
                            </>
                        )}
                    </div>

                    {/* Skill boosts for seminars */}
                    {!isJob && item.skillBoosts && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {Object.entries(item.skillBoosts).map(([skill, boost]) => (
                                <span 
                                    key={skill}
                                    className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs"
                                >
                                    {skill} +{boost}%
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Arrow */}
                <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>
        </div>
    );
}
