'use strict';

const express = require('express');
const router  = express.Router();
const {
  getSpotlightListings,
  getFeaturedListings,
  getNewListings,
  getRecentListings,
} = require('../lib/promotion/homepagePlacement');

/**
 * GET /api/home/sections
 * Public — no auth required.
 * Returns all four homepage sections in parallel.
 */
router.get('/sections', async (req, res) => {
  try {
    const [spotlight, featured, newListings, recent] = await Promise.all([
      getSpotlightListings(),
      getFeaturedListings(),
      getNewListings({ limit: 12 }),
      getRecentListings({ limit: 8 }),
    ]);

    res.json({ spotlight, featured, newListings, recent });
  } catch (err) {
    console.error('[homeRoutes] /sections error:', err);
    res.status(500).json({ message: 'Failed to load homepage sections' });
  }
});

module.exports = router;
