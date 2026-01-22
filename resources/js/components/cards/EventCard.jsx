import React from 'react';

/**
 * EventCard Component
 * Displays local event/seminar information
 */
export default function EventCard({ event, onClick }) {
    const {
        title,
        description,
        organizer,
        location,
        city,
        date,
        time,
        price,
        isFree,
        attendees,
        maxAttendees,
        skillBoosts,
        type
    } = event;

    // Calculate attendance percentage
    const attendancePercent = maxAttendees 
        ? Math.round((attendees / maxAttendees) * 100) 
        : 0;

    // Check if event is almost full
    const isAlmostFull = attendancePercent >= 80;

    const handleClick = () => {
        if (onClick) {
            onClick(event);
        }
    };

    return (
        <div 
            onClick={handleClick}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
        >
            {/* Event Header */}
            <div className="h-20 bg-gradient-to-r from-green-500 to-teal-500 relative px-4 py-3">
                {/* Type Badge */}
                <div className="absolute top-2 left-2 bg-white/90 px-2 py-0.5 rounded text-xs font-medium text-gray-700 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {type === 'offline' ? 'In-Person' : 'Hybrid'}
                </div>

                {/* Price Badge */}
                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-bold ${
                    isFree 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-white text-gray-800'
                }`}>
                    {isFree ? 'FREE' : price}
                </div>

                {/* Date at bottom of header */}
                <div className="absolute bottom-2 left-2 text-white flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs opacity-90">{date}</span>
                </div>
            </div>

            {/* Event Info */}
            <div className="p-4">
                <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">
                    {title}
                </h3>
                
                <p className="text-sm text-gray-500 mb-2">{organizer}</p>

                {/* Location & Time */}
                <div className="flex flex-col gap-1 mb-3 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="line-clamp-1">{location}, {city}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{time}</span>
                    </div>
                </div>

                {/* Attendance Progress */}
                {maxAttendees && (
                    <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">{attendees} attending</span>
                            {isAlmostFull && (
                                <span className="text-orange-600 font-medium">Almost full!</span>
                            )}
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all ${
                                    isAlmostFull ? 'bg-orange-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(attendancePercent, 100)}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Skill Boosts */}
                {skillBoosts && Object.keys(skillBoosts).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {Object.entries(skillBoosts).slice(0, 3).map(([skill, boost]) => (
                            <span 
                                key={skill}
                                className="inline-flex items-center px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs"
                            >
                                {skill} +{boost}%
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
