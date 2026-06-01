const jwt = require('jsonwebtoken');
const User = require('../models/User');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Queries the live DB record so blocks/deactivations take effect immediately,
// even for tokens that haven't expired yet.
const checkAccountStatus = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await User.findById(req.user.id).select('isBlocked isActive');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (user.isBlocked || !user.isActive) {
      return res.status(403).json({ message: 'Your account has been restricted.' });
    }

    next();
  } catch (err) {
    console.error('checkAccountStatus error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = verifyToken;
module.exports.checkAccountStatus = checkAccountStatus;
