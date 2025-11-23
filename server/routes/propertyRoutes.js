const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');

const {
  createProperty,
  getProperties,
  getProperty,
  updateProperty,
  deleteProperty
} = require('../controllers/propertyController');

router.post('/', verifyToken, createProperty);
router.get('/', getProperties);
router.get('/:id', getProperty);
router.put('/:id', verifyToken, updateProperty);
router.delete('/:id', verifyToken, deleteProperty);

module.exports = router;
