// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { register, login, getMe, updateMe, changePassword } = require('../controllers/authController');
const verifyToken = require('../middleware/authMiddleware');

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me
router.get('/me', verifyToken, getMe);

// PUT /api/auth/me
router.put('/me', verifyToken, updateMe);

// PUT /api/auth/change-password
router.put('/change-password', verifyToken, changePassword);

module.exports = router;
