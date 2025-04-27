// routes/advertisementRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Advertisement = require('../models/Advertisement');
const authenticateJWT = require('../middleware/authMiddleware');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/advertisements');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

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
      bannerImage: `/uploads/advertisements/${req.file.filename}`,
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