// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { getUsers, updateUser, deleteUser } = require('../controllers/userController');

// GET /api/users
router.get('/', verifyToken, getUsers);

// PUT /api/users/:id
router.put('/:id', verifyToken, updateUser);

// DELETE /api/users/:id
router.delete('/:id', verifyToken, deleteUser);

module.exports = router;
