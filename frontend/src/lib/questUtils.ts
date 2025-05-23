// Quest utility functions for tracking user actions
import api from './apiUtils';

// Track post creation for quest system - no authentication required
export const trackPostCreation = async (postId: string) => {
  try {
    // Get the quest user ID from localStorage
    const userId = localStorage.getItem('questUserId');
    if (!userId) return;

    // Make a request to the quest tracking endpoint
    await api.post(`/api/quests/track/post/${userId}/${postId}`);
  } catch (error) {
    console.error('Quest tracking error (post creation):', error);
    // Don't fail the operation if quest tracking fails
  }
};

// Track post like for quest system - no authentication required
export const trackPostLike = async (postId: string) => {
  try {
    // Get the quest user ID from localStorage
    const userId = localStorage.getItem('questUserId');
    if (!userId) return;

    // Make a request to the quest tracking endpoint
    await api.post(`/api/quests/track/like/${userId}/${postId}`);
  } catch (error) {
    console.error('Quest tracking error (like):', error);
    // Don't fail the operation if quest tracking fails
  }
};

// Track post comment for quest system - no authentication required
export const trackPostComment = async (postId: string, commentId: string) => {
  try {
    // Get the quest user ID from localStorage
    const userId = localStorage.getItem('questUserId');
    if (!userId) return;

    // Make a request to the quest tracking endpoint
    await api.post(`/api/quests/track/comment/${userId}/${postId}/${commentId}`);
  } catch (error) {
    console.error('Quest tracking error (comment):', error);
    // Don't fail the operation if quest tracking fails
  }
};