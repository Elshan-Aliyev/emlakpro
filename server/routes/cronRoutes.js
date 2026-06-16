'use strict';

const express = require('express');
const router  = express.Router();
const { expireStalePromotions } = require('../lib/promotion/expirePromotions');

// ─── POST /api/cron/expire-promotions ────────────────────────────────────────
// Called daily by Vercel Cron (vercel.json).
// Vercel sends: Authorization: Bearer <CRON_SECRET>
// Reject all other callers — this route must never be publicly triggerable.
router.post('/expire-promotions', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('[cron] CRON_SECRET is not set — refusing to run');
    return res.status(500).json({ message: 'Cron secret not configured.' });
  }

  const auth = req.headers['authorization'];
  if (auth !== `Bearer ${secret}`) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }

  try {
    const count = await expireStalePromotions();
    console.log(`[cron] expire-promotions: reset ${count} listing(s)`);
    res.json({ ok: true, expired: count, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[cron] expire-promotions error:', err.message);
    res.status(500).json({ message: 'Cron job failed.' });
  }
});

module.exports = router;
