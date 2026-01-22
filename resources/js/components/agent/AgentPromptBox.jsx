import React, { useState, useRef, useEffect } from 'react';

export default function AgentPromptBox({ onSubmit }) {
    const [prompt, setPrompt] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const textareaRef = useRef(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
        }
    }, [prompt]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (prompt.trim()) {
            onSubmit(prompt.trim());
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="relative">
            <div className={`
                relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300
                ${isFocused ? 'border-blue-400 shadow-blue-100' : 'border-gray-200'}
            `}>
                {/* AI Icon */}
                <div className="absolute left-4 top-4">
                    <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center transition-colors
                        ${isFocused ? 'bg-blue-100' : 'bg-gray-100'}
                    `}>
                        <svg 
                            className={`w-5 h-5 transition-colors ${isFocused ? 'text-blue-600' : 'text-gray-400'}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                    </div>
                </div>

                {/* Textarea */}
                <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe yourself, your skills, and what kind of job you're looking for..."
                    className="
                        w-full pl-16 pr-14 py-4 
                        text-gray-700 placeholder-gray-400
                        bg-transparent
                        rounded-2xl
                        resize-none
                        focus:outline-none
                        min-h-[60px]
                    "
                    rows={1}
                />

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={!prompt.trim()}
                    className={`
                        absolute right-3 bottom-3
                        w-10 h-10 rounded-xl
                        flex items-center justify-center
                        transition-all duration-200
                        ${prompt.trim() 
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' 
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                    `}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </button>
            </div>

            {/* Hint text */}
            <p className="text-xs text-gray-400 mt-2 text-center">
                Press Enter to submit • Shift+Enter for new line
            </p>
        </form>
    );
}
