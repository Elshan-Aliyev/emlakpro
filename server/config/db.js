'use strict';
const mongoose = require('mongoose');

// In serverless runtimes (Vercel), the module cache persists across invocations
// within the same warm instance but is thrown away on cold starts. Caching the
// promise means multiple parallel requests on the same warm instance share one
// connection rather than racing to open duplicates.
let _connectionPromise = null;

const connectDB = async () => {
  // Already connected — reuse the live connection.
  if (mongoose.connection.readyState >= 1) return;

  // Already connecting (parallel cold-start race) — await the shared promise.
  if (_connectionPromise) return _connectionPromise;

  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/realestate_app';

  _connectionPromise = mongoose
    .connect(uri)
    .then((conn) => {
      console.log('[db] Mongo connected:', conn.connection.name);
    })
    .catch((err) => {
      console.error('[db] MongoDB connection failed:', err.message);
      _connectionPromise = null; // allow retry on next invocation
      process.exit(1);
    });

  return _connectionPromise;
};

module.exports = connectDB;
