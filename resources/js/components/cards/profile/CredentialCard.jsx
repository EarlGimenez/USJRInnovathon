import React from 'react';

const CredentialCard = ({ type, title, organization, description, startDate, endDate, onEdit, onDelete }) => {
    const getIcon = () => {
        switch(type) {
            case 'work':
                return '💼';
            case 'certificate':
                return '🎓';
            case 'project':
                return '🚀';
            default:
                return '📄';
        }
    };

    return (
        <div className="credential-card">
            <div className="credential-header">
                <span className="credential-icon">{getIcon()}</span>
                <div className="credential-info">
                    <h3 className="credential-title">{title}</h3>
                    <p className="credential-organization">{organization}</p>
                    <p className="credential-date">
                        {startDate} - {endDate || 'Present'}
                    </p>
                </div>
                <div className="credential-actions">
                    {onEdit && (
                        <button onClick={onEdit} className="btn-edit">Edit</button>
                    )}
                    {onDelete && (
                        <button onClick={onDelete} className="btn-delete">Delete</button>
                    )}
                </div>
            </div>
            {description && (
                <p className="credential-description">{description}</p>
            )}
        </div>
    );
};

export default CredentialCard;
