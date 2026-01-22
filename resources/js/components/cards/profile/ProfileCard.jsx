import React from 'react';

const ProfileCard = ({ firstName, lastName, profilePicture, coverPhoto }) => {
    return (
        <div className="profile-card">
            {/* Cover Photo */}
            <div className="cover-photo-container">
                <img 
                    src={coverPhoto || '/images/default-cover.jpg'} 
                    alt="Cover" 
                    className="cover-photo"
                />
            </div>
            
            {/* Profile Picture and Name */}
            <div className="profile-info">
                <div className="profile-picture-container">
                    <img 
                        src={profilePicture || '/images/default-avatar.jpg'} 
                        alt={`${firstName} ${lastName}`} 
                        className="profile-picture"
                    />
                </div>
                
                <div className="profile-name">
                    <h2 className="full-name">{firstName} {lastName}</h2>
                </div>
            </div>
        </div>
    );
};

export default ProfileCard;
