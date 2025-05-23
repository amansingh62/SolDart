// routes/advertisementRoutes.js
const express = require('express');
const router = express.Router();
const path = require('path');
const Advertisement = require('../models/Advertisement');
const authenticateJWT = require('../middleware/authMiddleware');
const { s3Upload, formatS3Url } = require('../middleware/s3Middleware');

// Configure S3 upload for advertisement images
const upload = s3Upload('advertisements');

// POST - Create a new advertisement
router.post('/', authenticateJWT, upload.single('bannerImage'), function(req, res, next) {
  // Ensure middleware chain is properly connected
  next();
}, async (req, res) => {
  try {
    const { 
      projectName, 
      projectDetails, 
      twitterHandle, 
      telegramHandle, 
      website, 
      contactEmail, 
      adDuration, 
      transactionHash 
    } = req.body;

    // Validate required fields
    if (!projectName || !projectDetails || !contactEmail || !adDuration || !transactionHash) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate file upload
    if (!req.file) {
      return res.status(400).json({ message: 'Banner image is required' });
    }

    // Create new advertisement
    const newAdvertisement = new Advertisement({
      user: req.user.id,
      projectName,
      projectDetails,
      twitterHandle: twitterHandle || '',
      telegramHandle: telegramHandle || '',
      website: website || '',
      contactEmail,
      bannerImage: formatS3Url(req.file.key),
      adDuration,
      transactionHash,
      status: 'pending'
    });

    await newAdvertisement.save();
    res.status(201).json({ 
      message: 'Advertisement submitted successfully', 
      advertisement: newAdvertisement 
    });
  } catch (error) {
    console.error('Error creating advertisement:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET - Get all advertisements (admin only)
router.get('/admin', authenticateJWT, async (req, res) => {
  try {
    // TODO: Add admin check here
    const advertisements = await Advertisement.find().sort({ createdAt: -1 }).populate('user', 'name username');
    res.json(advertisements);
  } catch (error) {
    console.error('Error fetching advertisements:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET - Get active advertisements for display
router.get('/active', async (req, res) => {
  try {
    const activeAds = await Advertisement.find({ 
      status: 'active',
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    }).populate('user', 'name username');
    
    res.json(activeAds);
  } catch (error) {
    console.error('Error fetching active advertisements:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET - Get user's advertisements
router.get('/my', authenticateJWT, async (req, res) => {
  try {
    const userAds = await Advertisement.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(userAds);
  } catch (error) {
    console.error('Error fetching user advertisements:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT - Update advertisement status (admin only)
router.put('/:id/status', authenticateJWT, async (req, res) => {
  try {
    const { status } = req.body;
    
    // Validate status
    if (!['pending', 'active', 'completed', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    // TODO: Add admin check here
    const advertisement = await Advertisement.findById(req.params.id);
    
    if (!advertisement) {
      return res.status(404).json({ message: 'Advertisement not found' });
    }
    
    // Update status and dates if activating
    advertisement.status = status;
    
    if (status === 'active') {
      advertisement.startDate = new Date();
      
      // Set end date based on duration
      const durationMap = {
        '24 Hours - $29': 1,
        '3 Days - $69': 3,
        '7 Days - $149': 7
      };
      
      const days = durationMap[advertisement.adDuration] || 1;
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);
      advertisement.endDate = endDate;
    }
    
    await advertisement.save();
    res.json({ message: 'Advertisement status updated', advertisement });
  } catch (error) {
    console.error('Error updating advertisement status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;