// utils/questTracker.js
const Quest = require('../models/Quest');
const User = require('../models/User');
const { needsReset } = require('./questReset');

/**
 * Track user activity and update quest progress without requiring authentication
 * This function can be called from any route to update quest progress
 * @param {string} userId - The ID of the user performing the activity
 * @param {string} activityType - The type of activity ('post', 'comment', 'like')
 * @param {object} io - Socket.io instance for real-time updates
 * @returns {Promise<object>} - Updated quest object or error
 */
async function trackUserActivity(userId, activityType, io) {
  try {
    if (!userId) {
      console.error('No user ID provided for quest tracking');
      return { success: false, message: 'User ID is required' };
    }

    if (!['post', 'comment', 'like'].includes(activityType)) {
      console.error(`Invalid activity type: ${activityType}`);
      return { success: false, message: 'Invalid activity type' };
    }

    // Find or create quest progress for the user
    let quest = await Quest.findOne({ user: userId });

    // Check if quest needs to be reset (more than 24 hours since last reset)
    if (quest && needsReset(quest)) {
      console.log(`Resetting quest counts for user ${userId} during activity tracking`);

      // Store the previous total points for each quest type
      const postsTotal = quest.quests.posts?.totalPoints || 0;
      const commentsTotal = quest.quests.comments?.totalPoints || 0;
      const likesTotal = quest.quests.likes?.totalPoints || 0;

      // Store the overall total points which includes check-in points
      const overallTotalPoints = quest.totalPoints;

      // Reset current counts to 0
      if (quest.quests.posts) {
        quest.quests.posts.currentCount = 0;
        // Preserve total points
        quest.quests.posts.totalPoints = postsTotal;
      }

      if (quest.quests.comments) {
        quest.quests.comments.currentCount = 0;
        // Preserve total points
        quest.quests.comments.totalPoints = commentsTotal;
      }

      if (quest.quests.likes) {
        quest.quests.likes.currentCount = 0;
        // Preserve total points
        quest.quests.likes.totalPoints = likesTotal;
      }

      // Calculate quest-specific points (excluding check-in points)
      const questSpecificPoints = postsTotal + commentsTotal + likesTotal;

      // Preserve the check-in points by calculating the difference
      // between overall total and quest-specific points
      const checkInPoints = overallTotalPoints - questSpecificPoints;

      // Set the totalPoints to include both quest-specific and check-in points
      quest.totalPoints = questSpecificPoints + checkInPoints;

      // Update the last reset date
      quest.lastResetDate = new Date();

      // Save the updated quest
      await quest.save();
    } else if (!quest) {
      // Create new quest progress with default values
      quest = new Quest({
        user: userId,
        quests: {
          posts: {
            questType: 'post',
            currentCount: 0,
            maxCount: 3,
            pointsPerAction: 10,
            totalPoints: 0
          },
          comments: {
            questType: 'comment',
            currentCount: 0,
            maxCount: 5,
            pointsPerAction: 7,
            totalPoints: 0
          },
          likes: {
            questType: 'like',
            currentCount: 0,
            maxCount: 7,
            pointsPerAction: 5,
            totalPoints: 0
          }
        }
      });
    }

    // Update the appropriate quest progress
    const questField = activityType === 'post' ? 'posts' :
      activityType === 'comment' ? 'comments' : 'likes';

    const questProgress = quest.quests[questField];

    // Only increment if not already at max
    if (questProgress.currentCount < questProgress.maxCount) {
      questProgress.currentCount += 1;
      questProgress.totalPoints = questProgress.currentCount * questProgress.pointsPerAction;
      questProgress.lastUpdated = new Date();

      // If quest is now complete, set completedAt
      if (questProgress.currentCount >= questProgress.maxCount) {
        questProgress.completedAt = new Date();
      }

      // Store previous medal status to detect changes
      const previousMedal = quest.medal;

      // Calculate total points from all quest types
      const postsPoints = quest.quests.posts?.totalPoints || 0;
      const commentsPoints = quest.quests.comments?.totalPoints || 0;
      const likesPoints = quest.quests.likes?.totalPoints || 0;
      
      // Set the total points on the quest object
      quest.totalPoints = postsPoints + commentsPoints + likesPoints;
      
      console.log(`Calculated total points for user ${userId}: ${quest.totalPoints}`);
      console.log(`  - Posts: ${postsPoints}, Comments: ${commentsPoints}, Likes: ${likesPoints}`);

      // Save updated quest progress
      await quest.save();

      // Update user with quest points and medal
      await User.findByIdAndUpdate(userId, {
        questPoints: quest.totalPoints,
        questMedal: quest.medal,
        quest: quest._id
      });
      
      // Log the update for debugging
      console.log(`Updated user ${userId} with ${quest.totalPoints} quest points after ${activityType} activity`);
      console.log(`Quest details - Posts: ${quest.quests.posts?.totalPoints || 0}, Comments: ${quest.quests.comments?.totalPoints || 0}, Likes: ${quest.quests.likes?.totalPoints || 0}`);


      // Check if medal status changed and create notification
      if (quest.medal !== previousMedal && quest.medal !== 'none') {
        try {
          // Create a notification for the medal achievement
          const Notification = require('../models/Notification');
          const medalNotification = new Notification({
            recipient: userId,
            type: 'system',
            message: `Congratulations! You've earned a ${quest.medal.toUpperCase()} medal for your quest achievements!`,
            isRead: false
          });

          await medalNotification.save();

          // Log the medal achievement for debugging
          console.log(`Medal notification created for user ${userId}: ${quest.medal} medal achieved`);

          // Emit notification via WebSocket
          if (io) {
            io.to(`user-${userId}`).emit('notification', medalNotification);
            console.log(`Medal notification emitted to user ${userId}`);
          }
        } catch (error) {
          console.error('Error creating medal achievement notification:', error);
        }
      }

      // Emit socket event for real-time updates
      if (io) {
        io.to(`user-${userId}`).emit('questProgress', quest);
      }
    }

    return { success: true, quest };
  } catch (error) {
    console.error('Error tracking user activity:', error);
    return { success: false, message: 'Failed to track user activity', error: error.message };
  }
}

module.exports = {
  trackUserActivity
};