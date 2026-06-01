// Deterministic property intelligence — no LLM, no hallucination
// All output is derived from fields provably present in the property object.

const FURNISHING_LABELS = {
  furnished:       'furnished',
  'semi-furnished':'semi-furnished',
  unfurnished:     'unfurnished',
};

const VIEW_LABELS = {
  sea:      'sea views',
  mountain: 'mountain views',
  city:     'city views',
  garden:   'garden views',
  park:     'park views',
  pool:     'pool views',
};

const CONDITION_LABELS = {
  'new-construction': 'new construction',
  renovation:         'recently renovated',
  'good-condition':   'well maintained',
};

// ── Property summary ───────────────────────────────────────────────────────────
// Builds a single readable sentence from provably present property fields.
// Never invents details. Returns null if not enough data.

export const generatePropertySummary = (property) => {
  if (!property) return null;

  const parts = [];

  // Condition / construction first (adjective-like)
  if (property.constructionStatus && CONDITION_LABELS[property.constructionStatus]) {
    parts.push(CONDITION_LABELS[property.constructionStatus]);
  }

  // Bedrooms + type
  const typeLabel = property.propertyType
    ? property.propertyType.replace(/-/g, ' ')
    : null;

  if (property.bedrooms > 0 && typeLabel) {
    parts.push(`${property.bedrooms}-bedroom ${typeLabel}`);
  } else if (property.bedrooms > 0) {
    parts.push(`${property.bedrooms}-bedroom property`);
  } else if (typeLabel) {
    parts.push(typeLabel);
  }

  if (parts.length === 0) return null;

  // View
  if (property.viewType && VIEW_LABELS[property.viewType]) {
    parts.push(`with ${VIEW_LABELS[property.viewType]}`);
  }

  // Furnishing
  if (property.furnishing && FURNISHING_LABELS[property.furnishing]) {
    parts.push(`(${FURNISHING_LABELS[property.furnishing]})`);
  }

  // Location
  const loc =
    (typeof property.location === 'string' ? property.location : null) ||
    property.location?.city || property.city || property.address?.city || null;
  if (loc) parts.push(`in ${loc}`);

  // Metro proximity
  if (property.nearestMetro) {
    parts.push(`near ${property.nearestMetro} metro`);
  } else if (property.nearby?.metro) {
    parts.push('near metro access');
  }

  // Freshness suffix
  if (property.lastConfirmedAvailableAt) {
    const days = Math.floor(
      (Date.now() - new Date(property.lastConfirmedAvailableAt).getTime()) / 86_400_000
    );
    if (days <= 7) parts.push('— availability recently confirmed');
  }

  const sentence = parts.join(' ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
};

// ── Market insights ────────────────────────────────────────────────────────────
// Returns an array of { type, text } objects.
// Uses cautious, probabilistic language — "appears", "likely", "commonly".

export const generateMarketInsights = (property, allProperties = []) => {
  if (!property) return [];

  const insights = [];
  const now = Date.now();

  // ── Price vs. comparables ─────────────────────────────────────────────────
  if (allProperties.length >= 4 && property.price && property.builtUpArea) {
    const comps = allProperties.filter(
      p =>
        p._id !== property._id &&
        p.price &&
        p.builtUpArea &&
        p.propertyType === property.propertyType &&
        Math.abs(p.builtUpArea - property.builtUpArea) < property.builtUpArea * 0.45
    );
    if (comps.length >= 3) {
      const avgPerM2 = comps.reduce((s, p) => s + p.price / p.builtUpArea, 0) / comps.length;
      const thisPerM2 = property.price / property.builtUpArea;
      const ratio = thisPerM2 / avgPerM2;
      if (ratio < 0.88) {
        insights.push({
          type: 'value',
          text: 'Priced below the area average for comparable properties.',
        });
      } else if (ratio > 1.18) {
        insights.push({
          type: 'premium',
          text: 'Listed above the area average — likely reflects condition, views, or location.',
        });
      }
    }
  }

  // ── Availability freshness ────────────────────────────────────────────────
  if (property.lastConfirmedAvailableAt) {
    const days = Math.floor(
      (now - new Date(property.lastConfirmedAvailableAt).getTime()) / 86_400_000
    );
    if (days <= 3) {
      insights.push({ type: 'fresh', text: 'Availability confirmed in the last 3 days.' });
    } else if (days <= 7) {
      insights.push({ type: 'fresh', text: 'Availability confirmed this week.' });
    }
  }

  // ── Listing age ───────────────────────────────────────────────────────────
  if (property.createdAt) {
    const days = Math.floor(
      (now - new Date(property.createdAt).getTime()) / 86_400_000
    );
    if (days <= 3) {
      insights.push({ type: 'new', text: 'New to the market.' });
    } else if (days > 60) {
      const months = Math.round(days / 30);
      insights.push({
        type: 'age',
        text: `Listed for approximately ${months} month${months !== 1 ? 's' : ''} — owner may be open to discussion.`,
      });
    }
  }

  // ── Owner responsiveness ──────────────────────────────────────────────────
  const responseH = property.ownerId?.averageResponseTimeHours;
  const respRate  = property.ownerId?.responseRate;
  if (responseH != null && responseH < 4 && respRate != null && respRate >= 70) {
    insights.push({ type: 'responsive', text: 'Owner typically responds within a few hours.' });
  } else if (responseH != null && responseH < 12) {
    insights.push({ type: 'responsive', text: 'Owner appears to be actively engaged.' });
  }

  // ── Supply signal ─────────────────────────────────────────────────────────
  if (allProperties.length >= 2 && property.propertyType) {
    const sameType = allProperties.filter(p => p.propertyType === property.propertyType);
    if (sameType.length <= 3 && allProperties.length >= 5) {
      insights.push({
        type: 'scarce',
        text: `Limited ${property.propertyType.replace(/-/g, ' ')} inventory currently visible in this area.`,
      });
    }
  }

  return insights.slice(0, 3);
};

// ── Single-signal insight for card display ────────────────────────────────────
// Returns a short string (1 insight) or null.
// Priority order: freshness → new → responsiveness → quality → popularity

export const getAiInsightRich = (property) => {
  if (!property) return null;

  const now       = Date.now();
  const created   = property.createdAt
    ? new Date(property.createdAt).getTime()  : null;
  const confirmed = property.lastConfirmedAvailableAt
    ? new Date(property.lastConfirmedAvailableAt).getTime() : null;
  const responseH = property.ownerId?.averageResponseTimeHours;
  const respRate  = property.ownerId?.responseRate;
  const quality   = property.qualityScore || 0;
  const agent     = property.agentScore   || 0;
  const isRental  = property.listingStatus === 'for-rent';

  if (confirmed) {
    const days = Math.floor((now - confirmed) / 86_400_000);
    if (days === 0) return isRental ? 'Confirmed available today' : 'Updated today';
    if (days <= 3)  return 'Confirmed available recently';
    if (days <= 7)  return 'Availability confirmed this week';
  }

  if (created) {
    const days = Math.floor((now - created) / 86_400_000);
    if (days === 0) return 'Listed today';
    if (days <= 2)  return 'New listing';
    if (days <= 5)  return 'New to the market';
  }

  if (responseH != null && responseH < 2 && respRate != null && respRate >= 70)
    return 'Owner responds quickly';
  if (responseH != null && responseH < 4 && respRate != null && respRate >= 70)
    return 'Owner typically responds within hours';
  if (quality >= 85 || agent >= 85) return 'Well-regarded in this area';
  if (quality >= 70) return isRental ? 'Popular rental this week' : 'Popular among buyers this week';
  if (respRate != null && respRate >= 80) return 'Active owner';
  return null;
};

// ── Area insight — contextual signal derived from visible property set ────────
// Requires ≥8 properties to be statistically meaningful. Returns null otherwise.

export const getAreaInsight = (properties) => {
  if (!properties || properties.length < 8) return null;

  const total      = properties.length;
  const forRent    = properties.filter(p => p.listingStatus === 'for-rent').length;
  const forSale    = properties.filter(p => p.listingStatus === 'for-sale').length;
  const with3Plus  = properties.filter(p => (p.bedrooms || 0) >= 3).length;
  const newBuilds  = properties.filter(p => ['new-building', 'new-project'].includes(p.propertyType)).length;
  const withPools  = properties.filter(p => p.swimmingPool || p.sharedPool).length;

  if (forRent / total > 0.72)    return 'Active rental area';
  if (with3Plus / total > 0.55)  return 'Popular with families';
  if (newBuilds / total > 0.50)  return 'New development area';
  if (withPools / total > 0.15)  return 'Premium residential area';
  if (forSale / total > 0.85)    return 'Mostly for-sale listings';
  return null;
};

// ── Primary trust signal for card display ─────────────────────────────────────
// Returns the single highest-priority verified trust signal as a short string.
// Rental: freshness > responsiveness > phone > ownership
// Sale:   ownership > phone > freshness > responsiveness

export const getPrimaryTrustSignal = (property) => {
  if (!property) return null;

  const ownershipOk = property.ownershipVerificationStatus === 'verified';
  const phoneOk     = property.ownerId?.phoneVerified;
  const responseH   = property.ownerId?.averageResponseTimeHours;
  const isRental    = property.listingStatus === 'for-rent';

  const freshnessDays = (() => {
    const ref = property.lastConfirmedAvailableAt || property.lastOwnerActivityAt;
    if (!ref) return null;
    return Math.floor((Date.now() - new Date(ref)) / 86_400_000);
  })();

  if (isRental) {
    if (freshnessDays !== null && freshnessDays <= 7) return 'Available this week';
    if (responseH != null && responseH < 4) return 'Owner responds quickly';
    if (phoneOk) return 'Phone verified';
    if (ownershipOk) return 'Ownership verified';
  } else {
    if (ownershipOk) return 'Ownership verified';
    if (phoneOk) return 'Phone verified';
    if (freshnessDays !== null && freshnessDays <= 7) return 'Updated this week';
    if (responseH != null && responseH < 6) return 'Owner responding';
  }
  return null;
};
