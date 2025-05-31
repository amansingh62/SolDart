// models/Quest.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const QuestSchema = new Schema({
  // We'll use a unique identifier for users that doesn't require authentication
  // This could be a browser fingerprint, device ID, or other identifier
  userId: {
    type: String,
    required: true,
    index: true
  },
  // Track post activity
  posts: {
    count: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    // Store post IDs to prevent duplicate counting
    postIds: [{ type: String }]
  },
  // Track like activity
  likes: {
    count: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    // Store post IDs that were liked to prevent duplicate counting
    postIds: [{ type: String }]
  },
  // Track comment activity
  comments: {
    count: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    // Store comment IDs to prevent duplicate counting
    commentIds: [{ type: String }]
  },
  // Total points accumulated
  totalPoints: {
    type: Number,
    default: 0
  },
  // Current reward tier
  rewardTier: {
    type: String,
    enum: ['none', 'bronze', 'silver', 'gold', 'platinum', 'diamond'],
    default: 'none'
  },
  // Last updated timestamp
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  // Creation timestamp
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Helper method to update reward tier based on points
QuestSchema.methods.updateRewardTier = function() {
  if (this.totalPoints >= 25000) {
    this.rewardTier = 'diamond';
  } else if (this.totalPoints >= 15000) {
    this.rewardTier = 'platinum';
  } else if (this.totalPoints >= 7500) {
    this.rewardTier = 'gold';
  } else if (this.totalPoints >= 2500) {
    this.rewardTier = 'silver';
  } else if (this.totalPoints >= 500) {
    this.rewardTier = 'bronze';
  } else {
    this.rewardTier = 'none';
  }
};

module.exports = mongoose.model('Quest', QuestSchema);