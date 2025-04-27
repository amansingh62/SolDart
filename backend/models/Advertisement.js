// models/Advertisement.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema for advertisements
const AdvertisementSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  projectName: {
    type: String,
    required: true,
    trim: true
  },
  projectDetails: {
    type: String,
    required: true,
    trim: true
  },
  twitterHandle: {
    type: String,
    trim: true
  },
  telegramHandle: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  contactEmail: {
    type: String,
    required: true,
    trim: true
  },
  bannerImage: {
    type: String,
    required: true
  },
  adDuration: {
    type: String,
    required: true,
    enum: ['24 Hours - $29', '3 Days - $69', '7 Days - $149']
  },
  transactionHash: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'rejected'],
    default: 'pending'
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Advertisement', AdvertisementSchema);