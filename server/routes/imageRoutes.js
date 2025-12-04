const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const { 
  uploadImage, 
  getImages, 
  getImage, 
  updateImage, 
  deleteImage,
  bulkDeleteImages 
} = require('../controllers/imageController');
const authMiddleware = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

// Configure Cloudinary storage for images
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'general-images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1920, height: 1080, crop: 'limit' }]
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Public routes
router.get('/:id', getImage);

// Protected routes (authenticated users)
router.post('/', authMiddleware, upload.single('image'), uploadImage);
router.get('/', authMiddleware, getImages);
router.patch('/:id', authMiddleware, updateImage);
router.delete('/:id', authMiddleware, deleteImage);

// Admin only routes
router.post('/bulk-delete', authMiddleware, isAdmin, bulkDeleteImages);

module.exports = router;
