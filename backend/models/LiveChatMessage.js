// models/LiveChatMessage.js
const mongoose = require('mongoose');

const liveChatMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: function() {
      return !this.audioMessage; // Text is required only if there's no audio message
    }
  },
  audioMessage: {
    url: String,
    duration: Number // Duration in seconds
  },
  // For tracking who has seen the message
  seenBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // For global chat, we don't need a recipient field as in private messages
}, { timestamps: true });

module.exports = mongoose.model('LiveChatMessage', liveChatMessageSchema);