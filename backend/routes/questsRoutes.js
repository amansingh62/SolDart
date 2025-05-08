// routes/questsRoutes.js
const express = require('express');
const router = express.Router();
const Quest = require('../models/Quest');
const User = require('../models/User');
const Post = require('../models/Post');
const auth = require('../middleware/authMiddleware');
const { needsReset } = require('../utils/questReset');

// GET /quests - Get current user's quest progress
router.get('/', auth, async (req, res) => {
  try {
    // Find or create quest progress for the user
    let quest = await Quest.findOne({ user: req.user.id });

    // Check if quest needs to be reset (more than 24 hours since last reset)
    if (quest && needsReset(quest)) {
      console.log(`Resetting quest counts for user ${req.user.id} during quest retrieval`);

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
    }

    if (!quest) {
      // Create new quest progress with default values
      quest = new Quest({
        user: req.user.id,
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

      await quest.save();

      // Update user with quest reference
      await User.findByIdAndUpdate(req.user.id, {
        quest: quest._id,
        questPoints: 0,
        questMedal: 'none'
      });
    }

    res.json({ success: true, quest });
  } catch (error) {
    console.error('Error fetching quest progress:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch quest progress' });
  }
});

// POST /quests/track - Track user activity and update quest progress (with auth)
router.post('/track', auth, async (req, res) => {
  try {
    const { activityType } = req.body;

    if (!['post', 'comment', 'like'].includes(activityType)) {
      return res.status(400).json({ success: false, message: 'Invalid activity type' });
    }

    // Find or create quest progress for the user
    let quest = await Quest.findOne({ user: req.user.id });

    // Check if quest needs to be reset (more than 24 hours since last reset)
    if (quest && needsReset(quest)) {
      console.log(`Resetting quest counts for user ${req.user.id} during activity tracking`);

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
        user: req.user.id,
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

      // Save updated quest progress
      await quest.save();

      // Update user with quest points and medal
      await User.findByIdAndUpdate(req.user.id, {
        questPoints: quest.totalPoints,
        questMedal: quest.medal,
        quest: quest._id
      });

      // Check if medal status changed and create notification
      if (quest.medal !== previousMedal && quest.medal !== 'none') {
        try {
          // Create a notification for the medal achievement
          const Notification = require('../models/Notification');
          const medalNotification = new Notification({
            recipient: req.user.id,
            type: 'system',
            message: `Congratulations! You've earned a ${quest.medal.toUpperCase()} medal for your quest achievements!`,
            isRead: false
          });

          await medalNotification.save();

          // Log the medal achievement for debugging
          console.log(`Medal notification created for user ${req.user.id}: ${quest.medal} medal achieved`);

          // Emit notification via WebSocket
          if (req.app.get('io')) {
            req.app.get('io').to(`user-${req.user.id}`).emit('notification', medalNotification);
            console.log(`Medal notification emitted to user ${req.user.id}`);
          }
        } catch (error) {
          console.error('Error creating medal achievement notification:', error);
        }
      }

      if (req.app.get('io')) {
        req.app.get('io').to(`user-${req.user.id}`).emit('questProgress', quest);
      }
    }

    res.json({ success: true, quest });
  } catch (error) {
    console.error('Error tracking quest progress:', error);
    res.status(500).json({ success: false, message: 'Failed to track quest progress' });
  }
});

// POST /quests/reset - Reset user's quest progress
router.post('/reset', auth, async (req, res) => {
  try {
    // Find quest progress for the user
    const quest = await Quest.findOne({ user: req.user.id });

    if (!quest) {
      return res.status(404).json({ success: false, message: 'Quest progress not found' });
    }

    // Reset all quest progress
    quest.quests.posts.currentCount = 0;
    quest.quests.posts.totalPoints = 0;
    quest.quests.posts.completedAt = undefined;

    quest.quests.comments.currentCount = 0;
    quest.quests.comments.totalPoints = 0;
    quest.quests.comments.completedAt = undefined;

    quest.quests.likes.currentCount = 0;
    quest.quests.likes.totalPoints = 0;
    quest.quests.likes.completedAt = undefined;

    quest.totalPoints = 0;
    quest.medal = 'none';
    quest.updatedAt = new Date();

    await quest.save();

    // Update user with reset quest points and medal
    await User.findByIdAndUpdate(req.user.id, {
      questPoints: 0,
      questMedal: 'none'
    });

    // Emit socket event for real-time updates
    if (req.app.get('io')) {
      req.app.get('io').to(`user-${req.user.id}`).emit('questProgress', quest);
    }

    res.json({ success: true, quest });
  } catch (error) {
    console.error('Error resetting quest progress:', error);
    res.status(500).json({ success: false, message: 'Failed to reset quest progress' });
  }
});

// GET /quests/stats - Get quest statistics for the current user
router.get('/stats', auth, async (req, res) => {
  try {
    // Find quest progress for the user
    const quest = await Quest.findOne({ user: req.user.id });

    if (!quest) {
      return res.status(404).json({ success: false, message: 'Quest progress not found' });
    }

    // Get user's post, comment, and like counts
    const postCount = await Post.countDocuments({ user: req.user.id });

    // Count comments across all posts
    const posts = await Post.find({});
    let commentCount = 0;
    let likeCount = 0;

    posts.forEach(post => {
      // Count comments by this user
      post.comments.forEach(comment => {
        if (comment.user.toString() === req.user.id) {
          commentCount++;
        }
      });

      // Check if user liked this post
      if (post.likes.includes(req.user.id)) {
        likeCount++;
      }
    });

    // Get user's check-in points
    const user = await User.findById(req.user.id);
    const checkInPoints = user.checkInHistory ? user.checkInHistory.reduce((sum, record) => sum + record.points, 0) : 0;

    const stats = {
      totalPoints: quest.totalPoints,
      medal: quest.medal,
      posts: {
        total: postCount,
        forQuests: quest.quests.posts.currentCount,
        maxForQuests: quest.quests.posts.maxCount
      },
      comments: {
        total: commentCount,
        forQuests: quest.quests.comments.currentCount,
        maxForQuests: quest.quests.comments.maxCount
      },
      likes: {
        total: likeCount,
        forQuests: quest.quests.likes.currentCount,
        maxForQuests: quest.quests.likes.maxCount
      },
      checkIns: {
        points: checkInPoints,
        count: user.checkInHistory ? user.checkInHistory.length : 0,
        currentStreak: user.currentStreak,
        maxStreak: user.maxStreak
      }
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching quest stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch quest stats' });
  }
});

// Setup WebSocket handlers for quest updates
function setupQuestsWebSocket(io) {
  // Store connected clients interested in quest updates
  const questClients = new Set();

  // Handle client connections
  io.on('connection', (socket) => {
    // Listen for quest subscription requests
    socket.on('subscribeToQuestUpdates', async (userId) => {
      console.log(`Client ${socket.id} subscribed to quest updates for user ${userId}`);
      questClients.add(socket.id);

      // Add to user-specific room for easier broadcasting
      socket.join(`user-${userId}`);

      // Send immediate update to the newly subscribed client
      try {
        const quest = await Quest.findOne({ user: userId });
        if (quest) {
          socket.emit('questProgress', quest);
        }
      } catch (error) {
        console.error(`Error sending immediate quest update to client ${socket.id}:`, error);
      }
    });

    // Handle disconnections
    socket.on('disconnect', () => {
      if (questClients.has(socket.id)) {
        console.log(`Client ${socket.id} unsubscribed from quest updates`);
        questClients.delete(socket.id);
      }
    });
  });
}

// POST /quests/track-noauth - Track user activity without authentication
router.post('/track-noauth', async (req, res) => {
  try {
    const { userId, activityType } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    if (!['post', 'comment', 'like'].includes(activityType)) {
      return res.status(400).json({ success: false, message: 'Invalid activity type' });
    }

    // Use the questTracker utility to update quest progress
    const { trackUserActivity } = require('../utils/questTracker');
    const result = await trackUserActivity(userId, activityType, req.app.get('io'));

    if (result.success) {
      res.json({ success: true, quest: result.quest });
    } else {
      res.status(500).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Error tracking quest progress (no auth):', error);
    res.status(500).json({ success: false, message: 'Failed to track quest progress' });
  }
});

// GET /quests/track-noauth - Get quest data without authentication
router.get('/track-noauth', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    // Find or create quest progress for the user
    let quest = await Quest.findOne({ user: userId });

    // Check if quest needs to be reset (more than 24 hours since last reset)
    if (quest && needsReset(quest)) {
      console.log(`Resetting quest counts for user ${userId} during quest retrieval`);

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
    }

    if (!quest) {
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

      await quest.save();

      // Update user with quest reference
      await User.findByIdAndUpdate(userId, {
        quest: quest._id,
        questPoints: 0,
        questMedal: 'none'
      });
    }

    res.json({ success: true, quest });
  } catch (error) {
    console.error('Error fetching quest progress (no auth):', error);
    res.status(500).json({ success: false, message: 'Failed to fetch quest progress' });
  }
});

module.exports = { router, setupQuestsWebSocket };