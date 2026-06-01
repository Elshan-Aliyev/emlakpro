const express = require('express');
const router = express.Router();
const {
  getArticles,
  getArticleBySlug,
  getAdminArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  uploadFeaturedImage,
  incrementViews,
  toggleLike
} = require('../controllers/articleController');
const verifyToken = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');
const multer = require('multer');

// Use memory storage — the controller handles the Supabase upload
const upload = multer({ storage: multer.memoryStorage() });

// Public routes
router.get('/', getArticles);
router.get('/:slug', getArticleBySlug);
router.post('/:id/view', incrementViews);
router.post('/:id/like', toggleLike);

// Admin routes
router.get('/admin/all', verifyToken, isAdmin, getAdminArticles);
router.post('/', verifyToken, isAdmin, createArticle);
router.put('/:id', verifyToken, isAdmin, updateArticle);
router.delete('/:id', verifyToken, isAdmin, deleteArticle);
router.post('/upload-image', verifyToken, isAdmin, upload.single('image'), uploadFeaturedImage);

module.exports = router;
