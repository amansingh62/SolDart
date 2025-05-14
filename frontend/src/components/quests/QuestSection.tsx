'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Icon } from '@iconify/react';

interface QuestActivity {
  _id: string;
  user: string;
  posts: {
    count: number;
    maxCount: number;
    pointsPerItem: number;
  };
  comments: {
    count: number;
    maxCount: number;
    pointsPerItem: number;
  };
  likes: {
    count: number;
    maxCount: number;
    pointsPerItem: number;
  };
  totalPoints: number;
  medals: {
    bronze: boolean;
    silver: boolean;
  };
}

interface QuestSectionProps {
  userId?: string;
}

const QuestSection: React.FC<QuestSectionProps> = ({ userId }) => {
  const [questActivity, setQuestActivity] = useState<QuestActivity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestActivity = async () => {
      if (!userId) {
        // Create a default quest activity object if no userId is provided
        setQuestActivity({
          _id: 'default',
          user: 'default',
          posts: { count: 0, maxCount: 3, pointsPerItem: 10 },
          comments: { count: 0, maxCount: 5, pointsPerItem: 7 },
          likes: { count: 0, maxCount: 7, pointsPerItem: 5 },
          totalPoints: 0,
          medals: { bronze: false, silver: false }
        });
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`/api/quests/${userId}`);
        setQuestActivity(response.data);
      } catch (error) {
        console.error('Error fetching quest activity:', error);
        // Create a default quest activity object if there's an error
        setQuestActivity({
          _id: 'default',
          user: userId,
          posts: { count: 0, maxCount: 3, pointsPerItem: 10 },
          comments: { count: 0, maxCount: 5, pointsPerItem: 7 },
          likes: { count: 0, maxCount: 7, pointsPerItem: 5 },
          totalPoints: 0,
          medals: { bronze: false, silver: false }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchQuestActivity();
  }, [userId]);

  if (loading) {
    return <div className="p-4">Loading quest data...</div>;
  }

  if (!questActivity) {
    return <div className="p-4">No quest data available</div>;
  }

  const calculateProgress = (count: number, maxCount: number) => {
    return Math.min((count / maxCount) * 100, 100);
  };

  const calculateQuestPoints = (activity: { count: number, pointsPerItem: number }) => {
    return activity.count * activity.pointsPerItem;
  };

  return (
    <div className="w-full bg-black min-h-screen">
      {/* Header with total points */}
      <div className="bg-black p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-purple-600 rounded-full p-3">
            <Icon icon="mdi:trophy" className="text-white text-3xl" />
          </div>
          <div>
            <h1 className="text-white text-3xl font-bold">Quests</h1>
            <p className="text-gray-400">Complete activities to earn points and medals</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Icon icon="mdi:medal" className="text-gray-400 text-2xl" />
          <span className="text-white text-2xl font-bold">{questActivity.totalPoints} pts</span>
        </div>
      </div>

      {/* Daily Quests Section */}
      <div className="bg-white rounded-lg mx-4 p-6 mb-6">
        <h2 className="text-2xl font-bold mb-6">Daily Quests</h2>

        {/* Create Posts Quest */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 rounded-full p-3">
                <Icon icon="mdi:pencil" className="text-blue-500 text-xl" />
              </div>
              <div>
                <h3 className="font-bold">Create Posts</h3>
                <p className="text-gray-500">Share your thoughts with the community</p>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold">{questActivity.posts.count}/{questActivity.posts.maxCount}</div>
              <div className="text-purple-500">{calculateQuestPoints(questActivity.posts)} pts</div>
            </div>
          </div>
          <Progress value={calculateProgress(questActivity.posts.count, questActivity.posts.maxCount)} className="h-2 bg-gray-200" />
        </div>

        {/* Add Comments Quest */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 rounded-full p-3">
                <Icon icon="mdi:chat" className="text-green-500 text-xl" />
              </div>
              <div>
                <h3 className="font-bold">Add Comments</h3>
                <p className="text-gray-500">Engage with other users's posts</p>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold">{questActivity.comments.count}/{questActivity.comments.maxCount}</div>
              <div className="text-purple-500">{calculateQuestPoints(questActivity.comments)} pts</div>
            </div>
          </div>
          <Progress value={calculateProgress(questActivity.comments.count, questActivity.comments.maxCount)} className="h-2 bg-gray-200" />
        </div>

        {/* Like Posts Quest */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <div className="bg-red-100 rounded-full p-3">
                <Icon icon="mdi:heart" className="text-red-500 text-xl" />
              </div>
              <div>
                <h3 className="font-bold">Like Posts</h3>
                <p className="text-gray-500">Show appreciation for great content</p>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold">{questActivity.likes.count}/{questActivity.likes.maxCount}</div>
              <div className="text-purple-500">{calculateQuestPoints(questActivity.likes)} pts</div>
            </div>
          </div>
          <Progress value={calculateProgress(questActivity.likes.count, questActivity.likes.maxCount)} className="h-2 bg-gray-200" />
        </div>
      </div>

      {/* Medals Section */}
      <div className="bg-white rounded-lg mx-4 p-6">
        <h2 className="text-2xl font-bold mb-6">Medals</h2>

        <div className="grid grid-cols-2 gap-4">
          {/* Bronze Medal */}
          <div className={`p-4 rounded-lg ${questActivity.medals.bronze ? 'bg-amber-100' : 'bg-gray-100'}`}>
            <div className="flex items-center gap-4">
              <Icon 
                icon="mdi:medal" 
                className={`text-3xl ${questActivity.medals.bronze ? 'text-amber-700' : 'text-gray-400'}`} 
              />
              <div>
                <h3 className="font-bold">Bronze Medal</h3>
                <p className="text-gray-500">Earn 20 points</p>
              </div>
            </div>
          </div>

          {/* Silver Medal */}
          <div className={`p-4 rounded-lg ${questActivity.medals.silver ? 'bg-gray-200' : 'bg-gray-100'}`}>
            <div className="flex items-center gap-4">
              <Icon 
                icon="mdi:medal" 
                className={`text-3xl ${questActivity.medals.silver ? 'text-gray-500' : 'text-gray-400'}`} 
              />
              <div>
                <h3 className="font-bold">Silver Medal</h3>
                <p className="text-gray-500">Earn 50 points</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestSection;