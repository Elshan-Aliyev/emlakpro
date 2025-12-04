const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Create storage configuration for property images
const propertyStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'properties',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
      transformation: [
        {
          width: 1600,
          height: 1200,
          crop: 'limit',
          quality: 'auto:good',
          fetch_format: 'auto'
        }
      ],
      public_id: `property_${Date.now()}_${Math.random().toString(36).substring(7)}`
    };
  }
});

// Create storage for thumbnails
const thumbnailStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'properties/thumbnails',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
      transformation: [
        {
          width: 400,
          height: 300,
          crop: 'fill',
          quality: 'auto:low',
          fetch_format: 'auto'
        }
      ],
      public_id: `thumb_${Date.now()}_${Math.random().toString(36).substring(7)}`
    };
  }
});

// Create storage for user avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'users/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      {
        width: 400,
        height: 400,
        crop: 'fill',
        gravity: 'face',
        quality: 'auto:good',
        fetch_format: 'auto'
      }
    ],
    public_id: (req, file) => `avatar_${req.user?.id || Date.now()}`
  }
});

// File filter to validate image types
const imageFileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
  
  console.log(`📎 Validating file: ${file.originalname} (${file.mimetype})`);
  
  if (allowedMimes.includes(file.mimetype.toLowerCase())) {
    console.log('✅ File type valid');
    cb(null, true);
  } else {
    console.log(`❌ File type rejected: ${file.mimetype}`);
    cb(new Error(`Invalid file type "${file.mimetype}". Only JPEG, PNG, WEBP, and HEIC images are allowed.`), false);
  }
};

// Multer upload configurations
const uploadPropertyImages = multer({
  storage: propertyStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

const uploadThumbnail = multer({
  storage: thumbnailStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Helper function to delete image from Cloudinary
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};

// Helper function to delete multiple images
const deleteMultipleImages = async (publicIds) => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds);
    return result;
  } catch (error) {
    console.error('Error deleting multiple images:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadPropertyImages,
  uploadThumbnail,
  uploadAvatar,
  deleteImage,
  deleteMultipleImages
};
