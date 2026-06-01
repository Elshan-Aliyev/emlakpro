const Message = require('../models/Message');

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY  = 24 * MS_PER_HOUR;

// ─── Limits ───────────────────────────────────────────────────────────────────
const HOURLY_INQUIRY_CAP   = 10;   // distinct properties per hour
const DAILY_INQUIRY_CAP    = 40;   // distinct properties per day
const RESEND_COOLDOWN_MS   = 24 * MS_PER_HOUR;  // same property re-inquiry window
const COPY_PASTE_THRESHOLD = 5;    // identical message prefix across N inquiries in 1h

/**
 * Normalise message text for copy-paste detection.
 * Compares only the first 80 chars after stripping whitespace to catch
 * users who slightly edit the end of a templated message.
 */
function normaliseForCopyDetect(text) {
  return text.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 80);
}

/**
 * Check whether a user is allowed to send an inquiry right now.
 *
 * Returns:
 *   { allowed: true }
 *   { allowed: false, reason: 'already_sent'|'hourly_limit'|'daily_limit'|'copy_paste' }
 *
 * Keeps UX language vague — callers should NOT expose the specific reason to users.
 */
async function checkInquiryAllowed(userId, propertyId, messageText) {
  const now      = Date.now();
  const oneHour  = new Date(now - MS_PER_HOUR);
  const oneDay   = new Date(now - MS_PER_DAY);
  const cooldown = new Date(now - RESEND_COOLDOWN_MS);

  // ── Check 1: Already sent to this property within the cooldown window ─────
  const prior = await Message.findOne({
    sender:   userId,
    property: propertyId,
    createdAt: { $gte: cooldown },
  }).select('_id').lean();

  if (prior) {
    return { allowed: false, reason: 'already_sent' };
  }

  // ── Check 2: Hourly cap across all property inquiries ─────────────────────
  const hourlyCount = await Message.countDocuments({
    sender:   userId,
    property: { $exists: true, $ne: null },
    createdAt: { $gte: oneHour },
  });

  if (hourlyCount >= HOURLY_INQUIRY_CAP) {
    return { allowed: false, reason: 'hourly_limit' };
  }

  // ── Check 3: Daily cap ────────────────────────────────────────────────────
  const dailyCount = await Message.countDocuments({
    sender:   userId,
    property: { $exists: true, $ne: null },
    createdAt: { $gte: oneDay },
  });

  if (dailyCount >= DAILY_INQUIRY_CAP) {
    return { allowed: false, reason: 'daily_limit' };
  }

  // ── Check 4: Copy-paste / template spam ───────────────────────────────────
  // Only test non-trivial messages (the default template passes through).
  if (messageText && messageText.trim().length > 30) {
    const norm = normaliseForCopyDetect(messageText);

    const recentMessages = await Message.find({
      sender:   userId,
      property: { $exists: true, $ne: null },
      createdAt: { $gte: oneHour },
    })
      .select('content')
      .lean();

    const identicalCount = recentMessages.filter((m) => {
      const n = normaliseForCopyDetect(m.content || '');
      return n === norm;
    }).length;

    if (identicalCount >= COPY_PASTE_THRESHOLD) {
      return { allowed: false, reason: 'copy_paste' };
    }
  }

  return { allowed: true };
}

module.exports = { checkInquiryAllowed };
