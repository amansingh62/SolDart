// models/User.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new mongoose.Schema({
  googleId: { type: String },
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String },
  walletAddress: { type: String },
  profileImage: { type: String },
  coverImage: { type: String },
  followers: { type: Number, default: 0 },
  following: { type: Number, default: 0 },
  darts: { type: Number, default: 0 },
  events: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  socialLinks: {
    website: { type: String, default: "" },
    telegram: { type: String, default: "" },
    twitter: { type: String, default: "" },
    discord: { type: String, default: "" },
    ethereum: { type: String, default: "" },
  },
  // Online status tracking for live chat
  isOnline: { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now },
  // Check-in related fields
  lastCheckIn: { type: Date },
  currentStreak: { type: Number, default: 0 },
  maxStreak: { type: Number, default: 0 },
  checkInHistory: [{
    date: { type: Date },
    points: { type: Number, default: 5 }
  }],
  // Arrays to store user IDs for followers, following, and blocked users
  followersList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followingList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Array to store saved posts with timestamps
  savedPosts: [{
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    savedAt: { type: Date, default: Date.now }
  }],
});

module.exports = mongoose.model('User', UserSchema);