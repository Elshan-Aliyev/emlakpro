const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// ─── Shared key generator ─────────────────────────────────────────────────────
// Prefer authenticated user ID; fall back to the library's IPv6-safe IP key.
const userOrIpKey = (req) => (req.user?.id ? `u:${req.user.id}` : ipKeyGenerator(req));

// ─── Auth endpoints ───────────────────────────────────────────────────────────
// Login / register attempts — tight to block brute-force and mass account creation.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,          // 15 min
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator,
  message: { message: 'Too many attempts. Please try again in 15 minutes.' },
  skipSuccessfulRequests: false,
});

// ─── Listing creation ─────────────────────────────────────────────────────────
// Express-rate-limit layer — acts as a hard ceiling.
// The trust-based quota inside accountTrust.js enforces per-user daily limits
// with account-age and verification awareness.
const listingCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,          // 1 hour window
  max: 15,                            // absolute ceiling per user/IP
  keyGenerator: userOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Listing creation limit reached. Please try again later.' },
});

// ─── Inquiry submission ───────────────────────────────────────────────────────
const inquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,          // 1 hour
  max: 25,                            // absolute ceiling; inquiryGuard tightens per-user
  keyGenerator: userOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'You are sending too many inquiries. Please wait before trying again.' },
});

// ─── Report submission ────────────────────────────────────────────────────────
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  keyGenerator: userOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Report submission limit reached. Please wait before submitting more.' },
});

// ─── General write operations ─────────────────────────────────────────────────
// Catches any non-GET request that doesn't already have a specific limiter.
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  keyGenerator: userOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET',
  message: { message: 'Too many requests. Please slow down.' },
});

// ─── Public read endpoints ────────────────────────────────────────────────────
// Protect property listing search from mass-scraping.
const readLimiter = rateLimit({
  windowMs: 60 * 1000,               // 1 min
  max: 120,                          // 2 req/sec sustained
  keyGenerator: ipKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => false,
  message: { message: 'Request rate exceeded. Please slow down.' },
});

module.exports = {
  authLimiter,
  listingCreateLimiter,
  inquiryLimiter,
  reportLimiter,
  writeLimiter,
  readLimiter,
};
