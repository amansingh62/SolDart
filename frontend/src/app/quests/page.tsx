"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { Icon } from "@iconify/react";
import { useLanguage } from '../../context/LanguageContext';
import api from '../../lib/apiUtils';
import { useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

// Define types for quest data
type QuestData = {
  userId: string;
  posts: {
    count: number;
    points: number;
    postIds: string[];
  };
  likes: {
    count: number;
    points: number;
    postIds: string[];
  };
  comments: {
    count: number;
    points: number;
    commentIds: string[];
  };
  totalPoints: number;
  rewardTier: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  remaining: {
    posts: number;
    likes: number;
    comments: number;
  };
  potential: {
    posts: number;
    likes: number;
    comments: number;
    total: number;
  };
  pointValues: {
    POST: number;
    LIKE: number;
    COMMENT: number;
  };
  limits: {
    POSTS: number;
    LIKES: number;
    COMMENTS: number;
  };
};

// Separate component that uses useSearchParams
const QuestsContent = () => {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [questData, setQuestData] = useState<QuestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Get or create a user ID for tracking quests
  useEffect(() => {
    if (!isClient) return; // Only run on client side

    // Check if user ID is in URL parameters
    const urlUserId = searchParams.get('userId');
    
    if (urlUserId) {
      setUserId(urlUserId);
      localStorage.setItem('questUserId', urlUserId);
    } else {
      // Check if user ID is in local storage
      const storedUserId = localStorage.getItem('questUserId');
      
      if (storedUserId) {
        setUserId(storedUserId);
      } else {
        // Generate a new user ID if none exists
        const newUserId = uuidv4();
        setUserId(newUserId);
        localStorage.setItem('questUserId', newUserId);
      }
    }
  }, [searchParams, isClient]);

  // Fetch quest data when userId is available
  useEffect(() => {
    if (!userId || !isClient) return;

    const fetchQuestData = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/quests/${userId}`);
        if (response.data.success) {
          setQuestData(response.data.quest);
        } else {
          setError(response.data.message || 'Failed to fetch quest data');
        }
      } catch (err) {
        console.error('Error fetching quest data:', err);
        setError('Failed to connect to quest service');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestData();
  }, [userId, isClient]);

  // Helper function to get reward tier color
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'text-amber-700';
      case 'silver': return 'text-gray-400';
      case 'gold': return 'text-yellow-500';
      case 'platinum': return 'text-blue-400';
      case 'diamond': return 'text-purple-500';
      default: return 'text-gray-600';
    }
  };

  // Helper function to get reward tier icon
  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'lucide:award';
      case 'silver': return 'lucide:award';
      case 'gold': return 'lucide:award';
      case 'platinum': return 'lucide:award';
      case 'diamond': return 'lucide:diamond';
      default: return 'lucide:circle';
    }
  };

  // Calculate progress percentage for a specific activity
  const calculateProgress = (current: number, max: number) => {
    return Math.min(100, Math.round((current / max) * 100));
  };

  // Show loading state until client-side is ready
  if (!isClient || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] bg-gray-50">
        <div className="animate-spin text-[#B671FF] mb-4">
          <Icon icon="lucide:loader" className="w-10 h-10" />
        </div>
        <p className="text-gray-600">{t('Loading quest data...')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] bg-gray-50">
        <div className="text-red-500 mb-4">
          <Icon icon="lucide:alert-circle" className="w-10 h-10" />
        </div>
        <p className="text-gray-600">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 bg-black text-[#B671FF] px-4 py-2 rounded-lg"
        >
          {t('Try Again')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-8 px-4 bg-gray-50 min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-4xl">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{t('Quests & Rewards')}</h1>
              <p className="text-gray-600 mt-1">
                {t('Complete activities to earn points and unlock rewards')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-black rounded-full p-3">
                <Icon icon="lucide:trophy" className="text-[#B671FF] w-6 h-6" />
              </div>
            </div>
          </div>

          {questData && (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-500">{t('Total Points')}</span>
                  <h2 className="text-2xl font-bold">{questData.totalPoints}</h2>
                </div>
                <div className="text-right">
                  <span className="text-sm text-gray-500">{t('Current Tier')}</span>
                  <div className="flex items-center gap-2">
                    <Icon 
                      icon={getTierIcon(questData.rewardTier)} 
                      className={`w-5 h-5 ${getTierColor(questData.rewardTier)}`} 
                    />
                    <h2 className={`text-xl font-bold capitalize ${getTierColor(questData.rewardTier)}`}>
                      {questData.rewardTier !== 'none' ? questData.rewardTier : t('No Tier')}
                    </h2>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quests Section */}
        {questData && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">{t('Available Quests')}</h2>
            
            {/* Posts Quest */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:pencil" className="text-[#B671FF] w-5 h-5" />
                  <span className="font-medium">{t('Create Posts')}</span>
                </div>
                <div className="text-sm">
                  <span className="font-bold">{questData.posts.count}</span>
                  <span className="text-gray-500">/{questData.limits.POSTS}</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-[#B671FF] h-2.5 rounded-full" 
                  style={{ width: `${calculateProgress(questData.posts.count, questData.limits.POSTS)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{questData.pointValues.POST} {t('points per post')}</span>
                <span>{questData.posts.points} {t('points earned')}</span>
              </div>
            </div>
            
            {/* Likes Quest */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:heart" className="text-[#B671FF] w-5 h-5" />
                  <span className="font-medium">{t('Like Posts')}</span>
                </div>
                <div className="text-sm">
                  <span className="font-bold">{questData.likes.count}</span>
                  <span className="text-gray-500">/{questData.limits.LIKES}</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-[#B671FF] h-2.5 rounded-full" 
                  style={{ width: `${calculateProgress(questData.likes.count, questData.limits.LIKES)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{questData.pointValues.LIKE} {t('points per like')}</span>
                <span>{questData.likes.points} {t('points earned')}</span>
              </div>
            </div>
            
            {/* Comments Quest */}
            <div className="mb-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:message-circle" className="text-[#B671FF] w-5 h-5" />
                  <span className="font-medium">{t('Comment on Posts')}</span>
                </div>
                <div className="text-sm">
                  <span className="font-bold">{questData.comments.count}</span>
                  <span className="text-gray-500">/{questData.limits.COMMENTS}</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-[#B671FF] h-2.5 rounded-full" 
                  style={{ width: `${calculateProgress(questData.comments.count, questData.limits.COMMENTS)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{questData.pointValues.COMMENT} {t('points per comment')}</span>
                <span>{questData.comments.points} {t('points earned')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Rewards Section */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">{t('Reward Tiers')}</h2>
          
          <div className="space-y-4">
            {/* Bronze Tier */}
            <div className={`p-4 rounded-lg border ${questData?.rewardTier === 'bronze' || questData?.rewardTier === 'silver' || questData?.rewardTier === 'gold' || questData?.rewardTier === 'platinum' || questData?.rewardTier === 'diamond' ? 'border-amber-700 bg-amber-50' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:award" className="text-amber-700 w-5 h-5" />
                  <span className="font-medium text-amber-700">{t('Bronze')}</span>
                </div>
                <span className="text-sm text-gray-600">100 {t('points')}</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">{t('Unlock bronze badge for your profile')}</p>
            </div>
            
            {/* Silver Tier */}
            <div className={`p-4 rounded-lg border ${questData?.rewardTier === 'silver' || questData?.rewardTier === 'gold' || questData?.rewardTier === 'platinum' || questData?.rewardTier === 'diamond' ? 'border-gray-400 bg-gray-50' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:award" className="text-gray-400 w-5 h-5" />
                  <span className="font-medium text-gray-400">{t('Silver')}</span>
                </div>
                <span className="text-sm text-gray-600">300 {t('points')}</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">{t('Unlock silver badge and special reactions')}</p>
            </div>
            
            {/* Gold Tier */}
            <div className={`p-4 rounded-lg border ${questData?.rewardTier === 'gold' || questData?.rewardTier === 'platinum' || questData?.rewardTier === 'diamond' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:award" className="text-yellow-500 w-5 h-5" />
                  <span className="font-medium text-yellow-500">{t('Gold')}</span>
                </div>
                <span className="text-sm text-gray-600">600 {t('points')}</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">{t('Unlock gold badge and priority comments')}</p>
            </div>
            
            {/* Platinum Tier */}
            <div className={`p-4 rounded-lg border ${questData?.rewardTier === 'platinum' || questData?.rewardTier === 'diamond' ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:award" className="text-blue-400 w-5 h-5" />
                  <span className="font-medium text-blue-400">{t('Platinum')}</span>
                </div>
                <span className="text-sm text-gray-600">1050 {t('points')}</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">{t('Unlock platinum badge and exclusive features')}</p>
            </div>
            
            {/* Diamond Tier */}
            <div className={`p-4 rounded-lg border ${questData?.rewardTier === 'diamond' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:diamond" className="text-purple-500 w-5 h-5" />
                  <span className="font-medium text-purple-500">{t('Diamond')}</span>
                </div>
                <span className="text-sm text-gray-600">2000 {t('points')}</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">{t('Unlock diamond badge and all premium features')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Loading fallback component
const QuestsLoadingFallback = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] bg-gray-50">
      <div className="animate-spin text-[#B671FF] mb-4">
        <Icon icon="lucide:loader" className="w-10 h-10" />
      </div>
      <p className="text-gray-600">Loading...</p>
    </div>
  );
};

// Main component with Suspense wrapper
const QuestsPage = () => {
  return (
    <Suspense fallback={<QuestsLoadingFallback />}>
      <QuestsContent />
    </Suspense>
  );
};

export default QuestsPage;