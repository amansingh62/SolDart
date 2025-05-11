"use client";

import React, { useState, useEffect } from 'react';
import { Icon } from "@iconify/react";
import { useLanguage } from '../../context/LanguageContext';
import api from '@/lib/apiUtils';
import { Socket } from 'socket.io-client';
import { initializeSocket, disconnectSocket } from '@/lib/socketUtils';
import { toast } from 'react-hot-toast';

// Define interfaces for quest data
interface QuestProgress {
  questType: 'post' | 'comment' | 'like';
  currentCount: number;
  maxCount: number;
  pointsPerAction: number;
  totalPoints: number;
  completedAt?: string;
  lastUpdated: string;
}

interface QuestData {
  _id: string;
  user: string;
  totalPoints: number;
  medal: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';
  quests: {
    posts: QuestProgress;
    comments: QuestProgress;
    likes: QuestProgress;
  };
  createdAt: string;
  updatedAt: string;
}

const QuestsPage = () => {
  const { t } = useLanguage();
  // Remove auth context dependency
  // const { user } = useAuth();
  const [questData, setQuestData] = useState<QuestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Get userId from localStorage on component mount
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  // Fetch quest data on component mount when user ID is available
  useEffect(() => {
    console.log('User state changed:', { userId });

    // Import socket utilities
    const { initializeSocket, disconnectSocket } = require('@/lib/socketUtils');

    // If userId exists, fetch quest data and set up socket
    if (userId) {
      console.log('User ID available, fetching quest data for user:', userId);
      fetchQuestData();

      // Clean up any existing socket connection before creating a new one
      if (socket) {
        console.log('Cleaning up existing socket connection before creating a new one');
        if (socket.connected) {
          socket.emit('unsubscribeFromQuestUpdates', userId);
          socket.off('questProgress');
        }
        socket.disconnect();
        setSocket(null);
      }

      // Initialize socket connection using the utility function
      const socketInstance = initializeSocket();
      setSocket(socketInstance);

      // Subscribe to quest updates after successful connection
      if (socketInstance.connected) {
        socketInstance.emit('subscribeToQuestUpdates', userId);
        console.log('Subscribed to quest updates for user:', userId);
      } else {
        // If not connected yet, subscribe when connection is established
        socketInstance.on('connect', () => {
          console.log('Socket connected successfully for quests');
          socketInstance.emit('subscribeToQuestUpdates', userId);
          console.log('Subscribed to quest updates for user:', userId);
        });
      }

      // Listen for connection errors
      socketInstance.on('connect_error', (error: Error) => {
        console.error('Socket connection error:', error);
        toast.error('Connection error. Trying to reconnect...');
      });

      // Listen for quest progress updates
      socketInstance.on('questProgress', (updatedQuest: QuestData) => {
        console.log('Quest progress updated:', updatedQuest);
        
        // Only update quest data if it belongs to the current user
        if (updatedQuest.user === userId) {
          // Log specific point values for debugging
          console.log(`Updated points - Total: ${updatedQuest.totalPoints}, Posts: ${updatedQuest.quests.posts.totalPoints}, Comments: ${updatedQuest.quests.comments.totalPoints}, Likes: ${updatedQuest.quests.likes.totalPoints}`);
          setQuestData(updatedQuest);
          toast.success('Quest progress updated!');
        } else {
          console.log(`Ignoring quest update for different user: ${updatedQuest.user}`);
        }
      });

      // Cleanup on unmount
      return () => {
        console.log('Cleaning up socket connection for quests');
        // Unsubscribe before disconnecting
        if (socketInstance.connected) {
          socketInstance.emit('unsubscribeFromQuestUpdates', userId);
          socketInstance.off('questProgress');
          socketInstance.off('connect');
          socketInstance.off('connect_error');
        }
        setSocket(null);
      };
    } else {
      console.log('No user ID available, cannot fetch quest data');
      // Clean up any existing socket if userId is not available
      if (socket) {
        console.log('Cleaning up socket connection as userId is not available');
        if (socket.connected) {
          socket.off('questProgress');
        }
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [userId]);

  // Fetch quest data from API using non-authenticated endpoint
  const fetchQuestData = async () => {
    try {
      setLoading(true);
      console.log('Fetching quest data from API');

      if (!userId) {
        throw new Error('No user ID available');
      }

      // Always use non-authenticated endpoint with userId
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/quests/track-noauth?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }).then(res => res.json());

      if (response.success) {
        const questData = response.quest;
        console.log('Quest data fetched successfully:', questData);
        
        // Verify that the quest data belongs to the current user
        if (questData.user === userId) {
          // Log specific point values for debugging
          console.log(`Points breakdown - Total: ${questData.totalPoints}, Posts: ${questData.quests.posts.totalPoints}, Comments: ${questData.quests.comments.totalPoints}, Likes: ${questData.quests.likes.totalPoints}`);
          setQuestData(questData);
        } else {
          console.error(`Received quest data for wrong user. Expected: ${userId}, Got: ${questData.user}`);
          toast.error('Received incorrect quest data');
        }
      } else {
        console.warn('API returned success:false when fetching quests');
        toast.error('Failed to load quest data');
      }
    } catch (error) {
      console.error('Error fetching quest data:', error);
      toast.error('Failed to load quest data');
    } finally {
      setLoading(false);
    }
  };

  // Reset quest progress
  const handleResetQuests = async () => {
    try {
      setLoading(true);
      
      if (!userId) {
        throw new Error('No user ID available');
      }
      
      // Use non-authenticated endpoint for reset
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/quests/track-noauth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({
          userId: userId,
          activityType: 'reset'
        })
      }).then(res => res.json());

      if (response.success) {
        console.log('Quest progress reset successfully:', response.quest);
        // Log specific point values after reset for debugging
        console.log(`Points after reset - Total: ${response.quest.totalPoints}, Posts: ${response.quest.quests.posts.totalPoints}, Comments: ${response.quest.quests.comments.totalPoints}, Likes: ${response.quest.quests.likes.totalPoints}`);
        setQuestData(response.quest);
        toast.success('Quest progress reset!');
      } else {
        console.error('Failed to reset quest progress:', response);
        toast.error('Failed to reset quest progress');
      }
    } catch (error) {
      console.error('Error resetting quest progress:', error);
      toast.error('Failed to reset quest progress');
    } finally {
      setLoading(false);
    }
  };

  // Get medal icon based on medal type
  const getMedalIcon = (medal: string) => {
    switch (medal) {
      case 'bronze':
        return 'mdi:medal-outline';
      case 'silver':
        return 'mdi:medal';
      case 'gold':
        return 'mdi:medal';
      case 'platinum':
        return 'mdi:medal';
      default:
        return 'mdi:medal-outline';
    }
  };

  // Get medal color based on medal type
  const getMedalColor = (medal: string) => {
    switch (medal) {
      case 'bronze':
        return 'text-amber-700';
      case 'silver':
        return 'text-gray-400';
      case 'gold':
        return 'text-yellow-500';
      case 'platinum':
        return 'text-blue-400';
      default:
        return 'text-gray-500';
    }
  };

  // Calculate progress percentage
  const calculateProgress = (current: number, max: number) => {
    return Math.min((current / max) * 100, 100);
  };

  // Show loading state when quest data is still loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 bg-gray-50 min-h-[calc(100vh-4rem)]">
        <div className="w-16 h-16 border-4 border-t-[#B671FF] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">{t('Loading quest data...')}</p>
      </div>
    );
  }

  // Show message if no user ID is available
  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 bg-gray-50 min-h-[calc(100vh-4rem)]">
        <Icon icon="lucide:alert-circle" className="w-16 h-16 text-gray-400" />
        <p className="mt-4 text-gray-600">{t('Please log in to view your quests')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-8 px-4 bg-gray-50 min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-black text-white p-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#B671FF] rounded-full flex items-center justify-center">
              <Icon icon="lucide:trophy" className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('Quests')}</h1>
              <p className="text-gray-400">{t('Complete activities to earn points and medals')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`text-2xl font-bold ${getMedalColor(questData?.medal || 'none')}`}>
              <Icon icon={getMedalIcon(questData?.medal || 'none')} className="w-8 h-8 inline-block mr-2" />
              {questData?.totalPoints || 0} {t('pts')}
            </div>
          </div>
        </div>

        {/* Quest Content */}
        <div className="p-6">
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">{t('Daily Quests')}</h2>
            <div className="space-y-6">
              {/* Posts Quest */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Icon icon="lucide:pencil" className="text-blue-500 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{t('Create Posts')}</h3>
                      <p className="text-sm text-gray-500">{t('Share your thoughts with the community')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {questData?.quests.posts.currentCount || 0}/{questData?.quests.posts.maxCount || 3}
                    </div>
                    <div className="text-sm text-[#B671FF]">
                      {questData?.quests.posts.totalPoints || 0} {t('pts')}
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-500 h-2.5 rounded-full"
                    style={{ width: `${calculateProgress(questData?.quests.posts.currentCount || 0, questData?.quests.posts.maxCount || 3)}%` }}
                  ></div>
                </div>
              </div>

              {/* Comments Quest */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Icon icon="lucide:message-circle" className="text-green-500 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{t('Add Comments')}</h3>
                      <p className="text-sm text-gray-500">{t('Engage with other users\'s posts')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {questData?.quests.comments.currentCount || 0}/{questData?.quests.comments.maxCount || 5}
                    </div>
                    <div className="text-sm text-[#B671FF]">
                      {questData?.quests.comments.totalPoints || 0} {t('pts')}
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-green-500 h-2.5 rounded-full"
                    style={{ width: `${calculateProgress(questData?.quests.comments.currentCount || 0, questData?.quests.comments.maxCount || 5)}%` }}
                  ></div>
                </div>
              </div>

              {/* Likes Quest */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <Icon icon="lucide:heart" className="text-red-500 w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{t('Like Posts')}</h3>
                      <p className="text-sm text-gray-500">{t('Show appreciation for great content')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {questData?.quests.likes.currentCount || 0}/{questData?.quests.likes.maxCount || 7}
                    </div>
                    <div className="text-sm text-[#B671FF]">
                      {questData?.quests.likes.totalPoints || 0} {t('pts')}
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-red-500 h-2.5 rounded-full"
                    style={{ width: `${calculateProgress(questData?.quests.likes.currentCount || 0, questData?.quests.likes.maxCount || 7)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Medals Section */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">{t('Medals')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Bronze Medal */}
              <div className={`p-4 rounded-lg border-2 transition-all duration-300 transform hover:scale-105 ${questData && questData.totalPoints >= 20 ? 'border-amber-700 bg-amber-50 shadow-md' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <Icon icon="mdi:medal-outline" className={`w-6 h-6 ${questData && questData.totalPoints >= 20 ? 'text-amber-700' : 'text-gray-400'}`} />
                  <div>
                    <h3 className="font-semibold">{t('Bronze Medal')}</h3>
                    <p className="text-sm text-gray-500">{t('Earn 20 points')}</p>
                  </div>
                </div>
                {questData && questData.totalPoints >= 20 && (
                  <div className="mt-2 text-sm text-amber-700 font-semibold">
                    {t('Achieved!')}
                  </div>
                )}
              </div>

              {/* Silver Medal */}
              <div className={`p-4 rounded-lg border-2 transition-all duration-300 transform hover:scale-105 ${questData && questData.totalPoints >= 50 ? 'border-gray-400 bg-gray-50 shadow-md' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <Icon icon="mdi:medal" className={`w-6 h-6 ${questData && questData.totalPoints >= 50 ? 'text-gray-400' : 'text-gray-300'}`} />
                  <div>
                    <h3 className="font-semibold">{t('Silver Medal')}</h3>
                    <p className="text-sm text-gray-500">{t('Earn 50 points')}</p>
                  </div>
                </div>
                {questData && questData.totalPoints >= 50 ? (
                  <div className="mt-2 text-sm text-gray-500 font-semibold">
                    {t('Achieved!')}
                  </div>
                ) : questData && (
                  <div className="mt-2 text-sm text-gray-500">
                    {t('Need')} {50 - (questData?.totalPoints || 0)} {t('more points')}
                  </div>
                )}
              </div>

              {/* Gold Medal */}
              <div className={`p-4 rounded-lg border-2 transition-all duration-300 transform hover:scale-105 ${questData && questData.totalPoints >= 100 ? 'border-yellow-500 bg-yellow-50 shadow-md' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <Icon icon="mdi:medal" className={`w-6 h-6 ${questData && questData.totalPoints >= 100 ? 'text-yellow-500' : 'text-gray-300'}`} />
                  <div>
                    <h3 className="font-semibold">{t('Gold Medal')}</h3>
                    <p className="text-sm text-gray-500">{t('Earn 100 points')}</p>
                  </div>
                </div>
                {questData && questData.totalPoints >= 100 ? (
                  <div className="mt-2 text-sm text-yellow-500 font-semibold">
                    {t('Achieved!')}
                  </div>
                ) : questData && (
                  <div className="mt-2 text-sm text-gray-500">
                    {t('Need')} {100 - (questData?.totalPoints || 0)} {t('more points')}
                  </div>
                )}
              </div>

              {/* Platinum Medal */}
              <div className={`p-4 rounded-lg border-2 transition-all duration-300 transform hover:scale-105 ${questData && questData.totalPoints >= 200 ? 'border-blue-400 bg-blue-50 shadow-md' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <Icon icon="mdi:medal" className={`w-6 h-6 ${questData && questData.totalPoints >= 200 ? 'text-blue-400' : 'text-gray-300'}`} />
                  <div>
                    <h3 className="font-semibold">{t('Platinum Medal')}</h3>
                    <p className="text-sm text-gray-500">{t('Earn 200 points')}</p>
                  </div>
                </div>
                {questData && questData.totalPoints >= 200 ? (
                  <div className="mt-2 text-sm text-blue-400 font-semibold">
                    {t('Achieved!')}
                  </div>
                ) : questData && (
                  <div className="mt-2 text-sm text-gray-500">
                    {t('Need')} {200 - (questData?.totalPoints || 0)} {t('more points')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <div className="flex justify-center">
            <button
              onClick={handleResetQuests}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 transition-colors"
              disabled={loading}
            >
              {t('Reset Daily Quests')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestsPage;