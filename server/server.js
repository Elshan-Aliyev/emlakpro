const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = require('./config/db');
const { authLimiter, writeLimiter, readLimiter } = require('./middleware/rateLimiter');

const authRoutes           = require('./routes/authRoutes');
const propertyRoutes       = require('./routes/propertyRoutes');
const userRoutes           = require('./routes/userRoutes');
const adminRoutes          = require('./routes/adminRoutes');
const adminAbuseRoutes     = require('./routes/adminAbuseRoutes');
const imageRoutes          = require('./routes/imageRoutes');
const settingsRoutes       = require('./routes/settingsRoutes');
const messageRoutes        = require('./routes/messageRoutes');
const verificationRoutes   = require('./routes/verificationRoutes');
const articleRoutes        = require('./routes/articleRoutes');
const reviewRoutes         = require('./routes/reviewRoutes');
const phoneVerificationRoutes = require('./routes/phoneVerificationRoutes');
const reportRoutes         = require('./routes/reportRoutes');
const ownershipRoutes      = require('./routes/ownershipRoutes');
const listingHealthRoutes  = require('./routes/listingHealthRoutes');
const homeRoutes           = require('./routes/homeRoutes');
const promotionRequestRoutes = require('./routes/promotionRequestRoutes');
const propertyReviewRoutes   = require('./routes/propertyReviewRoutes');
const cronRoutes             = require('./routes/cronRoutes');

const app = express();

// ─── Trust proxy — required for correct req.ip behind Nginx / Railway / Heroku ─
// Without this, all IPs appear as the proxy's address, collapsing rate-limit buckets.
app.set('trust proxy', 1);

// ─── Security headers (no external dependency needed) ────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  next();
});

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Allow configured origins; fall back to localhost for local development.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'];

app.use(cors({
  origin: (origin, cb) => {
    // Allow non-browser requests (Postman, server-to-server) and listed origins
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ─── Body parsing — size limits prevent JSON bomb DoS ─────────────────────────
app.use(express.json({ limit: '2mb' }));

// ─── Required env vars — fail fast before connecting to DB ──────────────────
const REQUIRED_ENV = ['JWT_SECRET', 'MONGO_URI', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const _missingEnv = REQUIRED_ENV.filter(k => !process.env[k]);
if (_missingEnv.length) {
  console.error(`[startup] Missing required env vars: ${_missingEnv.join(', ')}`);
  process.exit(1);
}

connectDB();

// ─── Auth routes with brute-force protection ─────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);

// ─── Public read endpoints — scraping protection ──────────────────────────────
app.use('/api/properties', readLimiter, propertyRoutes);
app.use('/api/articles',   readLimiter, articleRoutes);
app.use('/api/home',       readLimiter, homeRoutes);

// ─── Authenticated / write routes — general write limiter ────────────────────
app.use('/api/users',              writeLimiter, userRoutes);
app.use('/api/admin',              writeLimiter, adminRoutes);
app.use('/api/admin/abuse',        writeLimiter, adminAbuseRoutes);
app.use('/api/images',             writeLimiter, imageRoutes);
app.use('/api/settings',           writeLimiter, settingsRoutes);
app.use('/api/messages',           writeLimiter, messageRoutes);
app.use('/api/verification',       verificationRoutes);
app.use('/api/reviews',            writeLimiter, reviewRoutes);
app.use('/api/phone-verification', phoneVerificationRoutes);
app.use('/api/reports',            reportRoutes);
app.use('/api/ownership',          ownershipRoutes);
app.use('/api/listing-health',     listingHealthRoutes);
app.use('/api/promotion-requests', promotionRequestRoutes);
app.use('/api/property-reviews',  propertyReviewRoutes);
app.use('/api/cron',              cronRoutes);

app.get('/', (req, res) => res.send('EmlakPro API'));

// ─── Health check — used by uptime monitors and Vercel cron pre-flight ────────
app.get('/api/health', async (req, res) => {
  const mongoState = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const mongo = mongoState[mongoose.connection.readyState] ?? 'unknown';

  // Lightweight Supabase ping — list buckets (already authenticated via service key)
  let supabase = 'ok';
  try {
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await sb.storage.listBuckets();
    if (error) supabase = 'error';
  } catch {
    supabase = 'error';
  }

  res.status(200).json({
    status:    'ok',
    mongo,
    supabase,
    version:   process.env.npm_package_version || '1.0.0-beta',
    uptime:    Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Not found.' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';
  console.error(`[error] ${req.method} ${req.path}:`, err.message);
  res.status(err.status || 500).json({
    message: isDev ? err.message : 'Internal server error.',
    ...(isDev && { stack: err.stack }),
  });
});

// Local dev: start the HTTP server. Vercel imports this module directly and
// calls the exported handler — it never reaches app.listen().
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`[server] listening on port ${PORT}`));
}

module.exports = app;
