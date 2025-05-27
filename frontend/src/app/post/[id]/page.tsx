'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DynamicPostCard } from '@/components/home/DynamicPostCard';
import api from '@/lib/apiUtils';
import { toast } from 'react-hot-toast';

export default function PostPage() {
    const { id } = useParams();
    const [post, setPost] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const response = await api.get(`/posts/${id}`);
                if (response.data.success) {
                    setPost(response.data.post);
                } else {
                    throw new Error('Failed to fetch post');
                }
            } catch (error) {
                console.error('Error fetching post:', error);
                toast.error('Failed to load post');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchPost();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#B671FF]"></div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
                    <p className="text-gray-600">The post you&apos;re looking for doesn&apos;t exist or has been removed.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <DynamicPostCard
                _id={post._id}
                user={post.user}
                content={post.content}
                media={post.media}
                poll={post.poll}
                likes={post.likes}
                comments={post.comments}
                createdAt={post.createdAt}
                isPinned={post.isPinned}
                currentUserId={post.user._id}
                isHomePage={false}
            />
        </div>
    );
}