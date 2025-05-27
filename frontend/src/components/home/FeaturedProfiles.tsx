'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from "@iconify/react";
import axios from 'axios';
import Link from 'next/link';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface FeaturedProfile {
    id: string;
    username: string;
    profileImage: string;
    followersCount: number;
    bio: string;
}

export function FeaturedProfiles() {
    const [profiles, setProfiles] = useState<FeaturedProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Add styles for animations
    const styles = `
        @keyframes profileHover {
            0% { transform: scale(1); }
            50% { transform: scale(1.03); }
            100% { transform: scale(1); }
        }

        @keyframes profileClick {
            0% { transform: scale(1); }
            50% { transform: scale(0.97); }
            100% { transform: scale(1); }
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }

        .animate-profile-hover {
            animation: profileHover 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .animate-profile-click {
            animation: profileClick 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .animate-fade-in {
            animation: fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .scroll-container {
            -ms-overflow-style: none;
            scrollbar-width: none;
            scroll-behavior: smooth;
        }

        .scroll-container::-webkit-scrollbar {
            display: none;
        }

        .profile-card {
            position: relative;
            overflow: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .profile-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
            transform: translateX(-100%);
            transition: transform 0.6s;
        }

        .profile-card:hover::before {
            transform: translateX(100%);
        }

        .loading-shimmer {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
        }
    `;

    useEffect(() => {
        // Inject styles
        const styleSheet = document.createElement("style");
        styleSheet.innerText = styles;
        document.head.appendChild(styleSheet);

        return () => {
            document.head.removeChild(styleSheet);
        };
    }, []);

    useEffect(() => {
        const fetchFeaturedProfiles = async () => {
            try {
                setLoading(true);
                // Fetch top 5 profiles by followers count
                const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/users/top-followers?limit=5`);

                if (response.data && response.data.success) {
                    setProfiles(response.data.users);
                } else {
                    throw new Error('Failed to fetch featured profiles');
                }
            } catch (err) {
                console.error('Error fetching featured profiles:', err);
                setError('Failed to load featured profiles');
                // Set fallback data
                setProfiles([
                    {
                        id: '1',
                        username: 'cryptowhale',
                        profileImage: '/default-avatar.png',
                        followersCount: 12500,
                        bio: 'Crypto enthusiast & trader'
                    },
                    {
                        id: '2',
                        username: 'blockchain_guru',
                        profileImage: '/default-avatar.png',
                        followersCount: 9800,
                        bio: 'Blockchain developer & educator'
                    },
                    {
                        id: '3',
                        username: 'defi_explorer',
                        profileImage: '/default-avatar.png',
                        followersCount: 7500,
                        bio: 'Exploring DeFi protocols'
                    },
                    {
                        id: '4',
                        username: 'nft_collector',
                        profileImage: '/default-avatar.png',
                        followersCount: 6200,
                        bio: 'NFT enthusiast & collector'
                    },
                    {
                        id: '5',
                        username: 'solana_fan',
                        profileImage: '/default-avatar.png',
                        followersCount: 5100,
                        bio: 'Solana ecosystem supporter'
                    }
                ]);
            } finally {
                setLoading(false);
            }
        };

        // Initial fetch
        fetchFeaturedProfiles();

        // Set up real-time updates every 5 minutes
        const intervalId = setInterval(fetchFeaturedProfiles, 5 * 60 * 1000);

        return () => clearInterval(intervalId);
    }, []);

    if (loading) {
        return (
            <div className="w-full py-6 flex justify-center animate-fade-in">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-[#B671FF]"></div>
                    <p className="text-gray-500 text-sm">Loading featured profiles...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full py-6 text-center animate-fade-in">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 inline-block">
                    <p className="text-red-500 flex items-center gap-2">
                        <Icon icon="mdi:alert-circle" className="h-5 w-5" />
                        {error}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full py-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Icon icon="mdi:star" className="h-6 w-6 text-[#B671FF]" />
                    <h3 className="text-xl font-bold bg-gradient-to-r from-[#B671FF] to-[#E282CA] bg-clip-text text-transparent">
                        Featured Profiles
                    </h3>
                </div>
                <div className="text-sm text-gray-500">
                    Top creators this week
                </div>
            </div>

            {/* Mobile: Horizontal scrollable list */}
            <div className="md:hidden">
                <div className="scroll-container flex overflow-x-auto gap-4 pb-4 px-2">
                    {profiles.map((profile) => (
                        <Link
                            href={`/profile/${profile.username}`}
                            key={profile.id}
                            className="profile-card flex-none w-[160px] bg-gradient-to-br from-[#B671FF] to-[#E282CA] rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
                            onMouseEnter={(e) => e.currentTarget.classList.add('animate-profile-hover')}
                            onMouseLeave={(e) => e.currentTarget.classList.remove('animate-profile-hover')}
                            onClick={(e) => e.currentTarget.classList.add('animate-profile-click')}
                        >
                            <div className="aspect-square relative">
                                <div className="w-full h-full flex items-center justify-center bg-white/10">
                                    <Avatar className="w-20 h-20 ring-4 ring-white/30 shadow-lg">
                                        <AvatarImage src={profile.profileImage} alt={profile.username || 'User'} />
                                        <AvatarFallback className="bg-white/20 text-white text-lg">
                                            {(profile.username || 'U').charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-3">
                                    <h4 className="text-white font-bold truncate text-sm">@{profile.username || 'unknown'}</h4>
                                    <div className="flex items-center text-white/90 text-xs mt-1">
                                        <Icon icon="mdi:account-group" className="mr-1 h-3 w-3" />
                                        <span>{profile.followersCount.toLocaleString()} followers</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Desktop: Grid layout */}
            <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-6">
                {profiles.map((profile) => (
                    <Link
                        href={`/profile/${profile.username}`}
                        key={profile.id}
                        className="profile-card bg-gradient-to-br from-[#B671FF] to-[#E282CA] rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
                        onMouseEnter={(e) => e.currentTarget.classList.add('animate-profile-hover')}
                        onMouseLeave={(e) => e.currentTarget.classList.remove('animate-profile-hover')}
                        onClick={(e) => e.currentTarget.classList.add('animate-profile-click')}
                    >
                        <div className="aspect-square relative">
                            <div className="w-full h-full flex items-center justify-center bg-white/10">
                                <Avatar className="w-24 h-24 ring-4 ring-white/30 shadow-lg">
                                    <AvatarImage src={profile.profileImage} alt={profile.username || 'User'} />
                                    <AvatarFallback className="bg-white/20 text-white text-2xl">
                                        {(profile.username || 'U').charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4">
                                <h4 className="text-white font-bold truncate text-base">@{profile.username || 'unknown'}</h4>
                                <div className="flex items-center text-white/90 text-sm mt-1">
                                    <Icon icon="mdi:account-group" className="mr-1 h-4 w-4" />
                                    <span>{profile.followersCount.toLocaleString()} followers</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
} 