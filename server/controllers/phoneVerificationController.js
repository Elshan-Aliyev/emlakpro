const User = require('../models/User');
const { client, verifyServiceSid, isConfigured } = require('../config/twilio');

// E.164: + followed by 7–15 digits
const E164 = /^\+[1-9]\d{6,14}$/;

// 60-second per-user cooldown between OTP sends
const SEND_COOLDOWN_MS = 60 * 1000;

exports.sendOtp = async (req, res) => {
  if (!isConfigured) {
    return res.status(503).json({ message: 'Phone verification is not enabled on this server.' });
  }
  try {
    const { phone } = req.body;

    if (!phone || !E164.test(phone)) {
      return res.status(400).json({
        message: 'Phone number must be in E.164 format (e.g. +994501234567).',
      });
    }

    const user = await User.findById(req.user.id).select('phone phoneVerified phoneOtpSentAt');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (user.phoneVerified && user.phone === phone) {
      return res.status(400).json({ message: 'This number is already verified.' });
    }

    // Per-user cooldown
    if (user.phoneOtpSentAt) {
      const elapsed = Date.now() - user.phoneOtpSentAt.getTime();
      if (elapsed < SEND_COOLDOWN_MS) {
        const retryAfter = Math.ceil((SEND_COOLDOWN_MS - elapsed) / 1000);
        return res.status(429).json({
          message: `Please wait ${retryAfter} seconds before requesting another code.`,
          retryAfter,
        });
      }
    }

    // Dispatch OTP via Twilio Verify
    await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({ to: phone, channel: 'sms' });

    // Record the phone number and send timestamp
    await User.findByIdAndUpdate(req.user.id, {
      phone,
      phoneOtpSentAt: new Date(),
    });

    res.json({ message: 'Verification code sent.' });
  } catch (err) {
    console.error('phoneVerification.sendOtp error:', err);

    // Twilio error codes: https://www.twilio.com/docs/api/errors
    if (err.code === 60200) {
      return res.status(400).json({ message: 'Invalid phone number.' });
    }
    if (err.code === 60203) {
      return res.status(429).json({ message: 'Max send attempts reached. Please try again later.' });
    }

    res.status(500).json({ message: 'Failed to send verification code. Please try again.' });
  }
};

exports.verifyOtp = async (req, res) => {
  if (!isConfigured) {
    return res.status(503).json({ message: 'Phone verification is not enabled on this server.' });
  }
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ message: 'Phone and code are required.' });
    }
    if (!E164.test(phone)) {
      return res.status(400).json({ message: 'Invalid phone format.' });
    }
    if (!/^\d{4,8}$/.test(String(code).trim())) {
      return res.status(400).json({ message: 'Invalid code format.' });
    }

    // Validate against Twilio Verify
    const check = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: phone, code: String(code).trim() });

    if (check.status !== 'approved') {
      return res.status(400).json({ message: 'Incorrect code. Please try again.' });
    }

    // Mark phone verified
    await User.findByIdAndUpdate(req.user.id, {
      phone,
      phoneVerified:   true,
      phoneVerifiedAt: new Date(),
    });

    res.json({ message: 'Phone number verified successfully.' });
  } catch (err) {
    console.error('phoneVerification.verifyOtp error:', err);

    if (err.code === 60202) {
      // Max check attempts reached — Twilio cancels the verification
      return res.status(400).json({
        message: 'Too many incorrect attempts. Please request a new code.',
      });
    }
    if (err.code === 20404) {
      // Verification not found or expired (Twilio default TTL: 10 minutes)
      return res.status(400).json({
        message: 'Code expired or not found. Please request a new code.',
      });
    }

    res.status(500).json({ message: 'Verification failed. Please try again.' });
  }
};
