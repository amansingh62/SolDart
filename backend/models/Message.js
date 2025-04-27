// models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: function() {
      return !this.attachment; // Text is required only if there's no attachment
    }
  },
  isRead: {
    type: Boolean,
    default: false
  },
  attachment: {
    type: {
      type: String,
      enum: ['image', 'file'],
      required: function() {
        // Only required if attachment has url or other properties
        return this.attachment && (this.attachment.url || this.attachment.name || this.attachment.size);
      }
    },
    url: String,
    name: String,
    size: Number
  }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);