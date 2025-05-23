// routes/liveChatRoutes.js
const express = require('express');
const router = express.Router();
const LiveChatMessage = require('../models/LiveChatMessage');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');
const path = require('path');
const { s3Upload, formatS3Url } = require('../middleware/s3Middleware');

// Set up S3 upload for audio files
const upload = s3Upload('audio');

// Custom file filter for audio files


// Get recent live chat messages
router.get('/', auth, async (req, res) => {
  try {
    // Get the most recent 50 messages
    const messages = await LiveChatMessage.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('sender', 'username profileImage');
    
    // Return messages in chronological order (oldest first)
    res.json({ success: true, messages: messages.reverse() });
  } catch (error) {
    console.error('Error fetching live chat messages:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Send a text message to live chat
router.post('/text', auth, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }
    
    const newMessage = new LiveChatMessage({
      sender: req.user.id,
      text: text.trim(),
      seenBy: [req.user.id] // Sender has seen their own message
    });
    
    await newMessage.save();
    
    // Populate sender info before sending response
    await newMessage.populate('sender', 'username profileImage');
    
    // Emit socket event for real-time updates
    const io = req.app.get('io');
    io.emit('newLiveChatMessage', newMessage);
    
    res.status(201).json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Error sending live chat message:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Send an audio message to live chat
router.post('/audio', auth, upload.single('audioMessage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Audio file is required' });
    }
    
    const { duration } = req.body;
    
    const newMessage = new LiveChatMessage({
      sender: req.user.id,
      audioMessage: {
        url: formatS3Url(req.file.key),
        duration: duration || 0
      },
      seenBy: [req.user.id] // Sender has seen their own message
    });
    
    await newMessage.save();
    
    // Populate sender info before sending response
    await newMessage.populate('sender', 'username profileImage');
    
    // Emit socket event for real-time updates
    const io = req.app.get('io');
    io.emit('newLiveChatMessage', newMessage);
    
    res.status(201).json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Error sending audio message:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Mark messages as seen
router.post('/seen', auth, async (req, res) => {
  try {
    const { messageIds } = req.body;
    
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Message IDs are required' });
    }
    
    // Update all specified messages to add current user to seenBy array
    await LiveChatMessage.updateMany(
      { _id: { $in: messageIds }, seenBy: { $ne: req.user.id } },
      { $addToSet: { seenBy: req.user.id } }
    );
    
    res.json({ success: true, message: 'Messages marked as seen' });
  } catch (error) {
    console.error('Error marking messages as seen:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;