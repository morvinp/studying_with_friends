import React, { useState, useRef, useEffect } from 'react'
import useAuthUser from '../hooks/useAuthUser'
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logout } from '../lib/api';
import { Link, useLocation } from 'react-router';
import { BellIcon, LogOutIcon, ShipWheelIcon, UserIcon, ChevronDownIcon } from 'lucide-react';
import ThemeSelector from './ThemeSelector';
import useLogout from '../hooks/useLogout';

const Navbar = () => {
    const {authUser} = useAuthUser();
    const location = useLocation();
    const isChatPage = location.pathname?.startsWith("/chat");
    const {logoutMutation} = useLogout();
    
    // Dropdown state
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleDropdownToggle = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    const handleLogout = () => {
        setIsDropdownOpen(false);
        logoutMutation();
    };

    // Create a consistent fallback image based on user ID or email
    const getFallbackImage = () => {
        const userId = authUser?._id || authUser?.email || 'default';
        const hash = userId.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        const avatarNumber = Math.abs(hash % 100) + 1;
        return `https://avatar.iran.liara.run/public/${avatarNumber}.png`;
    };

    return (
        <nav className="bg-base-200 border-b border-base-300 sticky top-0 z-30 h-16 flex items-center">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-end w-full">
                    {/* LOGO -- only if we are in the chat page */}
                    {isChatPage && (
                        <div className="pl-5">
                            <Link to="/" className="flex items-center gap-2.5">
                                <ShipWheelIcon className="size-9 text-primary" />
                                <span className="text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider">
                                    SWF
                                </span>
                            </Link>
                        </div>
                    )}

                    <div className='flex items-center gap-3 sm:gap-4 ml-auto'>
                        <Link to={"/notifications"}>
                            <button className="btn btn-ghost btn-circle">
                                <BellIcon className="h-6 w-6 text-base-content opacity-70" />
                            </button>
                        </Link>
                    </div>

                    <ThemeSelector/>

                    {/* Profile Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={handleDropdownToggle}
                            className="flex items-center gap-2 btn btn-ghost btn-sm rounded-full"
                        >
                            <div className="avatar">
                                <div className="w-9 rounded-full">
                                    <img 
                                        src={authUser?.profilePic || getFallbackImage()} 
                                        alt="User Avatar" 
                                        onError={(e) => {
                                            e.target.src = getFallbackImage();
                                        }}
                                    />
                                </div>
                            </div>
                            <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-base-100 rounded-lg shadow-lg border border-base-300 z-50">
                                <div className="py-2">
                                    {/* User Info */}
                                    <div className="px-4 py-3 border-b border-base-300">
                                        <div className="flex items-center gap-3">
                                            <div className="avatar">
                                                <div className="w-10 rounded-full">
                                                    <img 
                                                        src={authUser?.profilePic || getFallbackImage()} 
                                                        alt="User Avatar"
                                                        onError={(e) => {
                                                            e.target.src = getFallbackImage();
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{authUser?.fullName}</p>
                                                <p className="text-xs text-base-content opacity-70 truncate">{authUser?.email}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Menu Items */}
                                    <div className="py-1">
                                        <Link
                                            to="/profile"
                                            onClick={() => setIsDropdownOpen(false)}
                                            className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-base-200 transition-colors"
                                        >
                                            <UserIcon className="h-4 w-4" />
                                            View Profile
                                        </Link>
                                    </div>

                                    {/* Logout */}
                                    <div className="border-t border-base-300 py-1">
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-base-200 transition-colors w-full text-left text-error"
                                        >
                                            <LogOutIcon className="h-4 w-4" />
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar
