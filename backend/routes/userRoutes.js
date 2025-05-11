// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const Post = require('../models/Post');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/profiles');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
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
    const { name, username, bio, walletAddress, socialLinks } = req.body; // ✅ Include socialLinks

    // Find user
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update profile fields
    // Only update fields if they are provided, otherwise keep existing values
    if (name) user.name = name;
    if (username) user.username = username;
    if (bio) user.bio = bio;
    if (walletAddress) user.walletAddress = walletAddress;

    // Ensure required fields are preserved
    // The password field should be preserved from the existing user object

    // ✅ Convert socialLinks from JSON string (if sent as a string)
    if (socialLinks) {
      user.socialLinks = typeof socialLinks === 'string' ? JSON.parse(socialLinks) : socialLinks;
    }

    // Handle profile image upload
    if (req.files?.profileImage) {
      user.profileImage = `/uploads/profiles/${req.files.profileImage[0].filename}`;
    }

    // Handle cover image upload
    if (req.files?.coverImage) {
      user.coverImage = `/uploads/profiles/${req.files.coverImage[0].filename}`;
    }

    // Don't reset followers and following counts during profile update
    // user.followers = 0;
    // user.following = 0;

    try {
      await user.save();
    } catch (ex) {
      console.log("exeption is =" + ex.message)
    }
    // Return updated user data without password
    const userData = user.toObject();
    delete userData.password;

    res.json({ success: true, user: userData });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({ success: false, message: "Failed to update profile" });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Return user data without password
    const userData = user.toObject();
    delete userData.password;

    res.json({ success: true, user: userData });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to get profile data' });
  }
});


router.get("/check-username/:username", async (req, res) => {
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

// Follow a user
router.post('/follow/:userId', auth, async (req, res) => {
  try {
    if (req.params.userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot follow yourself' });
    }

    const user = await User.findById(req.user.id);
    const userToFollow = await User.findById(req.params.userId);

    if (!userToFollow) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if user is blocked
    if (user.blockedUsers.includes(req.params.userId)) {
      return res.status(400).json({ success: false, message: 'You have blocked this user' });
    }

    // Check if already following
    if (user.followingList.includes(req.params.userId)) {
      // If already following, unfollow
      user.followingList = user.followingList.filter(id => id.toString() !== req.params.userId);
      user.following = user.followingList.length;

      // Remove from followers list of the other user
      userToFollow.followersList = userToFollow.followersList.filter(id => id.toString() !== req.user.id);
      userToFollow.followers = userToFollow.followersList.length;

      await user.save();
      await userToFollow.save();

      return res.json({ success: true, message: 'User unfollowed successfully', isFollowing: false });
    }

    // Add to following list
    user.followingList.push(req.params.userId);
    user.following = user.followingList.length;

    // Add to followers list of the other user
    userToFollow.followersList.push(req.user.id);
    userToFollow.followers = userToFollow.followersList.length;

    await user.save();
    await userToFollow.save();

    res.json({ success: true, message: 'User followed successfully', isFollowing: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Unfollow a user
router.post('/unfollow/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const userToUnfollow = await User.findById(req.params.userId);

    if (!userToUnfollow) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if actually following
    if (!user.following.includes(req.params.userId)) {
      return res.status(400).json({ success: false, message: 'Not following this user' });
    }

    // Remove from following list
    user.following = user.following.filter(id => id.toString() !== req.params.userId);
    await user.save();

    // Remove from followers list of the other user
    userToUnfollow.followers = userToUnfollow.followers.filter(id => id.toString() !== req.user.id);
    await userToUnfollow.save();

    res.json({ success: true, message: 'User unfollowed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Block a user
router.post('/block/:userId', auth, async (req, res) => {
  try {
    if (req.params.userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot block yourself' });
    }

    const user = await User.findById(req.user.id);
    const userToBlock = await User.findById(req.params.userId);

    if (!userToBlock) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if already blocked
    if (user.blockedUsers.includes(req.params.userId)) {
      return res.status(400).json({ success: false, message: 'Already blocked this user' });
    }

    // Add to blocked users list
    user.blockedUsers.push(req.params.userId);

    // If following this user, unfollow them
    if (user.followingList.includes(req.params.userId)) {
      user.followingList = user.followingList.filter(id => id.toString() !== req.params.userId);
      user.following = user.followingList.length;

      // Remove from followers list of the blocked user
      userToBlock.followersList = userToBlock.followersList.filter(id => id.toString() !== req.user.id);
      userToBlock.followers = userToBlock.followersList.length;
      await userToBlock.save();
    }

    await user.save();

    res.json({ success: true, message: 'User blocked successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/profile/:username', async (req, res) => {
  try {
    // Find user by username
    const user = await User.findOne({ username: req.params.username })
      .select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get posts by this user
    const posts = await Post.find({ user: user._id })
      .populate('user', 'username profileImage')
      .sort({ createdAt: -1 });

    // Update the user's dart count based on the actual number of posts
    // This ensures the dart count is always accurate for all users
    const postCount = posts.length;
    if (user.darts !== postCount) {
      await User.findByIdAndUpdate(user._id, { darts: postCount });
      // Update the user object for the response
      user.darts = postCount;
    }

    // Check if the current user is viewing their own profile
    let isOwnProfile = false;
    let isFollowing = false;

    // If there's an auth token, check if this is the current user's profile
    if (req.headers['x-auth-token']) {
      try {
        const decoded = jwt.verify(req.headers['x-auth-token'], process.env.JWT_SECRET);
        isOwnProfile = decoded.user.id === user._id.toString();

        // If not own profile, check if current user is following this user
        if (!isOwnProfile) {
          const currentUser = await User.findById(decoded.user.id);
          if (currentUser) {
            isFollowing = currentUser.followingList.includes(user._id);
          }
        }
      } catch (err) {
        // Invalid token, not authenticated
        console.error('Token verification error:', err);
      }
    }

    // Add isFollowing flag to the response
    const userData = user.toObject();
    userData.isFollowing = isFollowing;

    res.json({ success: true, user: userData, posts, isOwnProfile })
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get top users by follower count
router.get('/top-followers', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const topUsers = await User.find({}, {
      _id: 1,
      username: 1,
      profileImage: 1,
      followers: 1,
      bio: 1
    })
      .sort({ followers: -1 })
      .limit(limit);

    // Format the response to match the expected structure
    const formattedUsers = topUsers.map(user => ({
      id: user._id.toString(),
      username: user.username,
      profileImage: user.profileImage || '/default-avatar.png',
      followersCount: user.followers || 0,
      bio: user.bio || ''
    }));

    res.json({
      success: true,
      users: formattedUsers
    });
  } catch (error) {
    console.error('Error fetching top users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top users'
    });
  }
});

module.exports = router;