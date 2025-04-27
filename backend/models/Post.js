// models/Post.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema for poll options
const PollOptionSchema = new Schema({
  text: {
    type: String,
    required: true
  },
  votes: {
    type: Number,
    default: 0
  },
  voters: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
});

// Schema for polls
const PollSchema = new Schema({
  question: {
    type: String,
    required: true
  },
  options: [PollOptionSchema],
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 7*24*60*60*1000) // Default 7 days from now
  }
});

// Schema for media (images, videos, GIFs)
const MediaSchema = new Schema({
  type: {
    type: String,
    enum: ['image', 'video', 'gif'],
    required: true
  },
  url: {
    type: String,
    required: true
  }
});

// Main Post (Dart) Schema
const PostSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    maxlength: 500
  },
  hashtags: {
    type: [String],
    default: []
  },
  media: [MediaSchema],
  poll: PollSchema,
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    text: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    isPinned: {
      type: Boolean,
      default: false
    },
    likes: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    replies: [{
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      text: {
        type: String,
        required: true
      },
      date: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  repostedBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  views: {
    type: Number,
    default: 0
  },
  viewers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  isPinned: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Post', PostSchema);