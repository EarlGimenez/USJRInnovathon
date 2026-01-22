import React from 'react';

/**
 * CourseCard Component
 * Displays online course information from Udemy/Coursera
 */
export default function CourseCard({ course, onClick, onApplyVoucher }) {
    const {
        title,
        description,
        provider,
        providerLogo,
        url,
        image,
        price,
        isFree,
        rating,
        reviews,
        skill,
        partner
    } = course;

    // Format review count
    const formatReviews = (count) => {
        if (count >= 1000) {
            return (count / 1000).toFixed(1) + 'K';
        }
        return count?.toString() || '0';
    };

    // Handle voucher button click
    const handleVoucherClick = (e) => {
        e.stopPropagation(); // Prevent card click
        if (onApplyVoucher) {
            onApplyVoucher(course);
        } else {
            // Default behavior: show alert or navigate to voucher page
            alert(`Voucher request submitted for "${title}"!\n\nYou'll receive an email with your discount code within 24-48 hours.`);
        }
    };

    // Render star rating
    const renderStars = (rating) => {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const stars = [];

        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars.push(
                    <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                );
            } else if (i === fullStars && hasHalfStar) {
                stars.push(
                    <svg key={i} className="w-4 h-4 text-yellow-400" viewBox="0 0 20 20">
                        <defs>
                            <linearGradient id="halfStar">
                                <stop offset="50%" stopColor="currentColor" />
                                <stop offset="50%" stopColor="#D1D5DB" />
                            </linearGradient>
                        </defs>
                        <path fill="url(#halfStar)" d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                );
            } else {
                stars.push(
                    <svg key={i} className="w-4 h-4 text-gray-300 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                );
            }
        }

        return stars;
    };

    const handleClick = () => {
        if (onClick) {
            onClick(course);
        } else {
            // Open course URL in new tab
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div 
            onClick={handleClick}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
        >
            {/* Course Image or Provider Banner */}
            <div className="h-24 bg-gradient-to-r from-purple-500 to-indigo-600 relative">
                {image && (
                    <img 
                        src={image} 
                        alt={title}
                        className="w-full h-full object-cover"
                        onError={(e) => e.target.style.display = 'none'}
                    />
                )}
                
                {/* Provider Badge */}
                <div className="absolute top-2 left-2 bg-white px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                    <span className="text-xs font-medium text-gray-700">{provider}</span>
                </div>

                {/* Price Badge */}
                <div className={`absolute top-2 right-2 px-2 py-1 rounded-md text-xs font-bold ${
                    isFree 
                        ? 'bg-green-500 text-white' 
                        : 'bg-white text-gray-800'
                }`}>
                    {isFree ? 'FREE' : price}
                </div>

                {/* Online Badge */}
                <div className="absolute bottom-2 right-2 bg-blue-500 text-white px-2 py-0.5 rounded text-xs">
                    Online
                </div>
            </div>

            {/* Course Info */}
            <div className="p-4">
                <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">
                    {title}
                </h3>
                
                {partner && (
                    <p className="text-xs text-gray-500 mb-2">by {partner}</p>
                )}

                {/* Rating */}
                <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center">
                        {renderStars(rating || 0)}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{rating?.toFixed(1)}</span>
                    <span className="text-xs text-gray-500">({formatReviews(reviews)} reviews)</span>
                </div>

                {/* Skill Tag */}
                {skill && (
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            {skill}
                        </span>
                    </div>
                )}

                {/* Apply for Voucher Button - Only for paid courses */}
                {!isFree && (
                    <button
                        onClick={handleVoucherClick}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                        </svg>
                        Apply for Voucher
                    </button>
                )}
            </div>
        </div>
    );
}
