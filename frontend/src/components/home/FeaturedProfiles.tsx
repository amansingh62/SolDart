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
            <div className="w-full py-4 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full py-4 text-center text-red-500">
                {error}
            </div>
        );
    }

    return (
        <div className="w-full py-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Featured Profiles</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
                {profiles.map((profile) => (
                    <Link
                        href={`/profile/${profile.username}`}
                        key={profile.id}
                        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
                    >
                        <div className="aspect-square relative">
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                <Avatar className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24">
                                    <AvatarImage src={profile.profileImage} alt={profile.username || 'User'} />
                                    <AvatarFallback className="bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-white text-lg sm:text-xl md:text-2xl">
                                        {(profile.username || 'U').charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 sm:p-3">
                                <h4 className="text-white font-bold truncate text-xs sm:text-sm md:text-base">@{profile.username || 'unknown'}</h4>
                                <div className="flex items-center text-white/80 text-[10px] sm:text-xs">
                                    <Icon icon="mdi:account-group" className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
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