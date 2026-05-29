'use strict';

const { PROMOTION_MULTIPLIERS } = require('../promotion/constants');

/**
 * Compute organic and final rank scores for a listing.
 *
 * Organic score (0–10):
 *   freshness          — up to 3 pts, decays linearly to 0 at 60 days
 *   ownershipVerified  — 2 pts
 *   isApproved         — 1 pt
 *   imageBonus         — up to 1 pt (saturates at 8 images)
 *   qualityBonus       — up to 2 pts (from stored qualityScore, max raw ~11)
 *   engagement         — up to 1 pt (views + inquiries, capped)
 *   searchPenalty      — deduction (0.5 × penalty value)
 *
 * finalScore = organicScore × promotionMultiplier
 *
 * Multipliers (from constants.js):
 *   FREE      = ×1.00
 *   FEATURED  = ×1.15  (light search presence + homepage featured section)
 *   PREMIUM   = ×1.50
 *   SPOTLIGHT = ×3.00
 *
 * Multiplier only applied when promotion window is currently active
 * (promotionStartDate <= now <= promotionEndDate; null = open-ended).
 *
 * @param {Object} listing — plain object or Mongoose document (.toObject())
 * @returns {{ organicScore: number, finalScore: number }}
 */
function getListingRankScore(listing) {
  // ── Freshness ──────────────────────────────────────────────────────────────
  const ageMs          = Date.now() - new Date(listing.createdAt || 0).getTime();
  const ageDays        = ageMs / 86_400_000;
  const freshnessScore = Math.max(0, 1 - ageDays / 60); // 1.0 → 0.0 over 60 days

  // ── Trust signals ──────────────────────────────────────────────────────────
  const ownershipVerified = listing.ownershipVerificationStatus === 'approved' ? 1 : 0;
  const isApproved        = listing.isApproved ? 1 : 0;
  const imageBonus        = Math.min((listing.images?.length || 0) / 8, 1); // saturates at 8

  // ── Quality (pre-computed by listingQuality.js, max raw ~11) ──────────────
  const qualityBonus = Math.min((listing.qualityScore || 0) / 11, 1) * 2; // up to 2 pts

  // ── Engagement ────────────────────────────────────────────────────────────
  const views          = listing.views || listing.viewsCount || 0;
  const inquiries      = listing.inquiryCount || 0;
  const engagementScore = Math.min(views * 0.01 + inquiries * 0.1, 1); // cap at 1

  // ── Search penalty ────────────────────────────────────────────────────────
  const penalty = listing.searchPenalty || 0;

  // ── Organic score (0–10) ──────────────────────────────────────────────────
  const organicScore = Math.max(0,
    freshnessScore * 3 +
    ownershipVerified * 2 +
    isApproved        * 1 +
    imageBonus        * 1 +
    qualityBonus          +  // up to 2
    engagementScore   * 1 -
    penalty           * 0.5
  );

  // ── Promotion multiplier ──────────────────────────────────────────────────
  const tier       = listing.promotionTier || 'FREE';
  const multiplier = PROMOTION_MULTIPLIERS[tier] ?? 1.0;

  const now     = new Date();
  const startOk = !listing.promotionStartDate || new Date(listing.promotionStartDate) <= now;
  const endOk   = !listing.promotionEndDate   || new Date(listing.promotionEndDate)   >= now;
  const isActive = listing.isPromoted && startOk && endOk;

  const effectiveMultiplier = isActive ? multiplier : 1.0;
  const finalScore          = organicScore * effectiveMultiplier;

  return {
    organicScore: Math.round(organicScore * 100) / 100,
    finalScore:   Math.round(finalScore   * 100) / 100,
  };
}

module.exports = { getListingRankScore };
