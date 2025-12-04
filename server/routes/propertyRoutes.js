const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { uploadPropertyImages } = require('../config/cloudinary');

const {
  createProperty,
  getProperties,
  getProperty,
  updateProperty,
  deleteProperty,
  uploadPropertyImages: uploadImages,
  addPropertyImages,
  deletePropertyImage,
  toggleSaveProperty,
  getSavedProperties,
  incrementViews
} = require('../controllers/propertyController');

// Property CRUD routes
router.post('/', verifyToken, createProperty);
router.get('/', getProperties);
router.get('/:id', getProperty);
router.put('/:id', verifyToken, updateProperty);
router.delete('/:id', verifyToken, deleteProperty);

// Image upload routes with error handling
router.post('/upload-images', verifyToken, (req, res, next) => {
  const upload = uploadPropertyImages.array('images', 20);
  upload(req, res, (err) => {
    if (err) {
      console.error('❌ Multer upload error:', err.message);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          message: 'File too large. Maximum size is 10MB per file.',
          error: 'FILE_TOO_LARGE'
        });
      }
      if (err.message.includes('Invalid file type')) {
        return res.status(400).json({ 
          message: err.message,
          error: 'INVALID_FILE_TYPE'
        });
      }
      return res.status(400).json({ 
        message: err.message || 'Upload error',
        error: 'UPLOAD_ERROR'
      });
    }
    next();
  });
}, uploadImages);

router.post('/:id/images', verifyToken, (req, res, next) => {
  const upload = uploadPropertyImages.array('images', 20);
  upload(req, res, (err) => {
    if (err) {
      console.error('❌ Multer upload error:', err.message);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
      }
      return res.status(400).json({ message: err.message || 'Upload error' });
    }
    next();
  });
}, addPropertyImages);

router.delete('/:id/images/:imageUrl', verifyToken, deletePropertyImage);

// Save/Unsave property
router.post('/:id/save', verifyToken, toggleSaveProperty);
router.get('/saved/my-properties', verifyToken, getSavedProperties);

// View tracking
router.post('/:id/view', incrementViews);

module.exports = router;
