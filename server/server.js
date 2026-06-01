const express = require('express');
const cors = require('cors');
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

connectDB();

// ─── Auth routes with brute-force protection ─────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);

// ─── Public read endpoints — scraping protection ──────────────────────────────
app.use('/api/properties', readLimiter, propertyRoutes);
app.use('/api/articles',   readLimiter, articleRoutes);

// ─── Authenticated / write routes — general write limiter ────────────────────
app.use('/api/users',              writeLimiter, userRoutes);
app.use('/api/admin',              adminRoutes);
app.use('/api/admin/abuse',        adminAbuseRoutes);
app.use('/api/images',             writeLimiter, imageRoutes);
app.use('/api/settings',           writeLimiter, settingsRoutes);
app.use('/api/messages',           writeLimiter, messageRoutes);
app.use('/api/verification',       verificationRoutes);
app.use('/api/reviews',            writeLimiter, reviewRoutes);
app.use('/api/phone-verification', phoneVerificationRoutes);
app.use('/api/reports',            reportRoutes);
app.use('/api/ownership',          ownershipRoutes);
app.use('/api/listing-health',     listingHealthRoutes);

app.get('/', (req, res) => res.send('EmlakPro API'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`[server] listening on port ${PORT}`));
