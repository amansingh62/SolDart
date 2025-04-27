const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const authenticateToken = require('../middleware/authMiddleware');



// Get unread message count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Count all unread messages for this user
    const count = await Message.countDocuments({
      recipient: userId,
      isRead: false
    });

    res.json({ success: true, count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all contacts (users with whom the current user has exchanged messages)
router.get('/contacts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all messages where the current user is either sender or recipient
    const messages = await Message.find({
      $or: [
        { sender: userId },
        { recipient: userId }
      ]
    }).sort({ createdAt: -1 });

    // Extract unique user IDs (excluding the current user)
    const contactIds = new Set();
    messages.forEach(message => {
      if (message.sender.toString() === userId) {
        contactIds.add(message.recipient.toString());
      } else {
        contactIds.add(message.sender.toString());
      }
    });

    // Get contact details and last message for each contact
    const contacts = [];
    for (const contactId of contactIds) {
      const contact = await User.findById(contactId).select('username profileImage');
      if (contact) {
        // Find the last message between these users
        const lastMessage = await Message.findOne({
          $or: [
            { sender: userId, recipient: contactId },
            { sender: contactId, recipient: userId }
          ]
        }).sort({ createdAt: -1 });

        // Count unread messages from this contact
        const unreadCount = await Message.countDocuments({
          sender: contactId,
          recipient: userId,
          isRead: false
        });

        contacts.push({
          _id: contact._id,
          username: contact.username,
          profileImage: contact.profileImage || '/svg.png',
          lastMessage: lastMessage ? lastMessage.text : null,
          lastMessageTime: lastMessage ? lastMessage.createdAt : null,
          unreadCount
        });
      }
    }

    // Sort contacts by last message time (most recent first)
    contacts.sort((a, b) => {
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
    });

    res.json({ success: true, contacts });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get messages between current user and a specific contact
router.get('/:contactId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactId } = req.params;

    // Find all messages between these two users
    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: contactId },
        { sender: contactId, recipient: userId }
      ]
    }).sort({ createdAt: 1 });

    // Get user info for both users
    const currentUser = await User.findById(userId).select('username profileImage');
    const contactUser = await User.findById(contactId).select('username profileImage');

    // Format messages with sender/recipient info
    const formattedMessages = messages.map(message => {
      const isSender = message.sender.toString() === userId;
      return {
        _id: message._id,
        sender: isSender ? 'me' : contactId,
        recipient: isSender ? contactId : 'me',
        text: message.text,
        isRead: message.isRead,
        createdAt: message.createdAt,
        senderInfo: isSender ? {
          username: currentUser.username,
          profileImage: currentUser.profileImage || '/svg.png'
        } : {
          username: contactUser.username,
          profileImage: contactUser.profileImage || '/svg.png'
        },
        recipientInfo: isSender ? {
          username: contactUser.username,
          profileImage: contactUser.profileImage || '/svg.png'
        } : {
          username: currentUser.username,
          profileImage: currentUser.profileImage || '/svg.png'
        }
      };
    });

    res.json({ success: true, messages: formattedMessages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Send a message
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { recipient, text } = req.body;
    const sender = req.user.id;

    if (!recipient || !text) {
      return res.status(400).json({ success: false, message: 'Recipient and text are required' });
    }

    // Create new message
    const messageData = {
      sender,
      recipient,
      text,
      isRead: false
    };

    const newMessage = new Message(messageData);
    await newMessage.save();

    // Get sender and recipient info
    const senderUser = await User.findById(sender).select('username profileImage');
    const recipientUser = await User.findById(recipient).select('username profileImage');

    // Format the message for response
    const formattedMessage = {
      _id: newMessage._id,
      sender,
      recipient,
      text: newMessage.text,
      isRead: newMessage.isRead,
      createdAt: newMessage.createdAt,
      senderInfo: {
        username: senderUser.username,
        profileImage: senderUser.profileImage || '/svg.png'
      },
      recipientInfo: {
        username: recipientUser.username,
        profileImage: recipientUser.profileImage || '/svg.png'
      }
    };

    // Emit socket event (handled in server.js)
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${recipient}`).emit('message', {
        ...formattedMessage,
        sender: recipient, // Swap sender/recipient for the recipient's view
        recipient: 'me'
      });
    }

    res.json({ success: true, message: formattedMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Mark a message as read
router.put('/read/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    // Find the message and ensure it belongs to the current user
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Only the recipient can mark a message as read
    if (message.recipient.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Mark as read
    message.isRead = true;
    await message.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Mark all messages from a specific user as read
router.put('/read-all/:contactId', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.params;
    const userId = req.user.id;

    // Update all unread messages from this contact
    await Message.updateMany(
      { sender: contactId, recipient: userId, isRead: false },
      { isRead: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Search users to start a conversation
router.get('/search/:query', authenticateToken, async (req, res) => {
  try {
    const { query } = req.params;
    const userId = req.user.id;

    // Search for users by username (excluding the current user)
    const users = await User.find({
      _id: { $ne: userId },
      username: { $regex: query, $options: 'i' }
    }).select('_id username profileImage').limit(10);

    res.json({ success: true, users });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete a message
router.delete('/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Check if the user is authorized to delete this message
    // Only the sender can delete their own message
    if (message.sender.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this message' });
    }

    // Delete the message
    await Message.findByIdAndDelete(messageId);

    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Clear all messages with a specific contact
router.delete('/clear/:contactId', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.params;
    const userId = req.user.id;

    // Delete all messages between these two users
    await Message.deleteMany({
      $or: [
        { sender: userId, recipient: contactId },
        { sender: contactId, recipient: userId }
      ]
    });

    res.json({ success: true, message: 'Chat cleared successfully' });
  } catch (error) {
    console.error('Error clearing chat:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;