const express = require('express');
const router = express.Router();
const multer = require('multer');
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

// Use memory storage — the controller handles the Supabase upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
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
