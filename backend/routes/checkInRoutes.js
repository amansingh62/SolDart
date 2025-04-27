// routes/checkInRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');
const Notification = require('../models/Notification');

// Check if user can check in today
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let canCheckIn = true;
    let lastCheckInDate = null;

    if (user.lastCheckIn) {
      lastCheckInDate = new Date(user.lastCheckIn);
      lastCheckInDate.setHours(0, 0, 0, 0);
      
      // Check if user already checked in today
      if (lastCheckInDate.getTime() === today.getTime()) {
        canCheckIn = false;
      }
    }

    res.json({
      success: true,
      canCheckIn,
      currentStreak: user.currentStreak,
      maxStreak: user.maxStreak,
      lastCheckIn: user.lastCheckIn,
      checkInHistory: user.checkInHistory
    });
  } catch (error) {
    console.error('Error checking check-in status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Perform daily check-in
router.post('/check-in', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let lastCheckInDate = null;
    if (user.lastCheckIn) {
      lastCheckInDate = new Date(user.lastCheckIn);
      lastCheckInDate.setHours(0, 0, 0, 0);
      
      // Check if user already checked in today
      if (lastCheckInDate.getTime() === today.getTime()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Already checked in today',
          currentStreak: user.currentStreak,
          maxStreak: user.maxStreak
        });
      }
    }

    // Calculate if this is a consecutive day
    let isConsecutiveDay = false;
    if (lastCheckInDate) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      isConsecutiveDay = lastCheckInDate.getTime() === yesterday.getTime();
    }

    // Update streak
    if (isConsecutiveDay || !user.lastCheckIn) {
      user.currentStreak += 1;
      
      // Update max streak if current streak is higher
      if (user.currentStreak > user.maxStreak) {
        user.maxStreak = user.currentStreak;
      }
    } else {
      // Reset streak if not consecutive
      user.currentStreak = 1;
    }

    // Calculate points based on streak
    let points = 5; // Base points
    
    // Bonus points for milestone streaks
    if (user.currentStreak % 7 === 0) { // Weekly milestone
      points += 10;
    } else if (user.currentStreak % 30 === 0) { // Monthly milestone
      points += 50;
    }

    // Update user data
    user.lastCheckIn = new Date();
    user.events += 1;
    user.checkInHistory.push({ date: new Date(), points });

    await user.save();

    // Create notification for check-in
    const streakMessage = user.currentStreak > 1 
      ? `You're on a ${user.currentStreak}-day streak! Keep it up!` 
      : 'You started a new streak! Come back tomorrow!';

    const notification = new Notification({
      recipient: user._id,
      type: 'system',
      message: `Check-in successful! You earned ${points} points. ${streakMessage}`,
      isRead: false
    });

    await notification.save();

    // Emit socket event for real-time notification
    const io = req.app.get('io');
    io.to(`user-${user._id}`).emit('notification', notification);

    res.json({
      success: true,
      message: 'Check-in successful',
      points,
      currentStreak: user.currentStreak,
      maxStreak: user.maxStreak,
      isConsecutiveDay
    });
  } catch (error) {
    console.error('Error during check-in:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get check-in statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Calculate total points earned from check-ins
    const totalPoints = user.checkInHistory.reduce((sum, record) => sum + record.points, 0);

    // Get check-in dates for the current month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const currentMonthCheckIns = user.checkInHistory.filter(record => {
      const date = new Date(record.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    res.json({
      success: true,
      currentStreak: user.currentStreak,
      maxStreak: user.maxStreak,
      totalCheckIns: user.checkInHistory.length,
      totalPoints,
      currentMonthCheckIns: currentMonthCheckIns.map(record => ({
        date: record.date,
        points: record.points
      }))
    });
  } catch (error) {
    console.error('Error fetching check-in stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;