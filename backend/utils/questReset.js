// utils/questReset.js
const Quest = require('../models/Quest');
const User = require('../models/User');

/**
 * Reset daily quest counts while preserving total accumulated points
 * This function will:
 * 1. Find all quests
 * 2. Reset currentCount to 0 for all quest types
 * 3. Preserve totalPoints and medal status
 * 4. Update lastResetDate to current date
 */
async function resetDailyQuests() {
  try {
    console.log('Starting daily quest reset...');
    
    // Find all quests
    const quests = await Quest.find({});
    console.log(`Found ${quests.length} quests to reset`);
    
    // Track how many quests were updated
    let updatedCount = 0;
    
    // Process each quest
    for (const quest of quests) {
      // Store the previous medal status to detect changes
      const previousMedal = quest.medal;
      
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
      
      // Preserve the check-in points by setting totalPoints to the difference
      // between overall total and quest-specific points
      const checkInPoints = overallTotalPoints - questSpecificPoints;
      
      // Set the totalPoints to include both quest-specific and check-in points
      quest.totalPoints = questSpecificPoints + checkInPoints;
      
      // Update the last reset date
      quest.lastResetDate = new Date();
      
      // Save the updated quest
      await quest.save();
      
      // Check if medal status changed during reset (this shouldn't normally happen,
      // but we check just in case there was a calculation issue before)
      if (quest.medal !== previousMedal && quest.medal !== 'none') {
        try {
          // Create a notification for the medal achievement
          const Notification = require('../models/Notification');
          const medalNotification = new Notification({
            recipient: quest.user,
            type: 'system',
            message: `Congratulations! You've earned a ${quest.medal.toUpperCase()} medal for your quest achievements!`,
            isRead: false
          });
          
          await medalNotification.save();
          
          // Log the medal achievement for debugging
          console.log(`Medal notification created during reset for user ${quest.user}: ${quest.medal} medal achieved`);
          
          // Emit notification via WebSocket if possible
          const mongoose = require('mongoose');
          if (mongoose.connection.models.Quest._io) {
            mongoose.connection.models.Quest._io.to(`user-${quest.user}`).emit('notification', medalNotification);
            console.log(`Medal notification emitted to user ${quest.user} during reset`);
          }
        } catch (error) {
          console.error('Error creating medal achievement notification during reset:', error);
        }
      }
      
      updatedCount++;
    }
    
    console.log(`Successfully reset ${updatedCount} quests`);
    return { success: true, resetCount: updatedCount };
  } catch (error) {
    console.error('Error resetting daily quests:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if a quest needs to be reset (more than 24 hours since last reset)
 * @param {Object} quest - The quest object to check
 * @returns {Boolean} - True if quest needs reset, false otherwise
 */
function needsReset(quest) {
  if (!quest.lastResetDate) return true;
  
  const now = new Date();
  const lastReset = new Date(quest.lastResetDate);
  
  // Calculate time difference in milliseconds
  const timeDiff = now - lastReset;
  
  // Check if more than 24 hours (86400000 ms) have passed
  return timeDiff > 86400000;
}

module.exports = {
  resetDailyQuests,
  needsReset
};