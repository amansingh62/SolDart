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
  console.log("Received Data:", req.body);

  const { name, username, email, password } = req.body;

  // Validate required fields
  if (!name || !username || !email || !password) {
    return res.status(400).json({ 
      statusCode: 400,
      error: 'Bad Request',
      message: "All fields are required",
      details: {
        name: !name ? "Name is required" : null,
        username: !username ? "Username is required" : null,
        email: !email ? "Email is required" : null,
        password: !password ? "Password is required" : null
      }
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      statusCode: 400,
      error: 'Bad Request',
      message: "Invalid email format"
    });
  }

  // Validate password strength
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      statusCode: 400,
      error: 'Bad Request',
      message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    });
  }

  // Validate username format
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(username)) {
    return res.status(400).json({
      statusCode: 400,
      error: 'Bad Request',
      message: "Username must be between 3 and 20 characters long and can only contain letters, numbers, and underscores"
    });
  }

  try {
    // Check if email already exists
    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Email already registered'
      });
    }

    // Check if username already exists
    existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Username already taken'
      });
    }
    
    // Create new user
    const user = new User({
      name,
      username,
      email,
      password,
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

    console.log("User registered successfully:", user);
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    
    // Set secure cookie
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    
    // Return success response
    res.status(201).json({ 
      statusCode: 201,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          profileImage: user.profileImage,
          walletAddress: user.walletAddress || null,
          socialLinks: user.socialLinks || {},
          isVerified: user.isVerified,
          followers: user.followers,
          following: user.following
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Error during registration',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
    
    // Return user data without sending the token in the response body
    res.json({ 
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        walletAddress: user.walletAddress || null,
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
  console.log('GET /auth/user - Request received');
  console.log('User from auth middleware:', req.user);
  
  try {
    const user = await User.findById(req.user.id).select('-password');
    console.log('Found user:', user ? 'Yes' : 'No');
    
    if (!user) {
      console.log('User not found in database');
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return clean user object with only necessary properties
    const userData = {
      id: user._id,
      username: user.username,
      email: user.email,
      walletAddress: user.walletAddress || null,
      name: user.name || '',
      bio: user.bio || '',
      profileImage: user.profileImage || '',
      coverImage: user.coverImage || '',
      socialLinks: user.socialLinks || {}
    };
    console.log('Sending user data:', userData);
    
    res.json(userData);
  } catch (error) {
    console.error('Error in /user route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Public: Get user by wallet address
router.get('/user/wallet/:address', async (req, res) => {
  const { address } = req.params;
  try {
    // Find a user with matching wallet address
    const user = await User.findOne({ walletAddress: address }).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    // Return only public profile info
    res.json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        name: user.name,
        profileImage: user.profileImage,
        bio: user.bio,
        walletAddress: user.walletAddress
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Import S3 middleware
const { s3Upload, formatS3Url } = require('../middleware/s3Middleware');

// Set up S3 upload for profile images
const upload = s3Upload('profiles');

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
      user.profileImage = formatS3Url(profileImage.key);
    }
    
    // Handle cover image upload
    if (req.files && req.files.coverImage) {
      const coverImage = req.files.coverImage[0];
      user.coverImage = formatS3Url(coverImage.key);
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

// Check wallet by email
router.post('/check-wallet-by-email', async (req, res) => {
  const { email } = req.body;
  
  try {
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      walletAddress: user.walletAddress || null
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

// Wallet-first signup
router.post('/wallet-signup', async (req, res) => {
  const { walletType, walletAddress } = req.body;

  try {
    // Check if wallet is already registered
    const existingUser = await User.findOne({ walletAddress });
    if (existingUser) {
      return res.status(400).json({ message: 'Wallet already registered' });
    }

    // Generate a temporary username based on wallet address
    const tempUsername = `user_${walletAddress.slice(0, 8)}`;
    
    // Create new user with wallet
    const user = new User({
      name: tempUsername,
      username: tempUsername,
      email: `${tempUsername}@temp.com`, // Temporary email
      password: '', // Empty password for now
      walletAddress: walletAddress
    });

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
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        walletAddress: user.walletAddress
      }
    });
  } catch (error) {
    console.error('Wallet signup error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Link email to wallet user
router.post('/link-email', auth, async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the user by their ID from the auth token
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is already taken
    const emailExists = await User.findOne({ email });
    if (emailExists && emailExists._id.toString() !== user._id.toString()) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Update user with email and password
    user.email = email;
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    res.json({
      success: true,
      message: 'Email linked successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        walletAddress: user.walletAddress
      }
    });
  } catch (error) {
    console.error('Email linking error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update wallet-first user with email details or email-first user with wallet details
router.put('/update-wallet-user', async (req, res) => {
  const { username, name, email, password, walletType, walletAddress } = req.body;

  try {
    // Find user by username (which could be email for email-first users)
    const user = await User.findOne({ 
      $or: [
        { username },
        { email: username } // Also check by email for email-first users
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If email is provided, check if it's already taken by another user
    if (email) {
      const emailExists = await User.findOne({ 
        email, 
        _id: { $ne: user._id } // Exclude current user
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    // Update user details
    if (name) user.name = name;
    if (email) user.email = email;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    // Update wallet information if provided
    if (walletAddress) {
      // Check if wallet is already linked to another account
      const walletExists = await User.findOne({
        walletAddress,
        _id: { $ne: user._id }
      });

      if (walletExists) {
        return res.status(400).json({
          success: false,
          message: 'Wallet is already linked to another account'
        });
      }

      user.walletAddress = walletAddress;
    }

    await user.save();

    // Generate new JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Set secure cookie
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        walletAddress: user.walletAddress,
        socialLinks: user.socialLinks || {},
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Update wallet user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user details'
    });
  }
});

// Check username availability
router.get('/check-username/:username', async (req, res) => {
  try {
    const username = req.params.username.toLowerCase().trim(); // Normalize input
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(400).json({ message: "Username is already taken" });
    }

    res.status(200).json({ message: "Username is available" });
  } catch (error) {
    console.error("Error checking username:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Register wallet for existing user
router.post('/register-wallet', auth, async (req, res) => {
  const { walletType, walletAddress } = req.body;

  try {
    // Find the authenticated user
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if wallet is already linked to another account
    const walletExists = await User.findOne({
      walletAddress,
      _id: { $ne: user._id }
    });

    if (walletExists) {
      return res.status(400).json({
        success: false,
        message: 'Wallet is already linked to another account'
      });
    }

    // If user already has a wallet, don't allow changing it
    if (user.walletAddress) {
      if (user.walletAddress !== walletAddress) {
        return res.status(400).json({
          success: false,
          message: 'You can only connect with your registered wallet address'
        });
      }
      
      return res.json({
        success: true,
        message: 'Wallet already registered',
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          profileImage: user.profileImage,
          walletAddress: user.walletAddress,
          socialLinks: user.socialLinks || {},
          isVerified: user.isVerified
        }
      });
    }
    
    // Set the wallet address
    user.walletAddress = walletAddress;
    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        walletAddress: user.walletAddress,
        socialLinks: user.socialLinks || {},
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Register wallet error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;