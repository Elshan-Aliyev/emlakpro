const express = require('express');
const router = express.Router();
const { getUsers, updateUser, deleteUser } = require('../controllers/userController');
const verifyToken = require('../middleware/authMiddleware');

// GET /api/users
router.get('/', verifyToken, getUsers);

// PUT /api/users/:id
router.put('/:id', verifyToken, updateUser);

// DELETE /api/users/:id
router.delete('/:id', verifyToken, deleteUser);

module.exports = router;
