'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from "@iconify/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import api from '@/lib/apiUtils';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

interface User {
    _id: string;
    username: string;
    profileImage: string;
    isFollowing?: boolean;
}

interface UserListModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId?: string; // Make userId optional
    type: 'followers' | 'following';
    title: string;
    onFollowChange?: (userId: string, isFollowing: boolean) => void;
}

export default function UserListModal({ isOpen, onClose, userId, type, title, onFollowChange }: UserListModalProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && userId) {
            fetchUsers();
        }
    }, [isOpen, userId, type]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            // Only make the API call if userId is defined
            if (!userId) {
                setError('User ID is missing');
                toast.error('Cannot load users: User ID is missing');
                return;
            }
            
            const response = await api.get(`/users/${type}/${userId}`);
            if (response.data.success) {
                setUsers(response.data.users);
            } else {
                throw new Error('Failed to fetch users');
            }
        } catch (err) {
            console.error(`Error fetching ${type}:`, err);
            setError(`Failed to load ${type}`);
            toast.error(`Failed to load ${type}`);
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async (targetUserId: string, isFollowing: boolean) => {
        try {
            const response = await api.post(`/users/follow/${targetUserId}`);
            if (response.data.success) {
                setUsers(prevUsers =>
                    prevUsers.map(user =>
                        user._id === targetUserId
                            ? { ...user, isFollowing: response.data.isFollowing }
                            : user
                    )
                );
                onFollowChange?.(targetUserId, response.data.isFollowing);
                toast.success(response.data.message);
            }
        } catch (error) {
            console.error('Error following/unfollowing user:', error);
            toast.error('Failed to update follow status');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between">
                    <h2 className="text-xl font-bold">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <Icon icon="lucide:x" className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex justify-center items-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B671FF]"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-500 py-4">{error}</div>
                    ) : users.length === 0 ? (
                        <div className="text-center text-gray-500 py-4">No {type} found</div>
                    ) : (
                        <div className="space-y-4">
                            {users.map((user) => (
                                <div key={user._id} className="flex items-center justify-between">
                                    <Link
                                        href={`/profile/${user.username}`}
                                        className="flex items-center gap-3 flex-1 min-w-0"
                                    >
                                        <Avatar className="w-12 h-12">
                                            <AvatarImage
                                                src={user.profileImage}
                                                alt={user.username}
                                            />
                                            <AvatarFallback>
                                                {user.username.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="font-semibold truncate">@{user.username}</p>
                                        </div>
                                    </Link>
                                    {user._id !== userId && (
                                        <button
                                            onClick={() => handleFollow(user._id, user.isFollowing || false)}
                                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${user.isFollowing
                                                ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                                                : 'bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-black hover:opacity-90'
                                                }`}
                                        >
                                            {user.isFollowing ? 'Following' : 'Follow'}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}