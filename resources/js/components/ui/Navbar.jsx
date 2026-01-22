import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Map, User } from 'lucide-react';

export default function Navbar() {
    const location = useLocation();

    const navItems = [
        { path: '/', label: 'Home', icon: Home },
        { path: '/map', label: 'Map', icon: Map },
        { path: '/profile', label: 'Profile', icon: User },
    ];

    const isActive = (path) => {
        if (path === '/') {
            return location.pathname === '/';
        }
        return location.pathname.startsWith(path);
    };

    return (
        <nav className="bg-white shadow-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center">
                        <Link to="/" className="hover:opacity-80 transition-opacity">
                            <img src="/lookal_logo.png" alt="Lookall" className="h-10" />
                        </Link>
                    </div>

                    {/* Navigation Links */}
                    <div className="flex items-center space-x-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center space-x-1 px-4 py-2 rounded-lg transition-colors duration-200 ${
                                        active
                                            ? 'bg-blue-100 text-blue-600'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </nav>
    );
}
