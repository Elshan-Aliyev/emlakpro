const Property = require('../models/Property');
const User = require('../models/User');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ─── Brokerage / agent language patterns ─────────────────────────────────────
// Patterns that suggest undisclosed brokerage activity from a personal account.
// Tests against combined title + description text.
const BROKER_PATTERNS = [
  /\bcommission\b/i,
  /\bbrokerage\b/i,
  /\breal estate agent\b/i,
  /\blisting agent\b/i,
  /\bexclusive listing\b/i,
  /\bco-agent\b/i,
  /\bselling agent\b/i,
  /\bbuyer(?:'?s)? agent\b/i,
  /\bMLS\b/,
  /\bmultiple listing service\b/i,
  /\bcall (?:me|us|our|the) (?:agent|office|team|broker)\b/i,
  /\bour (?:listings|portfolio|properties)\b/i,
  /\bwe (?:offer|sell|list|have)\b/i,
  // Azerbaijani terms
  /\bvasitəçi\b/i,    // "intermediary / broker"
  /\bagentlik\b/i,    // "agency"
  /\bəmlak şirkəti\b/i,
  /\bkomissiya\b/i,   // "commission"
];

/**
 * Score agent/broker behavior signals for a newly created or updated listing.
 * Runs async after save — does NOT block the response.
 *
 * Returns { score: number, signals: string[] }
 *  - score 0   → no signals
 *  - score 1–3 → minor signals, flag for later review
 *  - score 4+  → elevated suspicion, bump moderation priority
 */
async function detectAgentSignals(propertyId, ownerId) {
  const signals = [];
  let score = 0;

  const [property, owner] = await Promise.all([
    Property.findById(propertyId)
      .select('title description city district coordinates listingBadge price')
      .lean(),
    User.findById(ownerId)
      .select('phone role accountType createdAt')
      .lean(),
  ]);

  if (!property || !owner) return { score: 0, signals: [] };

  // No need to flag declared professionals — they are already labeled correctly.
  if (['realtor', 'corporate'].includes(owner.role)) return { score: 0, signals: [] };

  // ── Signal 1: High listing velocity ──────────────────────────────────────────
  const sevenDaysAgo = new Date(Date.now() - 7 * MS_PER_DAY);
  const recentCount = await Property.countDocuments({
    ownerId,
    createdAt: { $gte: sevenDaysAgo },
  });
  if (recentCount > 7) {
    signals.push(`Listing burst: ${recentCount} listings in 7 days`);
    score += 4;
  } else if (recentCount > 4) {
    signals.push(`Elevated velocity: ${recentCount} listings in 7 days`);
    score += 2;
  }

  // ── Signal 2: Brokerage language in description/title ─────────────────────
  const text = `${property.title || ''} ${property.description || ''}`;
  const matchCount = BROKER_PATTERNS.filter((p) => p.test(text)).length;
  if (matchCount >= 2) {
    signals.push('Multiple brokerage phrases in listing text');
    score += 3;
  } else if (matchCount === 1) {
    signals.push('Brokerage language detected in listing text');
    score += 1;
  }

  // ── Signal 3: Phone shared across multiple accounts ───────────────────────
  if (owner.phone) {
    const sharedPhoneCount = await User.countDocuments({
      phone: owner.phone,
      _id: { $ne: ownerId },
    });
    if (sharedPhoneCount >= 2) {
      signals.push(`Phone number linked to ${sharedPhoneCount + 1} accounts`);
      score += 3;
    } else if (sharedPhoneCount === 1) {
      signals.push('Phone number shared with another account');
      score += 1;
    }
  }

  // ── Signal 4: Volume concentration in one city ────────────────────────────
  if (property.city) {
    const cityCount = await Property.countDocuments({ ownerId, city: property.city });
    if (cityCount >= 8) {
      signals.push(`${cityCount} listings concentrated in ${property.city}`);
      score += 2;
    }
  }

  // ── Signal 5: Account created very recently + immediate high volume ────────
  const accountAgeDays = (Date.now() - new Date(owner.createdAt).getTime()) / MS_PER_DAY;
  if (accountAgeDays < 14 && recentCount >= 3) {
    signals.push('New account with rapid listing activity');
    score += 2;
  }

  return { score, signals };
}

/**
 * Persist agent detection results to the property and (if score is high)
 * bump the moderation priority. Fire-and-forget safe.
 */
async function detectAndStoreAgentSignals(propertyId, ownerId) {
  try {
    const { score, signals } = await detectAgentSignals(propertyId, ownerId);

    const update = { agentScore: score, agentSignals: signals };

    // Merge agent score into moderation priority if elevated
    if (score >= 4) {
      await Property.findByIdAndUpdate(propertyId, {
        ...update,
        $inc: { moderationPriority: 2 },
        $addToSet: { moderationReasons: 'Agent behavior detected' },
      });
    } else {
      await Property.findByIdAndUpdate(propertyId, update);
    }

    if (score > 0) {
      console.log(`[agentDetection] ${propertyId} score=${score}: ${signals.join('; ')}`);
    }
  } catch (err) {
    console.error('[agentDetection] error:', err.message);
  }
}

module.exports = { detectAndStoreAgentSignals };
