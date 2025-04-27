const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Post = require('../models/Post');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const auth = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

router.post('/register', async (req, res) => {
  console.log("Received Data:", req.body); // Debugging: Check if 'name' is received

  const { name, username, email, password } = req.body;

  if (!name || !username || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create new user
    user = new User({
      name,
      username,
      email,
      password,
      // Initialize socialLinks object to match schema
      socialLinks: {
        website: "",
        telegram: "",
        twitter: "",
        discord: "",
        ethereum: ""
      }
    });
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    
    res.json({ 
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        wallets: user.wallets || [],
        defaultWallet: null,
        socialLinks: user.socialLinks || []
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message });
  }
});

// User login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Check if user exists
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    // Set cookie with token
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 1 day in milliseconds
    });
    
    // Find default wallet if exists
    const defaultWallet = user.wallets && user.wallets.length > 0
      ? user.wallets.find(w => w.isDefault) || user.wallets[0]
      : null;
    
    // Return user data without sending the token in the response body
    res.json({ 
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        wallets: user.wallets || [],
        defaultWallet,
        name: user.name,
        bio: user.bio,
        profileImage: user.profileImage,
        coverImage: user.coverImage,
        socialLinks: user.socialLinks || []
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Token refresh endpoint
// Token refresh endpoint - improved version
// Add this directly to your authRoutes.js file

// Token refresh endpoint - final fix
router.post('/refresh-token', async (req, res) => {
  console.log('Refresh token request received');
  console.log('Cookies received:', req.cookies);
  
  const token = req.cookies.token;
  
  if (!token) {
    console.log('No token in cookies');
    return res.status(401).json({ message: 'No token provided' });
  }
  
  try {
    // Try to extract user info even if token is expired
    let userId = null;
    
    try {
      // First try to verify normally
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
      console.log('Token is still valid, user ID:', userId);
    } catch (verifyError) {
      // If expired, try to decode payload
      if (verifyError.name === 'TokenExpiredError') {
        const payload = jwt.decode(token);
        if (payload && payload.id) {
          userId = payload.id;
          console.log('Using expired token payload, user ID:', userId);
        } else {
          throw new Error('Invalid token payload');
        }
      } else {
        throw verifyError;
      }
    }
    
    if (!userId) {
      throw new Error('Could not extract user ID from token');
    }
    
    // Find the user
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      console.log('User not found with ID:', userId);
      res.clearCookie('token');
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('User found:', user.username);
    
    // Generate new token
    const newToken = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    console.log('New token generated');
    
    // Set new cookie
    res.cookie('token', newToken, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000
    });
    
    console.log('New cookie set');
    res.json({ success: true });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.clearCookie('token');
    res.status(401).json({ message: 'Invalid token', error: error.message });
  }
});

// Get authenticated user
router.get('/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find default wallet if exists
    const defaultWallet = user.wallets && user.wallets.length > 0 
      ? user.wallets.find(w => w.isDefault) || user.wallets[0]
      : null;
    
    // Return clean user object with only necessary properties
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      wallets: user.wallets || [],
      defaultWallet,
      name: user.name || '',
      bio: user.bio || '',
      profileImage: user.profileImage || '',
      coverImage: user.coverImage || '',
      socialLinks: user.socialLinks || []
    });
  } catch (error) {
    console.error('Error in /user route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/profiles');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Update user profile
router.put('/profile', auth, upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, username, bio, walletAddress, socialLinks } = req.body;
    
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update basic profile fields if provided
    if (name) user.name = name;
    if (username) user.username = username;
    if (bio) user.bio = bio;
    if (walletAddress) user.walletAddress = walletAddress;
    
    // Ensure required fields are preserved
    // The password field should be preserved from the existing user object
    
    // Handle socialLinks properly as an array of objects
    if (socialLinks) {
      try {
        user.socialLinks = typeof socialLinks === 'string' 
          ? JSON.parse(socialLinks) 
          : socialLinks;
      } catch (e) {
        console.error('Error parsing socialLinks:', e);
        // Keep existing socialLinks if parsing fails
      }
    }
    
    // Handle profile image upload
    if (req.files && req.files.profileImage) {
      const profileImage = req.files.profileImage[0];
      user.profileImage = `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/profiles/${profileImage.filename}`;
    }
    
    // Handle cover image upload
    if (req.files && req.files.coverImage) {
      const coverImage = req.files.coverImage[0];
      user.coverImage = `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/profiles/${coverImage.filename}`;
    }
    
    await user.save();
    
    // Return updated user data without password
    const userData = user.toObject();
    delete userData.password;
    
    res.json({ success: true, user: userData });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// User logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Check wallets by email
router.post('/check-wallets-by-email', async (req, res) => {
  const { email } = req.body;
  
  try {
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find default wallet if exists
    const defaultWallet = user.wallets && user.wallets.length > 0
      ? user.wallets.find(w => w.isDefault) || user.wallets[0]
      : null;
    
    res.json({
      wallets: user.wallets || [],
      defaultWallet
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete user account
router.delete('/delete-account', auth, async (req, res) => {
  const { password } = req.body;
  
  try {
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid password' });
    }
    
    // Delete all user data in a transaction-like manner
    // 1. Delete user's posts
    await Post.deleteMany({ user: user._id });
    
    // 2. Delete user's comments on other posts
    await Post.updateMany(
      { 'comments.user': user._id },
      { $pull: { comments: { user: user._id } } }
    );
    
    // 3. Delete user's likes on posts
    await Post.updateMany(
      { likes: user._id },
      { $pull: { likes: user._id } }
    );
    
    // 4. Delete user's votes on polls
    await Post.updateMany(
      { 'poll.options.voters': user._id },
      { $pull: { 'poll.options.$[].voters': user._id } }
    );
    
    // 5. Delete user's messages
    await Message.deleteMany({
      $or: [
        { sender: user._id },
        { recipient: user._id } // Fixed field name from 'receiver' to 'recipient'
      ]
    });
    
    // 6. Delete user's notifications
    await Notification.deleteMany({
      $or: [
        { recipient: user._id }, // Fixed field name from 'user' to 'recipient'
        { sender: user._id }
      ]
    });
    
    // 7. Delete user's live chat messages
    const LiveChatMessage = require('../models/LiveChatMessage');
    await LiveChatMessage.deleteMany({ sender: user._id });
    
    // 8. Remove user from seenBy arrays in live chat messages
    await LiveChatMessage.updateMany(
      { seenBy: user._id },
      { $pull: { seenBy: user._id } }
    );
    
    // 9. Remove user from other users' followers/following lists
    await User.updateMany(
      { followersList: user._id },
      { $pull: { followersList: user._id } }
    );
    
    await User.updateMany(
      { followingList: user._id },
      { $pull: { followingList: user._id } }
    );
    
    await User.updateMany(
      { blockedUsers: user._id },
      { $pull: { blockedUsers: user._id } }
    );
    
    // 10. Finally, delete the user
    await User.findByIdAndDelete(user._id);
    
    // Clear authentication cookie
    res.clearCookie('token');
    
    res.json({ success: true, message: 'Account successfully deleted' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete account' });
  }
});

module.exports = router;