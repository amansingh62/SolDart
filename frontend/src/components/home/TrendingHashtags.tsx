'use client';

import React, { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Icon } from "@iconify/react";
import api from '@/lib/apiUtils';
import { useRouter } from 'next/navigation';
import { Skeleton } from "@/components/ui/skeleton";
import { io } from 'socket.io-client';
import { useHashtag } from '@/context/HashtagContext';

interface PostUser {
  _id: string;
  username: string;
  profileImage?: string;
  walletAddress?: string;
}

interface Post {
  _id: string;
  user: PostUser;
  content: string;
  hashtags: string[];
  views: number;
  createdAt: string;
}

interface TrendingHashtag {
  hashtag: string;
  posts: Post[];
  totalViews: number;
  postCount: number; // Number of times the hashtag appears across all posts
}

export function TrendingHashtags() {
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { setSelectedHashtag } = useHashtag();

  useEffect(() => {
    const fetchTrendingHashtags = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/posts/trending-hashtags');
        if (response.data && response.data.success) {
          setTrendingHashtags(response.data.trendingHashtags);
        }
      } catch (err) {
        console.error('Error fetching trending hashtags:', err);
        setError('Failed to load trending hashtags');
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchTrendingHashtags();

    // Set up socket connection for real-time updates
    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');

    // Listen for hashtags updates
    socket.on('hashtagsUpdated', (updatedHashtags: TrendingHashtag[]) => {
      console.log('Received real-time hashtag updates:', updatedHashtags);
      setTrendingHashtags(updatedHashtags);
    });

    // Clean up socket connection when component unmounts
    return () => {
      socket.off('hashtagsUpdated');
      socket.disconnect();
    };
  }, []);

  // Format count for display (works for both views and post counts)
  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // Hashtag navigation to focus on posts with the selected hashtag
  const navigateToHashtag = (hashtag: string) => {
    // Set the selected hashtag in the context
    setSelectedHashtag(hashtag);
    // Scroll to the top of the page to see the posts
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Navigate to user profile
  const navigateToProfile = (username: string) => {
    router.push(`/profile/${username}`);
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl overflow-hidden bg-[rgba(243,144,236,0.21)] border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.1)] backdrop-blur-[12px] p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Icon icon="lucide:hash" className="text-[#B671FF]" />
            Trending Hashtags
          </h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-white/20 rounded-xl">
              <Skeleton className="h-4 w-24 bg-white/30" />
              <Skeleton className="h-4 w-12 bg-white/30" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl overflow-hidden bg-[rgba(243,144,236,0.21)] border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.1)] backdrop-blur-[12px] p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Icon icon="lucide:hash" className="text-[#B671FF]" />
            Trending Hashtags
          </h3>
        </div>
        <div className="text-red-500 text-sm p-3 bg-red-100/50 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden bg-[rgba(243,144,236,0.21)] border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.1)] backdrop-blur-[12px] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(182,113,255,0.15)]">
      <div className="p-4 bg-gradient-to-r from-[#B671FF] to-[#E282CA] text-white">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Icon icon="lucide:hash" className="text-xl" />
          Trending Hashtags
        </h3>
        <p className="text-sm text-white/80">Explore what's hot right now</p>
      </div>

      <div className="p-4">
        {trendingHashtags.length > 0 ? (
          <div className="space-y-3">
            {trendingHashtags.map((item, index) => (
              <div
                key={index}
                className="group p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-300 cursor-pointer"
                onClick={() => navigateToHashtag(item.hashtag)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[#B671FF] group-hover:text-black transition-colors">{item.hashtag}</span>
                    <span className="text-xs text-gray-500 bg-white/50 px-2 py-0.5 rounded-full">
                      {formatCount(item.postCount)} posts
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                  <svg 
        className="w-3 h-3 mr-1"
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
                    <span>{formatCount(item.totalViews)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            No trending hashtags found
          </div>
        )}
      </div>
    </div>
  );
}
