import React from 'react';

const CredentialCard = ({ type, title, organization, description, startDate, endDate, file, fileName, onEdit, onDelete }) => {
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

    const handleDownload = () => {
        if (file) {
            const link = document.createElement('a');
            link.href = file;
            link.download = fileName || 'credential';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                    <span className="text-2xl">{getIcon()}</span>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                        <p className="text-sm text-gray-600 font-medium">{organization}</p>
                        <p className="text-xs text-gray-500 mt-1">
                            {startDate} - {endDate || 'Present'}
                        </p>
                        {description && (
                            <p className="text-sm text-gray-700 mt-2">{description}</p>
                        )}
                        {file && fileName && (
                            <div className="mt-2">
                                <button
                                    onClick={handleDownload}
                                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                    📎 {fileName}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex gap-2 ml-4">
                    {onEdit && (
                        <button 
                            onClick={onEdit} 
                            className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                            Edit
                        </button>
                    )}
                    {onDelete && (
                        <button 
                            onClick={onDelete} 
                            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                            Delete
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CredentialCard;
