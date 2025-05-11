// models/Quest.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema for individual quest progress
const QuestProgressSchema = new Schema({
  questType: {
    type: String,
    enum: ['post', 'comment', 'like'],
    required: true
  },
  currentCount: {
    type: Number,
    default: 0
  },
  maxCount: {
    type: Number,
    required: true
  },
  pointsPerAction: {
    type: Number,
    required: true
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  completedAt: {
    type: Date
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Main Quest Schema
const QuestSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  medal: {
    type: String,
    enum: ['none', 'bronze', 'silver', 'gold', 'platinum'],
    default: 'none'
  },
  quests: {
    posts: QuestProgressSchema,
    comments: QuestProgressSchema,
    likes: QuestProgressSchema
  },
  lastResetDate: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update medal based on total points
QuestSchema.pre('save', function(next) {
  // Store the previous medal status to detect changes
  const previousMedal = this.medal;
  
  // If totalPoints is already set (e.g., from check-ins), use that value
  // Otherwise calculate from quest activities
  if (!this.isModified('totalPoints')) {
    // Calculate total points from all quests
    const questTotalPoints = 
      (this.quests.posts?.totalPoints || 0) + 
      (this.quests.comments?.totalPoints || 0) + 
      (this.quests.likes?.totalPoints || 0);
    
    this.totalPoints = questTotalPoints;
  }
  
  // Update medal based on total points
  if (this.totalPoints >= 200) {
    this.medal = 'platinum';
  } else if (this.totalPoints >= 100) {
    this.medal = 'gold';
  } else if (this.totalPoints >= 50) {
    this.medal = 'silver';
  } else if (this.totalPoints >= 20) {
    this.medal = 'bronze';
  } else {
    this.medal = 'none';
  }
  
  // Store medal change information to be used after save
  this._medalChanged = previousMedal !== this.medal && this.medal !== 'none';
  this._previousMedal = previousMedal;
  
  next();
});

// After saving, create notification if medal status changed
QuestSchema.post('save', async function() {
  try {
    // Only proceed if medal changed to a higher level
    if (this._medalChanged) {
      // Create a notification for the medal achievement
      const Notification = require('./Notification');
      const medalNotification = new Notification({
        recipient: this.user,
        type: 'system',
        message: `Congratulations! You've earned a ${this.medal.toUpperCase()} medal for your quest achievements!`,
        isRead: false
      });
      
      await medalNotification.save();
      
      // Log the medal achievement for debugging
      console.log(`Medal notification created for user ${this.user}: ${this.medal} medal achieved`);
      
      // Emit notification via WebSocket if possible
      const mongoose = require('mongoose');
      if (mongoose.connection.models.Quest._io) {
        mongoose.connection.models.Quest._io.to(`user-${this.user}`).emit('notification', medalNotification);
        console.log(`Medal notification emitted to user ${this.user}`);
      }
    }
    
    // Ensure quest progress updates are only sent to the specific user
    // This is critical to prevent quest updates from being broadcast to all users
    const mongoose = require('mongoose');
    if (mongoose.connection.models.Quest._io) {
      // Only emit quest progress to the specific user who owns this quest
      mongoose.connection.models.Quest._io.to(`user-${this.user}`).emit('questProgress', this);
      console.log(`Quest progress update emitted only to user ${this.user}`);
    }
  } catch (error) {
    console.error('Error in Quest post-save hook:', error);
  }
});

module.exports = mongoose.model('Quest', QuestSchema);