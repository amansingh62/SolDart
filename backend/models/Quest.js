// models/Quest.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema for tracking user quest activities
const QuestActivitySchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Daily quest tracking
  posts: {
    count: { type: Number, default: 0 },
    maxCount: { type: Number, default: 3 },
    pointsPerItem: { type: Number, default: 10 },
    lastUpdated: { type: Date, default: Date.now }
  },
  comments: {
    count: { type: Number, default: 0 },
    maxCount: { type: Number, default: 5 },
    pointsPerItem: { type: Number, default: 7 },
    lastUpdated: { type: Date, default: Date.now }
  },
  likes: {
    count: { type: Number, default: 0 },
    maxCount: { type: Number, default: 7 },
    pointsPerItem: { type: Number, default: 5 },
    lastUpdated: { type: Date, default: Date.now }
  },
  // Total points accumulated
  totalPoints: { type: Number, default: 0 },
  // Medal tracking
  medals: {
    bronze: { type: Boolean, default: false }, // 20 points
    silver: { type: Boolean, default: false },  // 50 points
  },
  // Date when the quest activities were last reset (for daily quests)
  lastReset: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QuestActivity', QuestActivitySchema);