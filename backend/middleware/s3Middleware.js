// middleware/s3Middleware.js
const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');

// AWS S3 configuration
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Helper function to determine file type based on mimetype
const getFileType = (mimetype) => {
  if (mimetype.startsWith('video/')) return 'videos';
  if (mimetype === 'image/gif') return 'gifs';
  return 'images';
};

// Create S3 upload middleware
const s3Upload = (folderName) => {
  return multer({
    storage: multerS3({
      s3: s3,
      bucket: process.env.AWS_BUCKET_NAME,
      key: function (req, file, cb) {
        // Determine subfolder based on file type for better organization
        const fileType = getFileType(file.mimetype);
        const subfolder = folderName ? `${folderName}/${fileType}` : fileType;
        
        // Create a unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = uniqueSuffix + path.extname(file.originalname);
        
        // Full path in S3: folderName/fileType/filename
        cb(null, `${subfolder}/${filename}`);
      },
      contentType: multerS3.AUTO_CONTENT_TYPE
    }),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
      // Accept images, videos, and gifs
      if (file.mimetype.startsWith('image/') ||
          file.mimetype.startsWith('video/') ||
          file.mimetype === 'image/gif') {
        cb(null, true);
      } else {
        cb(new Error('Unsupported file type'), false);
      }
    }
  });
};

// Helper function to format S3 URL for frontend
const formatS3Url = (key) => {
  if (!key) return null;
  const bucket = process.env.AWS_BUCKET_NAME;
  const region = process.env.AWS_REGION;
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

// Helper function to extract key from S3 URL
const extractKeyFromUrl = (url) => {
  if (!url) return null;
  try {
    const bucket = process.env.AWS_BUCKET_NAME;
    const region = process.env.AWS_REGION;
    const baseUrl = `https://${bucket}.s3.${region}.amazonaws.com/`;
    
    if (url.startsWith(baseUrl)) {
      return url.substring(baseUrl.length);
    }
    return url; // If it's already a key, return it
  } catch (error) {
    console.error('Error extracting key from URL:', error);
    return null;
  }
};

// Function to delete a file from S3
const deleteFileFromS3 = async (fileUrl) => {
  try {
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
    const key = extractKeyFromUrl(fileUrl);
    
    if (!key) {
      console.error('Invalid S3 URL or key:', fileUrl);
      return false;
    }
    
    const deleteParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key
    };
    
    const command = new DeleteObjectCommand(deleteParams);
    await s3.send(command);
    console.log(`Successfully deleted file from S3: ${key}`);
    return true;
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    return false;
  }
};

module.exports = {
  s3Upload,
  formatS3Url,
  deleteFileFromS3
};