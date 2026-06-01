const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const verifyToken = require('../middleware/authMiddleware');
const { checkAccountStatus } = require('../middleware/authMiddleware');
const { sendOtp, verifyOtp } = require('../controllers/phoneVerificationController');

const sendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many OTP requests. Please try again in 15 minutes.' },
});

const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many verification attempts. Please try again in 15 minutes.' },
});

router.post('/send', verifyToken, checkAccountStatus, sendOtpLimiter, sendOtp);
router.post('/verify', verifyToken, checkAccountStatus, verifyOtpLimiter, verifyOtp);

module.exports = router;
