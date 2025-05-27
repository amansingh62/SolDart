// routes/postRoutes.js
const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');
const { s3Upload, formatS3Url } = require('../middleware/s3Middleware');
const path = require('path');
const fs = require('fs');

// Set up S3 upload for posts
const upload = s3Upload('posts');

// Helper function to check file type
const getFileType = (mimetype) => {
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype === 'image/gif') return 'gif';
  return 'image';
};

// Helper function to extract hashtags from content
const extractHashtags = (content) => {
  if (!content) return [];
  const hashtags = [];

  // Log the content for debugging
  console.log('Extracting hashtags from content:', content);

  // Handle case where content is just a single hashtag without spaces
  if (content.startsWith('#') && content.trim().indexOf(' ') === -1) {
    const singleHashtag = content.trim().replace(/[^\w#]/g, '');
    if (singleHashtag.length > 1) { // Ensure it's not just a # symbol
      console.log('Found single hashtag:', singleHashtag);
      return [singleHashtag];
    }
  }

  // Handle normal case with multiple words
  const words = content.split(/\s+/);

  words.forEach(word => {
    if (word.startsWith('#') && word.length > 1) {
      // Remove any punctuation at the end of the hashtag
      const hashtag = word.replace(/[^\w#]/g, '');
      if (hashtag.length > 1) { // Ensure it's not just a # symbol
        hashtags.push(hashtag);
      }
    }
  });

  console.log('Extracted hashtags:', hashtags);
  return [...new Set(hashtags)]; // Remove duplicates
};

// Create a new post (dart)
router.post('/', auth, upload.array('media', 4), async (req, res) => {
  try {
    const { content, pollQuestion, pollOptions } = req.body;

    // Extract hashtags from content
    const hashtags = content ? extractHashtags(content) : [];

    // Create post object
    const postData = {
      user: req.user.id,
      content: content || '',
      hashtags: hashtags
    };

    // Add media if uploaded
    if (req.files && req.files.length > 0) {
      postData.media = req.files.map(file => {
        let type = 'image';
        if (file.mimetype.startsWith('video/')) {
          type = 'video';
        } else if (file.mimetype === 'image/gif') {
          type = 'gif';
        }

        return {
          type,
          url: formatS3Url(file.key)
        };
      });
    }

    // Validate that post has either content, media, or poll
    if (!content && (!req.files || req.files.length === 0) && !pollQuestion) {
      return res.status(400).json({
        success: false,
        message: 'Post must have either text content, media, or a poll'
      });
    }

    // Add poll if provided
    if (pollQuestion && pollOptions) {
      const options = JSON.parse(pollOptions);
      if (options && Array.isArray(options) && options.length > 0) {
        postData.poll = {
          question: pollQuestion,
          options: options.map(opt => ({ text: opt }))
        };
      }
    }

    const post = new Post(postData);
    await post.save();

    // Increment user's dart count
    await User.findByIdAndUpdate(req.user.id, { $inc: { darts: 1 } });

    // Track post creation for quest system - no authentication required
    // Use the user ID from the authenticated user
    try {
      // Make a request to the quest tracking endpoint
      const axios = require('axios');
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
      await axios.post(`${baseUrl}/api/quests/track/post/${req.user.id}/${post._id}`);
    } catch (questError) {
      console.error('Quest tracking error:', questError);
      // Don't fail the post creation if quest tracking fails
    }

    // Populate user data for the response
    const populatedPost = await Post.findById(post._id).populate('user', 'username profileImage walletAddress');

    // Emit socket event for real-time updates
    req.app.get('io').emit('newPost', populatedPost);

    // If post has hashtags, update trending hashtags and emit event
    if (hashtags && hashtags.length > 0) {
      // Get updated trending hashtags
      const trendingHashtagsData = await getTrendingHashtags();
      // Emit trending hashtags update event
      req.app.get('io').emit('hashtagsUpdated', trendingHashtagsData);
    }

    res.status(201).json({ success: true, post: populatedPost });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all posts for the home feed - no auth required
router.get('/feed', async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('user', 'username profileImage walletAddress darts')
      .populate('comments.user', 'username profileImage name walletAddress')
      .populate('comments.replies.user', 'username profileImage name walletAddress');

    res.json({ success: true, posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper function to get trending hashtags
async function getTrendingHashtags() {
  try {
    // Find all posts with hashtags
    const posts = await Post.find({
      $or: [
        { hashtags: { $exists: true, $ne: [] } },
        { content: { $regex: /#\w+/ } } // Also find posts where content contains hashtags
      ]
    })
      .populate('user', 'username profileImage walletAddress');

    // Count hashtag occurrences across all posts
    const hashtagCounts = {};
    const hashtagPosts = {};

    posts.forEach(post => {
      // If post has hashtags array, use those
      if (post.hashtags && post.hashtags.length > 0) {
        post.hashtags.forEach(hashtag => {
          // Count occurrences of each hashtag
          if (!hashtagCounts[hashtag]) {
            hashtagCounts[hashtag] = 0;
            hashtagPosts[hashtag] = [];
          }
          hashtagCounts[hashtag]++;

          // Only add if we don't already have too many posts for this hashtag
          if (hashtagPosts[hashtag].length < 5) {
            hashtagPosts[hashtag].push(post);
          }
        });
      }
      // If post content contains hashtags but they weren't extracted properly
      else if (post.content && post.content.includes('#')) {
        // Extract hashtags from content
        const extractedTags = extractHashtags(post.content);

        extractedTags.forEach(hashtag => {
          // Count occurrences of each hashtag
          if (!hashtagCounts[hashtag]) {
            hashtagCounts[hashtag] = 0;
            hashtagPosts[hashtag] = [];
          }
          hashtagCounts[hashtag]++;

          // Only add if we don't already have too many posts for this hashtag
          if (hashtagPosts[hashtag].length < 5) {
            hashtagPosts[hashtag].push(post);
          }
        });
      }
    });

    // Convert to array format for easier consumption by frontend
    const trendingHashtags = Object.keys(hashtagPosts).map(hashtag => ({
      hashtag,
      posts: hashtagPosts[hashtag],
      postCount: hashtagCounts[hashtag], // Add post count instead of total views
      totalViews: hashtagPosts[hashtag].reduce((sum, post) => sum + post.views, 0) // Keep total views for backward compatibility
    }));

    // Sort by post count (most occurrences first)
    trendingHashtags.sort((a, b) => b.postCount - a.postCount);

    // Return only top 5 trending hashtags as requested by user
    return trendingHashtags.slice(0, 5);
  } catch (error) {
    console.error('Error getting trending hashtags:', error);
    return [];
  }
}

// Get trending hashtag posts
router.get('/trending-hashtags', async (req, res) => {
  try {
    console.log('Fetching trending hashtags...');
    const trendingHashtags = await getTrendingHashtags();
    res.json({ success: true, trendingHashtags });
  } catch (error) {
    console.error('Error fetching trending hashtags:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get posts by hashtag
router.get('/hashtag/:tag', async (req, res) => {
  try {
    const { tag } = req.params;
    const hashtag = `#${tag}`;

    const posts = await Post.find({ hashtags: hashtag })
      .sort({ views: -1 })
      .populate('user', 'username profileImage walletAddress')
      .populate('comments.user', 'username profileImage name walletAddress')
      .populate('comments.replies.user', 'username profileImage name walletAddress');

    res.json({ success: true, hashtag, posts });
  } catch (error) {
    console.error('Error fetching hashtag posts:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get posts by a specific user
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .populate('user', 'username profileImage walletAddress')
      .populate('comments.user', 'username profileImage name walletAddress')
      .populate('comments.replies.user', 'username profileImage name walletAddress');

    res.json({ success: true, posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get posts by the authenticated user
router.get('/my-posts', auth, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate('user', 'username profileImage walletAddress')
      .populate('comments.user', 'username profileImage name walletAddress')
      .populate('comments.replies.user', 'username profileImage name walletAddress');

    res.json({ success: true, posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Like a post
router.post('/like/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('user', 'username');

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const wasLiked = post.likes.includes(req.user.id);

    // Check if already liked
    if (wasLiked) {
      // Unlike
      post.likes = post.likes.filter(like => like.toString() !== req.user.id);
    } else {
      // Like
      post.likes.push(req.user.id);

      // Create notification for post owner if someone else liked the post
      if (post.user._id.toString() !== req.user.id) {
        const Notification = require('../models/Notification');
        const newNotification = new Notification({
          recipient: post.user._id,
          sender: req.user.id,
          type: 'like',
          post: post._id,
          message: `liked your post`
        });

        await newNotification.save();

        // Emit socket event for real-time notification
        const io = req.app.get('io');
        io.to(`user-${post.user._id}`).emit('notification', newNotification);
      }

      // Track like for quest system - no authentication required
      // Use the user ID from the authenticated user
      try {
        // Make a request to the quest tracking endpoint
        const axios = require('axios');
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
        await axios.post(`${baseUrl}/api/quests/track/like/${req.user.id}/${post._id}`);
      } catch (questError) {
        console.error('Quest tracking error:', questError);
        // Don't fail the like operation if quest tracking fails
      }
    }

    await post.save();

    // Emit socket event for real-time updates
    req.app.get('io').emit('postUpdated', post);

    // Update trending hashtags if post has hashtags
    if (post.hashtags && post.hashtags.length > 0) {
      const trendingHashtagsData = await getTrendingHashtags();
      req.app.get('io').emit('hashtagsUpdated', trendingHashtagsData);
    }

    res.json({ success: true, likes: post.likes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add a comment to a post
router.post('/comment/:id', auth, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Add the comment
    const newComment = {
      user: req.user.id,
      text
    };

    post.comments.push(newComment);
    await post.save();

    // Get the ID of the newly created comment
    const commentId = post.comments[post.comments.length - 1]._id;

    // Create notification for post owner if someone else commented on the post
    if (post.user.toString() !== req.user.id) {
      const Notification = require('../models/Notification');
      const newNotification = new Notification({
        recipient: post.user,
        sender: req.user.id,
        type: 'comment',
        post: post._id,
        message: `commented on your post: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`
      });

      await newNotification.save();

      // Emit socket event for real-time notification
      const io = req.app.get('io');
      io.to(`user-${post.user}`).emit('notification', newNotification);
    }

    // Track comment for quest system - no authentication required
    // Use the user ID from the authenticated user
    try {
      // Make a request to the quest tracking endpoint
      const axios = require('axios');
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
      await axios.post(`${baseUrl}/api/quests/track/comment/${req.user.id}/${post._id}/${commentId}`);
    } catch (questError) {
      console.error('Quest tracking error:', questError);
      // Don't fail the comment operation if quest tracking fails
    }

    // Populate the new comment with user data - ensure all necessary fields are included
    const populatedPost = await Post.findById(post._id)
      .populate({
        path: 'comments.user',
        select: 'username profileImage name walletAddress'
      })
      .populate({
        path: 'user',
        select: 'username profileImage walletAddress'
      });

    // Emit socket event for real-time updates
    req.app.get('io').emit('postUpdated', populatedPost);

    // Find the updated comment to return it specifically
    const updatedComment = populatedPost.comments.id(commentId);

    res.json({
      success: true,
      comments: populatedPost.comments,
      updatedComment: updatedComment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Vote on a poll
router.post('/poll-vote/:id', auth, async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const userId = req.user.id;

    if (optionIndex === undefined) {
      return res.status(400).json({ success: false, message: 'Option index is required' });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (!post.poll) {
      return res.status(400).json({ success: false, message: 'This post does not have a poll' });
    }

    // Check if poll has expired
    if (post.poll.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'This poll has expired' });
    }

    // Check if the selected option exists
    if (!post.poll.options[optionIndex]) {
      return res.status(400).json({ success: false, message: 'Invalid option index' });
    }

    // Find if user has already voted on any option
    let previousVoteIndex = -1;
    for (let i = 0; i < post.poll.options.length; i++) {
      if (post.poll.options[i].voters.includes(userId)) {
        previousVoteIndex = i;
        break;
      }
    }

    // If user already voted on the same option, do nothing
    if (previousVoteIndex === optionIndex) {
      return res.json({ success: true, poll: post.poll, message: 'Already voted for this option' });
    }

    // If user voted on a different option, remove the previous vote
    if (previousVoteIndex !== -1) {
      // Remove user from voters array of previous option
      post.poll.options[previousVoteIndex].voters = post.poll.options[previousVoteIndex].voters.filter(
        voterId => voterId.toString() !== userId
      );
      // Decrement vote count for previous option
      post.poll.options[previousVoteIndex].votes -= 1;
    }

    // Add vote to the new option
    post.poll.options[optionIndex].voters.push(userId);
    post.poll.options[optionIndex].votes += 1;

    await post.save();

    // Emit socket event for real-time updates
    req.app.get('io').emit('postUpdated', post);

    res.json({
      success: true,
      poll: post.poll,
      message: previousVoteIndex !== -1 ? 'Vote changed successfully' : 'Vote recorded successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Repost a post
router.post('/repost/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Check if already reposted
    if (post.repostedBy.includes(req.user.id)) {
      // Un-repost
      post.repostedBy = post.repostedBy.filter(repost => repost.toString() !== req.user.id);
    } else {
      // Repost
      post.repostedBy.push(req.user.id);
    }

    await post.save();

    // Emit socket event for real-time updates
    req.app.get('io').emit('postUpdated', post);

    res.json({ success: true, repostedBy: post.repostedBy });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete a post
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Check if user owns the post
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this post' });
    }

    // Delete media files from S3 if they exist
    if (post.media && post.media.length > 0) {
      const { deleteFileFromS3 } = require('../middleware/s3Middleware');
      const deletePromises = post.media.map(media => deleteFileFromS3(media.url));
      await Promise.all(deletePromises);
    }

    // Use deleteOne() instead of remove() which is deprecated in Mongoose 8.x
    await Post.deleteOne({ _id: post._id });

    // Decrement user's dart count, ensuring it never goes below 0
    const user = await User.findById(req.user.id);
    if (user) {
      // Get current dart count to ensure it doesn't go below 0
      const currentDarts = user.darts || 0;
      if (currentDarts > 0) {
        await User.findByIdAndUpdate(req.user.id, { $inc: { darts: -1 } });
      } else if (currentDarts < 0) {
        // Fix negative dart count by setting it to 0
        await User.findByIdAndUpdate(req.user.id, { $set: { darts: 0 } });
      }
    }

    // Emit socket event for real-time updates
    req.app.get('io').emit('postDeleted', req.params.id);

    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Pin/unpin a post to profile
router.post('/pin/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Check if user owns the post
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to pin this post' });
    }

    // If trying to pin a post, check if user already has a pinned post
    if (!post.isPinned) {
      const existingPinnedPost = await Post.findOne({
        user: req.user.id,
        isPinned: true
      });

      if (existingPinnedPost) {
        return res.status(400).json({
          success: false,
          message: 'You can only pin one post at a time. Please unpin your current pinned post first.'
        });
      }
    }

    // Toggle pin status
    post.isPinned = !post.isPinned;
    await post.save();

    // Emit socket event for real-time updates
    req.app.get('io').emit('postUpdated', post);

    res.json({ success: true, isPinned: post.isPinned });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Save/unsave a post
router.post('/save/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Find the user
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if post is already saved
    const postIndex = user.savedPosts.findIndex(item => item.post.toString() === req.params.id);

    if (postIndex > -1) {
      // Unsave the post
      user.savedPosts.splice(postIndex, 1);
    } else {
      // Save the post with current timestamp
      user.savedPosts.push({
        post: req.params.id,
        savedAt: new Date()
      });
    }

    await user.save();

    res.json({
      success: true,
      saved: postIndex === -1,
      message: postIndex > -1 ? 'Post removed from saved' : 'Post saved successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get saved posts
router.get('/saved', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'savedPosts.post',
      populate: {
        path: 'user',
        select: 'username profileImage walletAddress'
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Sort saved posts by savedAt timestamp in descending order (newest first)
    const sortedSavedPosts = user.savedPosts
      .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
      .map(item => item.post);

    res.json({ success: true, posts: sortedSavedPosts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Pin/unpin a comment
router.post('/comment/pin/:postId/:commentId', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Find the comment
    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Check if user owns the comment
    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to pin this comment' });
    }

    // Unpin all other comments first
    post.comments.forEach(c => {
      if (c._id.toString() !== req.params.commentId) {
        c.isPinned = false;
      }
    });

    // Toggle pin status for this comment
    comment.isPinned = !comment.isPinned;
    await post.save();

    // Emit socket event for real-time updates
    req.app.get('io').emit('postUpdated', post);

    res.json({ success: true, isPinned: comment.isPinned });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete a comment
router.delete('/comment/:postId/:commentId', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Find the comment
    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Check if user owns the comment
    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this comment' });
    }

    // Remove the comment using pull operator instead of deprecated remove() method
    post.comments.pull({ _id: req.params.commentId });
    await post.save();

    // Emit socket event for real-time updates
    req.app.get('io').emit('postUpdated', post);

    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add a reply to a comment
router.post('/comment/reply/:postId/:commentId', auth, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, message: 'Reply text is required' });
    }

    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Find the comment
    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Add the reply
    comment.replies.push({
      user: req.user.id,
      text
    });

    await post.save();

    // Create notification for comment owner if someone else replied to the comment
    if (comment.user.toString() !== req.user.id) {
      const Notification = require('../models/Notification');
      const newNotification = new Notification({
        recipient: comment.user,
        sender: req.user.id,
        type: 'reply',
        post: post._id,
        message: `replied to your comment: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`
      });

      await newNotification.save();

      // Emit socket event for real-time notification
      const io = req.app.get('io');
      io.to(`user-${comment.user}`).emit('notification', newNotification);
    }

    // Populate the updated post with user data
    const populatedPost = await Post.findById(post._id)
      .populate({
        path: 'comments.user',
        select: 'username profileImage name walletAddress'
      })
      .populate({
        path: 'comments.replies.user',
        select: 'username profileImage name walletAddress'
      })
      .populate({
        path: 'user',
        select: 'username profileImage walletAddress'
      });

    // Emit socket event for real-time updates
    req.app.get('io').emit('postUpdated', populatedPost);

    // Find the updated comment to return it specifically
    const updatedComment = populatedPost.comments.id(req.params.commentId);

    res.json({
      success: true,
      comments: populatedPost.comments,
      updatedComment: updatedComment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete a reply from a comment
router.delete('/comment/reply/:postId/:commentId/:replyId', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Find the comment
    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Find the reply index
    const replyIndex = comment.replies.findIndex(reply =>
      reply._id.toString() === req.params.replyId
    );

    if (replyIndex === -1) {
      return res.status(404).json({ success: false, message: 'Reply not found' });
    }

    // Check if the user is authorized to delete this reply
    const reply = comment.replies[replyIndex];
    if (reply.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this reply' });
    }

    // Remove the reply
    comment.replies.splice(replyIndex, 1);
    await post.save();

    // Emit socket event for real-time updates
    req.app.get('io').emit('postUpdated', post);

    res.json({ success: true, message: 'Reply deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Increment view count for a post (unique views only)
router.post('/view/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Check if user has already viewed this post
    const userId = req.user.id;
    const alreadyViewed = post.viewers.some(viewerId => viewerId.toString() === userId);

    // Only increment view count if this is a new viewer
    if (!alreadyViewed) {
      post.viewers.push(userId);
      post.views = post.viewers.length;
      await post.save();

      // Emit socket event for real-time updates
      req.app.get('io').emit('postViewed', { postId: post._id, views: post.views });

      // Update trending hashtags if post has hashtags
      if (post.hashtags && post.hashtags.length > 0) {
        const trendingHashtagsData = await getTrendingHashtags();
        req.app.get('io').emit('hashtagsUpdated', trendingHashtagsData);
      }
    }

    res.json({ success: true, views: post.views });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Like a comment
router.post('/comment/like/:postId/:commentId', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Find the comment
    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Initialize likes array if it doesn't exist
    if (!comment.likes) {
      comment.likes = [];
    }

    const wasLiked = comment.likes.includes(req.user.id);

    // Check if already liked
    if (wasLiked) {
      // Unlike
      comment.likes = comment.likes.filter(like => like.toString() !== req.user.id);
    } else {
      // Like
      comment.likes.push(req.user.id);

      // Create notification for comment owner if someone else liked the comment
      if (comment.user.toString() !== req.user.id) {
        const Notification = require('../models/Notification');
        const newNotification = new Notification({
          recipient: comment.user,
          sender: req.user.id,
          type: 'like',
          post: post._id,
          message: `liked your comment`
        });

        await newNotification.save();

        // Emit socket event for real-time notification
        const io = req.app.get('io');
        io.to(`user-${comment.user}`).emit('notification', newNotification);
      }
    }

    await post.save();

    // Emit socket event for real-time updates
    req.app.get('io').emit('postUpdated', post);

    res.json({
      success: true,
      likes: comment.likes,
      isLiked: !wasLiked
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get a single post by ID
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'username profileImage walletAddress')
      .populate('comments.user', 'username profileImage name walletAddress')
      .populate('comments.replies.user', 'username profileImage name walletAddress');

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    res.json({ success: true, post });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;