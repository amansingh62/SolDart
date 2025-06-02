// routes/questRoutes.js
const express = require('express');
const router = express.Router();
const Quest = require('../models/Quest');
const Post = require('../models/Post');

// Constants for point values and limits
const POINTS = {
  POST: 10,    // Points per post
  LIKE: 5,     // Points per like
  COMMENT: 7   // Points per comment
};

const LIMITS = {
  POSTS: 3,    // Max 3 posts, 10 points each
  LIKES: 7,    // Max 7 likes, 5 points each
  COMMENTS: 5  // Max 5 comments, 7 points each
};

// Helper function to get or create a quest record for a user
async function getOrCreateQuest(userId) {
  if (!userId) return null;

  let quest = await Quest.findOne({ userId });

  if (!quest) {
    quest = new Quest({ userId });
    await quest.save();
  }

  return quest;
}

// Get quest data for a user (unauthenticated)
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const quest = await getOrCreateQuest(userId);

    if (!quest) {
      return res.status(404).json({ success: false, message: 'Quest data not found' });
    }

    // Calculate remaining quests
    const remaining = {
      posts: Math.max(0, LIMITS.POSTS - quest.posts.count),
      likes: Math.max(0, LIMITS.LIKES - quest.likes.count),
      comments: Math.max(0, LIMITS.COMMENTS - quest.comments.count)
    };

    // Calculate potential points if all remaining quests are completed
    const potential = {
      posts: remaining.posts * POINTS.POST,
      likes: remaining.likes * POINTS.LIKE,
      comments: remaining.comments * POINTS.COMMENT,
      total: (remaining.posts * POINTS.POST) + (remaining.likes * POINTS.LIKE) + (remaining.comments * POINTS.COMMENT)
    };

    res.json({
      success: true,
      quest: {
        ...quest.toObject(),
        remaining,
        potential,
        pointValues: POINTS,
        limits: LIMITS
      }
    });
  } catch (error) {
    console.error('Get quest error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Track post creation (unauthenticated)
router.post('/track/post/:userId/:postId', async (req, res) => {
  try {
    const { userId, postId } = req.params;

    if (!userId || !postId) {
      return res.status(400).json({ success: false, message: 'User ID and Post ID are required' });
    }

    const quest = await getOrCreateQuest(userId);

    // Check if this post has already been counted
    if (quest.posts.postIds.includes(postId)) {
      return res.json({ success: true, quest, message: 'Post already tracked' });
    }

    // Check if user has reached the post limit
    if (quest.posts.count >= LIMITS.POSTS) {
      return res.json({ success: true, quest, message: 'Post limit reached' });
    }

    // Update quest data
    quest.posts.count += 1;
    quest.posts.points += POINTS.POST;
    quest.posts.postIds.push(postId);
    quest.totalPoints += POINTS.POST;
    quest.lastUpdated = Date.now();

    // Update reward tier
    quest.updateRewardTier();

    await quest.save();

    res.json({ success: true, quest, pointsEarned: POINTS.POST });
  } catch (error) {
    console.error('Track post error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Track like activity (unauthenticated)
router.post('/track/like/:userId/:postId', async (req, res) => {
  try {
    const { userId, postId } = req.params;

    if (!userId || !postId) {
      return res.status(400).json({ success: false, message: 'User ID and Post ID are required' });
    }

    const quest = await getOrCreateQuest(userId);

    // Check if this like has already been counted
    if (quest.likes.postIds.includes(postId)) {
      return res.json({ success: true, quest, message: 'Like already tracked' });
    }

    // Check if user has reached the like limit
    if (quest.likes.count >= LIMITS.LIKES) {
      return res.json({ success: true, quest, message: 'Like limit reached' });
    }

    // Update quest data
    quest.likes.count += 1;
    quest.likes.points += POINTS.LIKE;
    quest.likes.postIds.push(postId);
    quest.totalPoints += POINTS.LIKE;
    quest.lastUpdated = Date.now();

    // Update reward tier
    quest.updateRewardTier();

    await quest.save();

    res.json({ success: true, quest, pointsEarned: POINTS.LIKE });
  } catch (error) {
    console.error('Track like error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Track comment activity (unauthenticated)
router.post('/track/comment/:userId/:postId/:commentId', async (req, res) => {
  try {
    const { userId, postId, commentId } = req.params;

    if (!userId || !postId || !commentId) {
      return res.status(400).json({ success: false, message: 'User ID, Post ID, and Comment ID are required' });
    }

    const quest = await getOrCreateQuest(userId);

    // Check if this comment has already been counted
    if (quest.comments.commentIds.includes(commentId)) {
      return res.json({ success: true, quest, message: 'Comment already tracked' });
    }

    // Check if user has reached the comment limit
    if (quest.comments.count >= LIMITS.COMMENTS) {
      return res.json({ success: true, quest, message: 'Comment limit reached' });
    }

    // Update quest data
    quest.comments.count += 1;
    quest.comments.points += POINTS.COMMENT; // Ensure COMMENT points are added correctly
    quest.comments.commentIds.push(commentId);
    quest.totalPoints += POINTS.COMMENT;
    quest.lastUpdated = Date.now();

    // Update reward tier
    quest.updateRewardTier();

    await quest.save();

    res.json({ success: true, quest, pointsEarned: POINTS.COMMENT });
  } catch (error) {
    console.error('Track comment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;