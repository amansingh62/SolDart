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

// Add these styles at the top of the file after the imports
const styles = `
  @keyframes progressFill {
    0% { width: 0; }
    100% { width: var(--fill-width); }
  }

  @keyframes tierGlow {
    0% { box-shadow: 0 0 5px rgba(var(--tier-color), 0.5); }
    50% { box-shadow: 0 0 20px rgba(var(--tier-color), 0.8); }
    100% { box-shadow: 0 0 5px rgba(var(--tier-color), 0.5); }
  }

  @keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
    100% { transform: translateY(0px); }
  }

  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }

  .animate-progress {
    animation: progressFill 1s ease-out forwards;
  }

  .animate-tier-glow {
    animation: tierGlow 2s infinite;
  }

  .animate-float {
    animation: float 3s ease-in-out infinite;
  }

  .animate-pulse {
    animation: pulse 2s ease-in-out infinite;
  }

  .gradient-border {
    position: relative;
    background: linear-gradient(white, white) padding-box,
                linear-gradient(to right, #32CD32, #7CFC00, #90EE90) border-box;
    border: 2px solid transparent;
  }

  .tier-gradient {
    background: linear-gradient(135deg, var(--tier-start), var(--tier-end));
  }

  .quest-card {
    transition: all 0.3s ease;
  }

  .quest-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  }
`;

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
    <div className="flex flex-col items-center py-8 px-4 bg-gradient-to-b from-purple-50 via-white to-pink-50 min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-4xl">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 gradient-border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[#32CD32] via-[#7CFC00] to-[#90EE90] bg-clip-text text-transparent">
                {t('Quests & Rewards')}
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                {t('Complete activities to earn points and unlock rewards')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-[#32CD32] via-[#7CFC00] to-[#90EE90] rounded-full p-4 animate-float">
                <Icon icon="lucide:trophy" className="text-white w-8 h-8" />
              </div>
            </div>
          </div>

          {questData && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-r from-[#32CD32] via-[#7CFC00] to-[#90EE90] rounded-xl p-6 text-white shadow-lg">
                <span className="text-sm opacity-80">{t('Total Points')}</span>
                <h2 className="text-4xl font-bold mt-1">{questData.totalPoints}</h2>
                <div className="mt-4 flex items-center gap-2">
                  <Icon icon="lucide:trending-up" className="w-5 h-5" />
                  <span className="text-sm">
                    {questData.potential.total} {t('potential points remaining')}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md border border-purple-100">
                <span className="text-sm text-gray-500">{t('Current Tier')}</span>
                <div className="flex items-center gap-3 mt-1">
                  <div className={`p-3 rounded-full ${getTierColor(questData.rewardTier)} bg-opacity-10`}>
                    <Icon
                      icon={getTierIcon(questData.rewardTier)}
                      className={`w-6 h-6 ${getTierColor(questData.rewardTier)}`}
                    />
                  </div>
                  <h2 className={`text-2xl font-bold capitalize ${getTierColor(questData.rewardTier)}`}>
                    {questData.rewardTier !== 'none' ? questData.rewardTier : t('No Tier')}
                  </h2>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quests Section */}
        {questData && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8 gradient-border">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-[#32CD32] via-[#7CFC00] to-[#90EE90] bg-clip-text text-transparent">
              {t('Available Quests')}
            </h2>

            <div className="space-y-8">
              {/* Posts Quest */}
              <div className="quest-card bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-r from-[#32CD32] via-[#7CFC00] to-[#90EE90] rounded-lg p-2">
                      <Icon icon="lucide:pencil" className="text-white w-5 h-5" />
                    </div>
                    <span className="font-medium text-lg">{t('Create Posts')}</span>
                  </div>
                  <div className="text-sm bg-white px-3 py-1 rounded-full shadow-sm">
                    <span className="font-bold text-[#32CD32]">{questData.posts.count}</span>
                    <span className="text-gray-500">/{questData.limits.POSTS}</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#32CD32] via-[#7CFC00] to-[#90EE90] h-3 rounded-full animate-progress"
                    style={{ '--fill-width': `${calculateProgress(questData.posts.count, questData.limits.POSTS)}%` } as React.CSSProperties}
                  ></div>
                </div>
                <div className="flex justify-between text-sm mt-3">
                  <span className="text-gray-600">{questData.pointValues.POST} {t('points per post')}</span>
                  <span className="font-medium text-[#32CD32]">{questData.posts.points} {t('points earned')}</span>
                </div>
              </div>

              {/* Likes Quest */}
              <div className="quest-card bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-r from-[#32CD32] via-[#7CFC00] to-[#90EE90] rounded-lg p-2">
                      <Icon icon="lucide:heart" className="text-white w-5 h-5" />
                    </div>
                    <span className="font-medium text-lg">{t('Like Posts')}</span>
                  </div>
                  <div className="text-sm bg-white px-3 py-1 rounded-full shadow-sm">
                    <span className="font-bold text-[#32CD32]">{questData.likes.count}</span>
                    <span className="text-gray-500">/{questData.limits.LIKES}</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#32CD32] via-[#7CFC00] to-[#90EE90] h-3 rounded-full animate-progress"
                    style={{ '--fill-width': `${calculateProgress(questData.likes.count, questData.limits.LIKES)}%` } as React.CSSProperties}
                  ></div>
                </div>
                <div className="flex justify-between text-sm mt-3">
                  <span className="text-gray-600">{questData.pointValues.LIKE} {t('points per like')}</span>
                  <span className="font-medium text-[#32CD32]">{questData.likes.points} {t('points earned')}</span>
                </div>
              </div>

              {/* Comments Quest */}
              <div className="quest-card bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-r from-[#32CD32] via-[#7CFC00] to-[#90EE90] rounded-lg p-2">
                      <Icon icon="lucide:message-circle" className="text-white w-5 h-5" />
                    </div>
                    <span className="font-medium text-lg">{t('Comment on Posts')}</span>
                  </div>
                  <div className="text-sm bg-white px-3 py-1 rounded-full shadow-sm">
                    <span className="font-bold text-[#32CD32]">{questData.comments.count}</span>
                    <span className="text-gray-500">/{questData.limits.COMMENTS}</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#32CD32] via-[#7CFC00] to-[#90EE90] h-3 rounded-full animate-progress"
                    style={{ '--fill-width': `${calculateProgress(questData.comments.count, questData.limits.COMMENTS)}%` } as React.CSSProperties}
                  ></div>
                </div>
                <div className="flex justify-between text-sm mt-3">
                  <span className="text-gray-600">{questData.pointValues.COMMENT} {t('points per comment')}</span>
                  <span className="font-medium text-[#32CD32]">{questData.comments.points} {t('points earned')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rewards Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 gradient-border">
          <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-[#32CD32] via-[#7CFC00] to-[#90EE90] bg-clip-text text-transparent">
            {t('Reward Tiers')}
          </h2>

          <div className="space-y-4">
            {/* Bronze Tier */}
            <div
              className={`p-6 rounded-xl transition-all duration-300 ${questData?.rewardTier === 'bronze' || questData?.rewardTier === 'silver' || questData?.rewardTier === 'gold' || questData?.rewardTier === 'platinum' || questData?.rewardTier === 'diamond'
                ? 'bg-amber-50 border-2 border-amber-700 animate-tier-glow'
                : 'bg-white border border-gray-200 hover:border-amber-700 hover:bg-amber-50'
                }`}
              style={{ '--tier-color': '180, 83, 9' } as React.CSSProperties}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-700 rounded-lg p-2">
                    <Icon icon="lucide:award" className="text-white w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-medium text-amber-700 text-lg">{t('Bronze')}</span>
                    <p className="text-sm text-amber-700/70 mt-1">{t('Unlock bronze badge for your profile')}</p>
                  </div>
                </div>
                <div className="bg-white px-4 py-2 rounded-full shadow-sm">
                  <span className="text-sm font-medium text-amber-700">500 {t('points')}</span>
                </div>
              </div>
            </div>

            {/* Silver Tier */}
            <div
              className={`p-6 rounded-xl transition-all duration-300 ${questData?.rewardTier === 'silver' || questData?.rewardTier === 'gold' || questData?.rewardTier === 'platinum' || questData?.rewardTier === 'diamond'
                ? 'bg-gray-50 border-2 border-gray-400 animate-tier-glow'
                : 'bg-white border border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                }`}
              style={{ '--tier-color': '156, 163, 175' } as React.CSSProperties}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-400 rounded-lg p-2">
                    <Icon icon="lucide:award" className="text-white w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-medium text-gray-400 text-lg">{t('Silver')}</span>
                    <p className="text-sm text-gray-400/70 mt-1">{t('Unlock silver badge and special reactions')}</p>
                  </div>
                </div>
                <div className="bg-white px-4 py-2 rounded-full shadow-sm">
                  <span className="text-sm font-medium text-gray-400">2500 {t('points')}</span>
                </div>
              </div>
            </div>

            {/* Gold Tier */}
            <div
              className={`p-6 rounded-xl transition-all duration-300 ${questData?.rewardTier === 'gold' || questData?.rewardTier === 'platinum' || questData?.rewardTier === 'diamond'
                ? 'bg-yellow-50 border-2 border-yellow-500 animate-tier-glow'
                : 'bg-white border border-gray-200 hover:border-yellow-500 hover:bg-yellow-50'
                }`}
              style={{ '--tier-color': '234, 179, 8' } as React.CSSProperties}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-500 rounded-lg p-2">
                    <Icon icon="lucide:award" className="text-white w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-medium text-yellow-500 text-lg">{t('Gold')}</span>
                    <p className="text-sm text-yellow-500/70 mt-1">{t('Unlock gold badge and priority comments')}</p>
                  </div>
                </div>
                <div className="bg-white px-4 py-2 rounded-full shadow-sm">
                  <span className="text-sm font-medium text-yellow-500">7500 {t('points')}</span>
                </div>
              </div>
            </div>

            {/* Platinum Tier */}
            <div
              className={`p-6 rounded-xl transition-all duration-300 ${questData?.rewardTier === 'platinum' || questData?.rewardTier === 'diamond'
                ? 'bg-blue-50 border-2 border-blue-400 animate-tier-glow'
                : 'bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                }`}
              style={{ '--tier-color': '96, 165, 250' } as React.CSSProperties}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-400 rounded-lg p-2">
                    <Icon icon="lucide:award" className="text-white w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-medium text-blue-400 text-lg">{t('Platinum')}</span>
                    <p className="text-sm text-blue-400/70 mt-1">{t('Unlock platinum badge and exclusive features')}</p>
                  </div>
                </div>
                <div className="bg-white px-4 py-2 rounded-full shadow-sm">
                  <span className="text-sm font-medium text-blue-400">15000 {t('points')}</span>
                </div>
              </div>
            </div>

            {/* Diamond Tier */}
            <div
              className={`p-6 rounded-xl transition-all duration-300 ${questData?.rewardTier === 'diamond'
                ? 'bg-purple-50 border-2 border-purple-500 animate-tier-glow'
                : 'bg-white border border-gray-200 hover:border-purple-500 hover:bg-purple-50'
                }`}
              style={{ '--tier-color': '168, 85, 247' } as React.CSSProperties}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-500 rounded-lg p-2">
                    <Icon icon="lucide:diamond" className="text-white w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-medium text-purple-500 text-lg">{t('Diamond')}</span>
                    <p className="text-sm text-purple-500/70 mt-1">{t('Unlock diamond badge and all premium features')}</p>
                  </div>
                </div>
                <div className="bg-white px-4 py-2 rounded-full shadow-sm">
                  <span className="text-sm font-medium text-purple-500">25000 {t('points')}</span>
                </div>
              </div>
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