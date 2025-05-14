// routes/questRoutes.js
const express = require('express');
const router = express.Router();
const QuestActivity = require('../models/Quest');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');

// Helper function to check if daily quests need to be reset
const checkAndResetDailyQuests = async (questActivity) => {
  const now = new Date();
  const lastReset = new Date(questActivity.lastReset);
  
  // Check if it's a new day (different day than last reset)
  if (now.toDateString() !== lastReset.toDateString()) {
    // Reset daily quest counts
    questActivity.posts.count = 0;
    questActivity.comments.count = 0;
    questActivity.likes.count = 0;
    questActivity.lastReset = now;
    await questActivity.save();
  }
  
  return questActivity;
};

// Get quest activity for a user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find or create quest activity for the user
    let questActivity = await QuestActivity.findOne({ user: userId });
    
    if (!questActivity) {
      // Create new quest activity record if none exists
      questActivity = new QuestActivity({ user: userId });
      await questActivity.save();
    } else {
      // Check if daily quests need to be reset
      questActivity = await checkAndResetDailyQuests(questActivity);
    }
    
    res.json(questActivity);
  } catch (error) {
    console.error('Error fetching quest activity:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update quest activity when a user creates a post
router.post('/track-post/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find or create quest activity for the user
    let questActivity = await QuestActivity.findOne({ user: userId });
    
    if (!questActivity) {
      questActivity = new QuestActivity({ user: userId });
    } else {
      // Check if daily quests need to be reset
      questActivity = await checkAndResetDailyQuests(questActivity);
    }
    
    // Only increment if below max count
    if (questActivity.posts.count < questActivity.posts.maxCount) {
      questActivity.posts.count += 1;
      questActivity.totalPoints += questActivity.posts.pointsPerItem;
      questActivity.posts.lastUpdated = new Date();
      
      // Check for medal achievements
      if (questActivity.totalPoints >= 50 && !questActivity.medals.silver) {
        questActivity.medals.silver = true;
      } else if (questActivity.totalPoints >= 20 && !questActivity.medals.bronze) {
        questActivity.medals.bronze = true;
      }
      
      await questActivity.save();
    }
    
    res.json(questActivity);
  } catch (error) {
    console.error('Error tracking post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update quest activity when a user adds a comment
router.post('/track-comment/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find or create quest activity for the user
    let questActivity = await QuestActivity.findOne({ user: userId });
    
    if (!questActivity) {
      questActivity = new QuestActivity({ user: userId });
    } else {
      // Check if daily quests need to be reset
      questActivity = await checkAndResetDailyQuests(questActivity);
    }
    
    // Only increment if below max count
    if (questActivity.comments.count < questActivity.comments.maxCount) {
      questActivity.comments.count += 1;
      questActivity.totalPoints += questActivity.comments.pointsPerItem;
      questActivity.comments.lastUpdated = new Date();
      
      // Check for medal achievements
      if (questActivity.totalPoints >= 50 && !questActivity.medals.silver) {
        questActivity.medals.silver = true;
      } else if (questActivity.totalPoints >= 20 && !questActivity.medals.bronze) {
        questActivity.medals.bronze = true;
      }
      
      await questActivity.save();
    }
    
    res.json(questActivity);
  } catch (error) {
    console.error('Error tracking comment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update quest activity when a user likes a post
router.post('/track-like/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find or create quest activity for the user
    let questActivity = await QuestActivity.findOne({ user: userId });
    
    if (!questActivity) {
      questActivity = new QuestActivity({ user: userId });
    } else {
      // Check if daily quests need to be reset
      questActivity = await checkAndResetDailyQuests(questActivity);
    }
    
    // Only increment if below max count
    if (questActivity.likes.count < questActivity.likes.maxCount) {
      questActivity.likes.count += 1;
      questActivity.totalPoints += questActivity.likes.pointsPerItem;
      questActivity.likes.lastUpdated = new Date();
      
      // Check for medal achievements
      if (questActivity.totalPoints >= 50 && !questActivity.medals.silver) {
        questActivity.medals.silver = true;
      } else if (questActivity.totalPoints >= 20 && !questActivity.medals.bronze) {
        questActivity.medals.bronze = true;
      }
      
      await questActivity.save();
    }
    
    res.json(questActivity);
  } catch (error) {
    console.error('Error tracking like:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Non-authenticated endpoint for tracking quest progress
router.post('/track-noauth', async (req, res) => {
  try {
    const { userId, activityType } = req.body;
    
    if (!userId || !activityType) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID and activity type are required' 
      });
    }
    
    // Find or create quest activity for the user
    let questActivity = await QuestActivity.findOne({ user: userId });
    
    if (!questActivity) {
      questActivity = new QuestActivity({ user: userId });
    } else {
      // Check if daily quests need to be reset
      questActivity = await checkAndResetDailyQuests(questActivity);
    }
    
    // Update the appropriate activity count based on the activity type
    if (activityType === 'post' && questActivity.posts.count < questActivity.posts.maxCount) {
      questActivity.posts.count += 1;
      questActivity.totalPoints += questActivity.posts.pointsPerItem;
      questActivity.posts.lastUpdated = new Date();
    } else if (activityType === 'comment' && questActivity.comments.count < questActivity.comments.maxCount) {
      questActivity.comments.count += 1;
      questActivity.totalPoints += questActivity.comments.pointsPerItem;
      questActivity.comments.lastUpdated = new Date();
    } else if (activityType === 'like' && questActivity.likes.count < questActivity.likes.maxCount) {
      questActivity.likes.count += 1;
      questActivity.totalPoints += questActivity.likes.pointsPerItem;
      questActivity.likes.lastUpdated = new Date();
    }
    
    // Check for medal achievements
    if (questActivity.totalPoints >= 50 && !questActivity.medals.silver) {
      questActivity.medals.silver = true;
    } else if (questActivity.totalPoints >= 20 && !questActivity.medals.bronze) {
      questActivity.medals.bronze = true;
    }
    
    await questActivity.save();
    
    res.json({
      success: true,
      quest: questActivity
    });
  } catch (error) {
    console.error('Error tracking activity:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;