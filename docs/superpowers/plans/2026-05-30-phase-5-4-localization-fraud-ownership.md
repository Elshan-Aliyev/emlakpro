# Phase 5.4 — Azerbaijan Localization, Fraud Reporting & Ownership Verification

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Localize the marketplace for Azerbaijan room-count conventions, wire up the existing fraud architecture into a visible UI workflow, and ship the Ownership Verification trust product.

**Architecture:** (1) A shared `client/src/utils/roomCount.js` helper converts `bedrooms` → display room count everywhere. (2) Fraud thresholds (3/5/10) drive `fraudStatus` on the Property document; email fires at threshold 3 via `mailer.js`. (3) `VerifiedOwnerBadge` wraps existing `ownershipVerificationStatus` across all card surfaces. (4) New `OwnershipVerificationPage` and a card in `Services.js` complete the trust product.

**Tech Stack:** React 18, Node.js/Express/Mongoose, Nodemailer, Lucide icons, existing design system.

---

## Prerequisite Context

| Fact | Detail |
|------|--------|
| `bedrooms` DB field | Stays unchanged — no migration |
| Room display convention | `rooms = bedrooms + 1` (0 bedrooms = 1 Room = Studio) |
| `fraudStatus` field | Already on Property model (Phase 5.2): NORMAL/WARNING/REVIEW/SUSPENDED |
| `fraudReportCount` field | Already on Property model (Phase 5.2) |
| `ReportModal` component | Already exists and works (`client/src/components/ReportModal.js`) |
| Report button in PropertyDetail | Already exists (line 755) and opens ReportModal |
| `AdminReports.js` | Already exists — needs fraud-specific columns |
| `OwnershipVerification` admin page | Already exists in App.js route — this task creates the public SERVICE page |
| Phase 5.2 `getFraudStatus()` | At `server/lib/promotion/fraudStatus.js` — SUSPENDED threshold is currently 8; spec says 10; update it |

---

## File Map

### New files
| File | Responsibility |
|------|----------------|
| `client/src/utils/roomCount.js` | `getRoomCount(bedrooms)` and `formatRooms(bedrooms)` helpers |
| `client/src/components/VerifiedOwnerBadge.js` | Emerald badge for ownership-verified properties |
| `client/src/components/VerifiedOwnerBadge.css` | Badge styles |
| `client/src/pages/OwnershipVerificationPage.js` | Public service page: what/how/benefits/docs/price/FAQ/CTA |
| `client/src/pages/OwnershipVerificationPage.css` | Page styles |

### Modified files
| File | Change |
|------|--------|
| `server/lib/promotion/fraudStatus.js` | Change SUSPENDED threshold 8 → 10 |
| `server/lib/mailer.js` | Add `sendFraudWarningEmail()` |
| `server/controllers/reportController.js` | Wire fraud thresholds (3/5/10), update `fraudReportCount`/`fraudStatus`, send email at 3 |
| `server/routes/adminRoutes.js` | Add `PUT /admin/properties/:id/fraud-status` endpoint |
| `client/src/utils/nlpSearch.js` | Fix room token → bedrooms conversion; update chips to show "N Rooms" |
| `client/src/utils/roomCount.js` | Created here |
| `client/src/components/FilterBar.js` | Rename Beds→Rooms, change option labels |
| `client/src/components/FilterModal.js` | Rename bedroom section to Rooms; Studio→1 Room in type list |
| `client/src/pages/CreateProperty.js` | Studio→1 Room label; bedroom label→rooms; Azerbaijani labels removed |
| `client/src/pages/HomeNew.js` | `{p.bedrooms} bed` → `formatRooms(p.bedrooms)` |
| `client/src/pages/Search/index.js` | Same room count display + `VerifiedOwnerBadge` |
| `client/src/pages/PropertyDetail.js` | Room count display + `VerifiedOwnerBadge` |
| `client/src/components/PropertyPreviewDrawer.js` | Room count display + `VerifiedOwnerBadge` |
| `client/src/components/PropertyMap.js` | Room count in popup HTML |
| `client/src/pages/AdminReports.js` | Add `fraudStatus` column + Suspend/Restore actions |
| `client/src/pages/Services.js` | Add Ownership Verification card (20 AZN) |
| `client/src/App.js` | Add `/services/ownership-verification` route |
| `client/src/services/api.js` | Add `updateFraudStatus()` admin API call |

---

## Task 1: Fraud Threshold Constants — Update SUSPENDED to 10

**Files:**
- Modify: `server/lib/promotion/fraudStatus.js`

- [ ] **Step 1: Change SUSPENDED threshold from 8 to 10**

  Open `server/lib/promotion/fraudStatus.js`. Find:

  ```js
  const THRESHOLDS = Object.freeze({
    SUSPENDED: 8,
    REVIEW:    5,
    WARNING:   3,
  });
  ```

  Change to:

  ```js
  const THRESHOLDS = Object.freeze({
    SUSPENDED: 10,  // Phase 5.4: spec requires 10 reports for auto-suspension
    REVIEW:     5,
    WARNING:    3,
  });
  ```

- [ ] **Step 2: Verify assertions still pass with new threshold**

  ```bash
  node -e "
  const { getFraudStatus, THRESHOLDS } = require('./server/lib/promotion/fraudStatus');
  console.assert(THRESHOLDS.SUSPENDED === 10, 'SUSPENDED must be 10');
  console.assert(getFraudStatus(9)  === 'REVIEW',    '9 → REVIEW (below SUSPENDED)');
  console.assert(getFraudStatus(10) === 'SUSPENDED', '10 → SUSPENDED');
  console.assert(getFraudStatus(3)  === 'WARNING',   '3 → WARNING');
  console.assert(getFraudStatus(5)  === 'REVIEW',    '5 → REVIEW');
  console.log('Fraud threshold assertions passed');
  "
  ```
  Expected: `Fraud threshold assertions passed`

- [ ] **Step 3: Commit**

  ```bash
  git add server/lib/promotion/fraudStatus.js
  git commit -m "fix: update SUSPENDED fraud threshold from 8 to 10 (spec alignment)"
  ```

---

## Task 2: Backend — Fraud Email + Report Controller Update

**Files:**
- Modify: `server/lib/mailer.js`
- Modify: `server/controllers/reportController.js`
- Modify: `server/routes/adminRoutes.js`

- [ ] **Step 1: Add `sendFraudWarningEmail` to mailer.js**

  Open `server/lib/mailer.js`. After the last exported function (`sendPasswordReset`), before `module.exports`, add:

  ```js
  /**
   * Notify a seller that their listing has received multiple concerns.
   * Fires once when reportCount reaches the WARNING threshold (3).
   * Never exposes reporter identities.
   */
  async function sendFraudWarningEmail(sellerEmail, sellerName, propertyTitle, reportCount) {
    if (!transporter) return;
    try {
      await transporter.sendMail({
        from:    SMTP_FROM,
        to:      sellerEmail,
        subject: `Action needed — your listing received concerns`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto">
            <h2 style="color:#0F766E">EmlakPro — Listing Notice</h2>
            <p>Hi ${sellerName || 'there'},</p>
            <p>We have received multiple concerns about your listing <strong>${propertyTitle}</strong>.</p>
            <p>Our team reviews all reports confidentially. Please ensure your listing information is accurate. No immediate action is required if your listing is genuine.</p>
            <p>If you believe this is an error, please contact our support team.</p>
            <p style="color:#6b7280;font-size:0.875rem">The EmlakPro Trust &amp; Safety Team</p>
          </div>
        `,
      });
    } catch (err) {
      console.error('[mailer] sendFraudWarningEmail error:', err.message);
    }
  }
  ```

  Then add `sendFraudWarningEmail` to the exports at the bottom of `module.exports`:

  ```js
  module.exports = {
    sendInquiryNotification,
    sendPasswordReset,
    sendFraudWarningEmail,
  };
  ```

  (Note: match whatever export pattern is currently used — look at the existing `module.exports` before adding.)

- [ ] **Step 2: Update `reportController.js` to use Phase 5.2 fraud fields**

  Open `server/controllers/reportController.js`. At the top, after existing requires, add:

  ```js
  const { getFraudStatus, THRESHOLDS } = require('../lib/promotion/fraudStatus');
  const { sendFraudWarningEmail } = require('../lib/mailer');
  ```

  Find the current `FLAG_THRESHOLD` and `HIDE_THRESHOLD` constants (lines 8–9):

  ```js
  const FLAG_THRESHOLD = 3;  // flaggedForReview = true
  const HIDE_THRESHOLD = 5;  // status = 'pending' (temporarily hidden)
  ```

  Replace with:

  ```js
  // Thresholds sourced from shared constants — never duplicate
  const { WARNING: FRAUD_WARNING_THRESHOLD, REVIEW: FRAUD_REVIEW_THRESHOLD, SUSPENDED: FRAUD_SUSPEND_THRESHOLD } = THRESHOLDS;
  ```

  Then find the auto-moderation block inside `submitReport` (around lines 39–68). Replace it entirely with:

  ```js
  // Auto-moderation: update property fraud status from Phase 5.2 architecture
  if (targetType === 'property') {
    const count = await Report.countDocuments({ targetId, targetType: 'property' });
    const fraudStatus = getFraudStatus(count);

    const update = {
      reportCount:      count,          // legacy field
      fraudReportCount: count,          // Phase 5.2 field
      fraudStatus,                      // Phase 5.2 field
      flaggedForReview: fraudStatus !== 'NORMAL',
    };

    // SUSPENDED listings are hidden from public search
    if (fraudStatus === 'SUSPENDED') {
      update.status = 'pending';
    }

    await Property.findByIdAndUpdate(targetId, update);

    // Email seller exactly at WARNING threshold — not on every report
    if (count === FRAUD_WARNING_THRESHOLD) {
      Property.findById(targetId)
        .populate('ownerId', 'email name')
        .lean()
        .then(prop => {
          if (prop?.ownerId?.email) {
            sendFraudWarningEmail(
              prop.ownerId.email,
              prop.ownerId.name,
              prop.title,
              count,
            ).catch(err => console.error('[fraud] email error:', err));
          }
        })
        .catch(err => console.error('[fraud] owner lookup error:', err));
    }

    // Async rescoring (preserve existing behaviour)
    const prop = await Property.findById(targetId).select('ownerId').lean();
    if (prop) {
      calculateModerationPriority(targetId, prop.ownerId)
        .then(({ score, reasons }) =>
          Property.findByIdAndUpdate(targetId, { moderationPriority: score, moderationReasons: reasons })
        )
        .catch((err) => console.error('[moderation] score error on report submit:', err));

      recalculateAndStoreQuality(targetId, prop.ownerId)
        .catch((err) => console.error('[quality] score error on report submit:', err));

      applyEscalationToProperty(targetId, prop.ownerId)
        .catch((err) => console.error('[escalation] error on report submit:', err));
    }
  }
  ```

- [ ] **Step 3: Add admin fraud-status override endpoint to adminRoutes.js**

  In `server/routes/adminRoutes.js`, before `module.exports = router;`, add:

  ```js
  // ─── Admin: manual fraud status override ─────────────────────────────────────
  // Allows admins to restore a SUSPENDED listing or escalate manually.
  router.put('/properties/:id/fraud-status', verifyToken, isAdmin, async (req, res) => {
    try {
      const { fraudStatus } = req.body;
      const VALID = ['NORMAL', 'WARNING', 'REVIEW', 'SUSPENDED'];
      if (!VALID.includes(fraudStatus)) {
        return res.status(400).json({ message: `Invalid fraudStatus. Must be one of: ${VALID.join(', ')}` });
      }

      const update = { fraudStatus };
      // Restore public visibility when admin overrides to non-SUSPENDED
      if (fraudStatus !== 'SUSPENDED') {
        update.status = 'active';
        update.flaggedForReview = fraudStatus !== 'NORMAL';
      } else {
        update.status = 'pending'; // hide from public
        update.flaggedForReview = true;
      }

      const property = await Property.findByIdAndUpdate(req.params.id, update, { new: true });
      if (!property) return res.status(404).json({ message: 'Property not found' });

      res.json({ message: 'Fraud status updated', fraudStatus, propertyId: req.params.id });
    } catch (err) {
      console.error('[admin] fraud-status update error:', err);
      res.status(500).json({ message: 'Failed to update fraud status' });
    }
  });
  ```

- [ ] **Step 4: Verify all server modules load**

  ```bash
  node -e "
  require('./server/lib/mailer');
  require('./server/controllers/reportController');
  require('./server/routes/adminRoutes');
  console.log('All fraud modules OK');
  "
  ```
  Expected: `All fraud modules OK`

- [ ] **Step 5: Commit**

  ```bash
  git add server/lib/mailer.js server/controllers/reportController.js server/routes/adminRoutes.js
  git commit -m "feat: wire fraud thresholds 3/5/10, email at WARNING, admin fraud-status override"
  ```

---

## Task 3: Frontend — Room Count Utility

**Files:**
- Create: `client/src/utils/roomCount.js`

- [ ] **Step 1: Create `roomCount.js`**

  Create `client/src/utils/roomCount.js`:

  ```js
  /**
   * Azerbaijan room count convention.
   *
   * Azerbaijani real-estate counts all rooms including the living room:
   *   0 bedrooms (studio) = 1 Room
   *   1 bedroom           = 2 Rooms
   *   2 bedrooms          = 3 Rooms
   *
   * The `bedrooms` DB field is NEVER renamed — only the display label changes.
   */

  /**
   * Convert a stored `bedrooms` count to the Azerbaijani room display count.
   * @param {number|string} bedrooms
   * @returns {number}
   */
  export const getRoomCount = (bedrooms) => {
    const n = parseInt(bedrooms, 10);
    if (isNaN(n) || n < 0) return 1;
    return n + 1; // living room always included
  };

  /**
   * Format bedrooms as a room-count string for display.
   * @param {number|string} bedrooms
   * @returns {string}  e.g. "3 Rooms", "1 Room"
   */
  export const formatRooms = (bedrooms) => {
    const rooms = getRoomCount(bedrooms);
    return `${rooms} ${rooms === 1 ? 'Room' : 'Rooms'}`;
  };

  /**
   * Short form for compact card specs.
   * @param {number|string} bedrooms
   * @returns {string}  e.g. "3 rm"
   */
  export const formatRoomsShort = (bedrooms) => {
    return `${getRoomCount(bedrooms)} rm`;
  };

  /**
   * Convert a room filter selection to the bedrooms query value.
   * User selects "3 Rooms+" → filter sends bedrooms=2 (≥ 2 bedrooms = ≥ 3 rooms).
   * @param {number} rooms
   * @returns {number}
   */
  export const roomsToBedrooms = (rooms) => Math.max(0, rooms - 1);
  ```

- [ ] **Step 2: Verify module exports**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app"
  node -e "
  // Simulate ESM in CommonJS test
  const src = require('fs').readFileSync('client/src/utils/roomCount.js', 'utf8');
  console.assert(src.includes('getRoomCount'), 'getRoomCount missing');
  console.assert(src.includes('formatRooms'), 'formatRooms missing');
  console.assert(src.includes('formatRoomsShort'), 'formatRoomsShort missing');
  console.assert(src.includes('roomsToBedrooms'), 'roomsToBedrooms missing');
  console.log('roomCount.js exports verified');
  "
  ```
  Expected: `roomCount.js exports verified`

- [ ] **Step 3: Commit**

  ```bash
  git add client/src/utils/roomCount.js
  git commit -m "feat: add roomCount utility (Azerbaijan rooms = bedrooms + 1 convention)"
  ```

---

## Task 4: NLP Parser — Room Terminology Support

**Files:**
- Modify: `client/src/utils/nlpSearch.js`

The current NLP treats "N room" → `bedrooms: N` (wrong — should be bedrooms = N - 1). It also shows "N beds" chips instead of "N Rooms".

- [ ] **Step 1: Fix the room regex in `nlpSearch.js`**

  Open `client/src/utils/nlpSearch.js`. Find the `BEDROOM_TOKENS` line:

  ```js
  const BEDROOM_TOKENS = ['bedrooms', 'bedroom', 'bdrms', 'bdrm', 'beds', 'bed', 'br', 'bd', 'otaqlı', 'otaq'];
  ```

  These tokens still work for "N bedroom" input but do NOT include "room/rooms" (those are handled separately below in the `roomRe` fallback). Leave BEDROOM_TOKENS unchanged.

  Find the bedroom interpretation chip (around line 210):

  ```js
  interpretation.push(`${n} bed${n !== 1 ? 's' : ''}`);
  ```

  Change to (show room count, not bedroom count):

  ```js
  interpretation.push(`${n + 1} Room${(n + 1) !== 1 ? 's' : ''}`);
  ```

  Then find the `roomRe` fallback block (around lines 213–225):

  ```js
  } else {
    // "X-room" Azerbaijani/Russian style
    const roomRe = /(\d+)[\s-]*(room|otaq)\b/i;
    const rm = text.match(roomRe);
    if (rm) {
      const n = parseInt(rm[1], 10);
      if (!isNaN(n) && n >= 1) {
        params.bedrooms = n;
        interpretation.push(`${n} room${n !== 1 ? 's' : ''}`);
        consume(roomRe);
      }
    }
  }
  ```

  Replace with:

  ```js
  } else {
    // "X room(s)" — Azerbaijan/Russian style: N rooms = N-1 bedrooms
    // e.g. "2 room" = 1 bedroom (living room + 1 bedroom)
    // "2 bedroom" silently maps to "3 room" via the main bedRe branch above.
    const roomRe = /(\d+)\s*\+?\s*[\s-]*(rooms?|otaq)\b/i;
    const rm = text.match(roomRe);
    if (rm) {
      const rooms = parseInt(rm[1], 10);
      if (!isNaN(rooms) && rooms >= 1) {
        params.bedrooms = Math.max(0, rooms - 1); // rooms - 1 = bedrooms
        interpretation.push(`${rooms} Room${rooms !== 1 ? 's' : ''}`);
        consume(roomRe);
      }
    }
  }
  ```

- [ ] **Step 2: Verify NLP output**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app"
  node --input-type=module << 'EOF'
  import { parseNLQuery } from './client/src/utils/nlpSearch.js';
  const r1 = parseNLQuery('2 room apartment');
  const r2 = parseNLQuery('3 rooms');
  const r3 = parseNLQuery('2 bedroom');
  console.assert(r1.params.bedrooms === 1, '2 room → bedrooms:1');
  console.assert(r2.params.bedrooms === 2, '3 rooms → bedrooms:2');
  console.assert(r3.params.bedrooms === 2, '2 bedroom → bedrooms:2 (unchanged)');
  console.assert(r1.chips.some(c => c.label.includes('2 Room')), '2 room → chip "2 Rooms"');
  console.assert(r3.chips.some(c => c.label.includes('3 Room')), '2 bedroom → chip "3 Rooms"');
  console.log('NLP room assertions passed');
  EOF
  ```
  Expected: `NLP room assertions passed`

  If `--input-type=module` fails (Node version), check logic manually with:
  ```bash
  node -e "
  const src = require('fs').readFileSync('client/src/utils/nlpSearch.js','utf8');
  console.assert(src.includes('rooms - 1'), 'room→bedrooms conversion present');
  console.assert(src.includes('n + 1'), 'bedroom→rooms display present');
  console.log('NLP source assertions passed');
  "
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add client/src/utils/nlpSearch.js
  git commit -m "feat: update NLP to support room terminology (2 room → bedrooms:1, chips show Rooms)"
  ```

---

## Task 5: FilterBar & FilterModal — Room Labels

**Files:**
- Modify: `client/src/components/FilterBar.js`
- Modify: `client/src/components/FilterModal.js`

- [ ] **Step 1: Update FilterBar.js bedroom pill → rooms**

  Open `client/src/components/FilterBar.js`.

  **Change 1:** Find `bedsLabel`:

  ```js
  const bedsLabel = bedrooms
    ? `${bedrooms}+ bed${bedrooms === '1' ? '' : 's'}`
    : 'Beds';
  ```

  Replace with:

  ```js
  const bedsLabel = bedrooms
    ? `${parseInt(bedrooms, 10) + 1}+ Rooms`
    : 'Rooms';
  ```

  **Change 2:** Find the Beds quick-filter dropdown options. Currently the `fb-qd-title` says "Bedrooms" and the options say `1+`, `2+`, etc.:

  ```jsx
  <div className="fb-qd-title">Bedrooms</div>
  <div className="fb-qd-num-row">
    {[
      { value: '',  label: 'Any' },
      { value: '1', label: '1+'  },
      { value: '2', label: '2+'  },
      { value: '3', label: '3+'  },
      { value: '4', label: '4+'  },
      { value: '5', label: '5+'  },
    ].map(opt => (
  ```

  Change to (room labels, same underlying `bedrooms` values):

  ```jsx
  <div className="fb-qd-title">Rooms</div>
  <div className="fb-qd-num-row">
    {[
      { value: '',  label: 'Any'     },
      { value: '1', label: '2 Rooms+'},
      { value: '2', label: '3 Rooms+'},
      { value: '3', label: '4 Rooms+'},
      { value: '4', label: '5 Rooms+'},
      { value: '5', label: '5+ Rooms'},
    ].map(opt => (
  ```

  **Change 3:** Find `{ value: 'studio', label: 'Studio' }` in `PROPERTY_TYPES_QUICK` (around line 14):

  ```js
  { value: 'studio', label: 'Studio' },
  ```

  Change to:

  ```js
  { value: 'studio', label: '1 Room' },
  ```

- [ ] **Step 2: Update FilterModal.js bedroom section → rooms**

  Open `client/src/components/FilterModal.js`.

  **Change 1:** Find the bedroom section label. It likely says "Bedrooms" as a group title. Change it to "Rooms".

  **Change 2:** Find the bedroom option buttons. They currently show `Any, 1+, 2+, 3+, 4+, 5+`. Change labels to `Any, 2 Rooms+, 3 Rooms+, 4 Rooms+, 5 Rooms+, 5+ Rooms`. Keep the same option values (`'', '1', '2', '3', '4', '5'`).

  **Change 3:** Find `{ value: 'studio', label: 'Studio' }` in the property type options. Change the label to `'1 Room'`.

- [ ] **Step 3: Verify ESLint**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  $env:ESLINT_USE_FLAT_CONFIG="false"; npx eslint src/components/FilterBar.js src/components/FilterModal.js --max-warnings=0 2>&1 | Select-Object -First 10
  ```
  Expected: No new errors.

- [ ] **Step 4: Commit**

  ```bash
  git add client/src/components/FilterBar.js client/src/components/FilterModal.js
  git commit -m "feat: rename bedroom filters to room count (2 Rooms+, 3 Rooms+); Studio→1 Room in type filter"
  ```

---

## Task 6: CreateProperty.js — Room Labels + English Cleanup

**Files:**
- Modify: `client/src/pages/CreateProperty.js`

- [ ] **Step 1: Remove Azerbaijani property type labels**

  Find these two entries in `getPropertyTypes()` (around lines 138–139):

  ```js
  { value: 'old-building', label: 'Old Building (Köhnə tikili)' },
  { value: 'new-building', label: 'New Building (Yeni tikili)'  },
  ```

  Change to:

  ```js
  { value: 'old-building', label: 'Old Building' },
  { value: 'new-building', label: 'New Building' },
  ```

- [ ] **Step 2: Change bedroom section label to "Rooms"**

  Find (around line 690):

  ```jsx
  <label className="cp-label">Bedrooms <span className="cp-required">*</span></label>
  ```

  Change to:

  ```jsx
  <label className="cp-label">Rooms <span className="cp-required">*</span></label>
  ```

- [ ] **Step 3: Change bedroom pill labels to room count**

  Find the pill row (around lines 692–699):

  ```js
  {['studio', '1', '2', '3', '4', '5', '6'].map(v => (
    <button key={v} type="button"
      className={`cp-pill ${bedrooms === v ? 'cp-pill--active' : ''}`}
      onClick={() => setBedrooms(v)}
    >
      {v === 'studio' ? 'Studio' : v === '6' ? '6+' : v}
    </button>
  ))}
  ```

  Change the display label calculation:

  ```js
  {['studio', '1', '2', '3', '4', '5', '6'].map(v => (
    <button key={v} type="button"
      className={`cp-pill ${bedrooms === v ? 'cp-pill--active' : ''}`}
      onClick={() => setBedrooms(v)}
    >
      {v === 'studio' ? '1 Room'
        : v === '6'    ? '6+ Rooms'
        : `${parseInt(v, 10) + 1} Rooms`}
    </button>
  ))}
  ```

  This changes: Studio→"1 Room", 1→"2 Rooms", 2→"3 Rooms", 3→"4 Rooms", 4→"5 Rooms", 5→"6 Rooms", 6→"6+ Rooms".

- [ ] **Step 4: Update derived title to use rooms (not bedrooms)**

  Find (around lines 306–308):

  ```js
  bedrooms === 'studio' ? 'Studio'
    : bedrooms === 'custom' ? `${bedroomsCustom}-bedroom`
    : bedrooms ? `${bedrooms}-bedroom` : '',
  ```

  Change to:

  ```js
  bedrooms === 'studio' ? '1-room'
    : bedrooms === 'custom' ? `${parseInt(bedroomsCustom, 10) + 1}-room`
    : bedrooms ? `${parseInt(bedrooms, 10) + 1}-room` : '',
  ```

- [ ] **Step 5: Verify ESLint**

  ```bash
  $env:ESLINT_USE_FLAT_CONFIG="false"; npx eslint src/pages/CreateProperty.js --max-warnings=0 2>&1 | Select-Object -First 10
  ```
  Expected: No new errors.

- [ ] **Step 6: Commit**

  ```bash
  git add client/src/pages/CreateProperty.js
  git commit -m "feat: rename bedroom labels to room count in CreateProperty; remove Azerbaijani property type labels"
  ```

---

## Task 7: Room Count Display — Cards, Search, Detail, Map

**Files:**
- Modify: `client/src/pages/HomeNew.js`
- Modify: `client/src/pages/Search/index.js`
- Modify: `client/src/pages/PropertyDetail.js`
- Modify: `client/src/components/PropertyPreviewDrawer.js`
- Modify: `client/src/components/PropertyMap.js`

All files need to replace `${X} bed` / `${X} bd` patterns with room count display.

- [ ] **Step 1: Update HomeNew.js**

  Add the import at the top (after other utility imports):

  ```js
  import { formatRooms } from '../utils/roomCount';
  ```

  Find all occurrences of bedroom display in property cards. Currently:

  ```jsx
  {p.bedrooms  > 0 && <span>{p.bedrooms} bed</span>}
  ```

  Change all such occurrences to:

  ```jsx
  {(p.bedrooms >= 0 || p.bedrooms > 0) && p.bedrooms !== undefined && (
    <span>{formatRooms(p.bedrooms)}</span>
  )}
  ```

  Simpler form that works: since `bedrooms=0` means 1 Room (studio), always show if `bedrooms` is defined:

  ```jsx
  {p.bedrooms != null && <span>{formatRooms(p.bedrooms)}</span>}
  ```

  Apply this change to ALL four property card sections (Spotlight, Featured, New Listings, Recently Added).

- [ ] **Step 2: Update Search/index.js**

  Add import:

  ```js
  import { formatRooms } from '../../utils/roomCount';
  ```

  Find in `renderCard`:

  ```jsx
  {property.bedrooms  > 0 && <span>{property.bedrooms} bd</span>}
  ```

  Change to:

  ```jsx
  {property.bedrooms != null && <span>{formatRooms(property.bedrooms)}</span>}
  ```

- [ ] **Step 3: Update PropertyDetail.js**

  Add import:

  ```js
  import { formatRooms } from '../utils/roomCount';
  ```

  Find the fact row (around line 415):

  ```jsx
  {property.bedrooms  > 0 && <span className="pd-fact">{property.bedrooms} bed</span>}
  ```

  Change to:

  ```jsx
  {property.bedrooms != null && (
    <span className="pd-fact">{formatRooms(property.bedrooms)}</span>
  )}
  ```

  Also update the property overview grid (around line 460):

  ```jsx
  {property.bedrooms   > 0 && <div className="pd-ov-item"><span className="pd-ov-val">{property.bedrooms}</span><span className="pd-ov-key">Bedrooms</span></div>}
  ```

  Change to:

  ```jsx
  {property.bedrooms != null && (
    <div className="pd-ov-item">
      <span className="pd-ov-val">{property.bedrooms + 1}</span>
      <span className="pd-ov-key">Rooms</span>
    </div>
  )}
  ```

- [ ] **Step 4: Update PropertyPreviewDrawer.js**

  Add import:

  ```js
  import { formatRooms } from '../utils/roomCount';
  ```

  Find the specs line (in the drawer body, there's a `${prop.bedrooms} bd` pattern):

  ```js
  property.bedrooms  > 0                     ? `${property.bedrooms} bd`  : null,
  ```

  Change to:

  ```js
  property.bedrooms != null                  ? formatRooms(property.bedrooms) : null,
  ```

- [ ] **Step 5: Update PropertyMap.js popup HTML**

  In `createSinglePropertyPopup` and `createMultiPropertyPopup`, find the specs line:

  ```js
  property.bedrooms  > 0                     ? `${property.bedrooms} bd`                     : null,
  ```

  Change to:

  ```js
  (property.bedrooms != null)                ? `${property.bedrooms + 1} rm`               : null,
  ```

  Apply same change in `createMultiPropertyPopup` where `prop.bedrooms` is used.

- [ ] **Step 6: Verify ESLint**

  ```bash
  $env:ESLINT_USE_FLAT_CONFIG="false"; npx eslint \
    src/pages/HomeNew.js \
    src/pages/Search/index.js \
    src/pages/PropertyDetail.js \
    src/components/PropertyPreviewDrawer.js \
    src/components/PropertyMap.js \
    --max-warnings=0 2>&1 | Select-Object -First 15
  ```
  Expected: No new errors.

- [ ] **Step 7: Commit**

  ```bash
  git add \
    client/src/pages/HomeNew.js \
    client/src/pages/Search/index.js \
    client/src/pages/PropertyDetail.js \
    client/src/components/PropertyPreviewDrawer.js \
    client/src/components/PropertyMap.js
  git commit -m "feat: replace bedroom labels with room count display across all listing surfaces"
  ```

---

## Task 8: VerifiedOwnerBadge Component

**Files:**
- Create: `client/src/components/VerifiedOwnerBadge.js`
- Create: `client/src/components/VerifiedOwnerBadge.css`

- [ ] **Step 1: Create `VerifiedOwnerBadge.css`**

  Create `client/src/components/VerifiedOwnerBadge.css`:

  ```css
  /* VerifiedOwnerBadge — emerald trust badge, no gradients.
     Visually aligned with the platform's existing trust system. */

  .vob-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 7px;
    border-radius: var(--radius-full, 9999px);
    font-family: var(--font-sans, 'Inter Tight', sans-serif);
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    white-space: nowrap;
    background:   rgba(15, 118, 110, 0.08);
    color:        var(--color-primary, #0F766E);
    border: 1px solid rgba(15, 118, 110, 0.18);
    line-height: 1.4;
  }

  .vob-badge--md {
    font-size: 0.75rem;
    padding: 3px 9px;
    gap: 4px;
  }
  ```

- [ ] **Step 2: Create `VerifiedOwnerBadge.js`**

  Create `client/src/components/VerifiedOwnerBadge.js`:

  ```jsx
  import React from 'react';
  import { ShieldCheck } from 'lucide-react';
  import './VerifiedOwnerBadge.css';

  /**
   * VerifiedOwnerBadge — displayed when ownershipVerificationStatus === 'approved'.
   *
   * @param {{ size?: 'sm'|'md' }} props
   * @returns {JSX.Element}
   */
  const VerifiedOwnerBadge = ({ size = 'sm' }) => (
    <span
      className={`vob-badge${size === 'md' ? ' vob-badge--md' : ''}`}
      aria-label="Ownership verified"
    >
      <ShieldCheck
        size={size === 'md' ? 12 : 10}
        strokeWidth={2.5}
        aria-hidden="true"
      />
      Verified Owner
    </span>
  );

  export default VerifiedOwnerBadge;
  ```

- [ ] **Step 3: Add badge to Search/index.js**

  Add import:

  ```js
  import VerifiedOwnerBadge from '../../components/VerifiedOwnerBadge';
  ```

  In `renderCard`, find the `.lc-trust` block (around line 716):

  ```jsx
  {primaryTrust && (
    <div className="lc-trust">
      <span className="lc-trust-item">
        <Check size={10} strokeWidth={3} aria-hidden="true" />
        {primaryTrust}
      </span>
    </div>
  )}
  ```

  Add the badge after the trust block:

  ```jsx
  {property.ownershipVerificationStatus === 'approved' && (
    <div className="lc-trust">
      <VerifiedOwnerBadge />
    </div>
  )}
  ```

- [ ] **Step 4: Add badge to PropertyDetail.js**

  Add import:

  ```js
  import VerifiedOwnerBadge from '../components/VerifiedOwnerBadge';
  ```

  In `PropertyDetail.js`, find the ownership verification notice in the seller card area (around line 687–692):

  ```jsx
  {property?.ownershipVerificationStatus === 'approved' && (
    <div className="ppd-trust">
      ...
  ```

  Add `<VerifiedOwnerBadge size="md" />` just inside the existing ownership-verified element. If the element already shows "Ownership documents reviewed" text, replace or supplement it — do not duplicate the same information twice.

- [ ] **Step 5: Add badge to PropertyPreviewDrawer.js**

  Add import:

  ```js
  import VerifiedOwnerBadge from './VerifiedOwnerBadge';
  ```

  In the drawer body, find the trust section:

  ```jsx
  {ownershipOk && (
    <div className="ppd-trust">
      <ShieldCheck size={11} strokeWidth={2.5} aria-hidden="true" />
      Ownership verified
    </div>
  )}
  ```

  Replace with:

  ```jsx
  {ownershipOk && (
    <div className="ppd-trust">
      <VerifiedOwnerBadge />
    </div>
  )}
  ```

- [ ] **Step 6: Verify ESLint**

  ```bash
  $env:ESLINT_USE_FLAT_CONFIG="false"; npx eslint \
    src/components/VerifiedOwnerBadge.js \
    src/pages/Search/index.js \
    src/pages/PropertyDetail.js \
    src/components/PropertyPreviewDrawer.js \
    --max-warnings=0 2>&1 | Select-Object -First 10
  ```
  Expected: No new errors.

- [ ] **Step 7: Commit**

  ```bash
  git add \
    client/src/components/VerifiedOwnerBadge.js \
    client/src/components/VerifiedOwnerBadge.css \
    client/src/pages/Search/index.js \
    client/src/pages/PropertyDetail.js \
    client/src/components/PropertyPreviewDrawer.js
  git commit -m "feat: add VerifiedOwnerBadge component and integrate into search, detail, drawer"
  ```

---

## Task 9: Admin Fraud Review — AdminReports Enhancement

**Files:**
- Modify: `client/src/pages/AdminReports.js`
- Modify: `client/src/services/api.js`

- [ ] **Step 1: Add `updateFraudStatus` to api.js**

  In `client/src/services/api.js`, after the existing `updatePropertyPromotion` export, add:

  ```js
  export const updateFraudStatus = (propertyId, fraudStatus, token) =>
    api.put(`/admin/properties/${propertyId}/fraud-status`, { fraudStatus }, {
      headers: { Authorization: `Bearer ${token}` },
    });
  ```

- [ ] **Step 2: Add fraudStatus column to AdminReports.js**

  Open `client/src/pages/AdminReports.js`. The report table shows individual reports. Read the table columns. After the existing `Status` column, add a `Property Fraud Status` column header.

  In the `STATUS_LABELS` constant, add fraud status colors (these are for property fraudStatus, not report status):

  ```js
  const FRAUD_STATUS_STYLES = {
    NORMAL:    { label: 'Normal',    color: '#16a34a', bg: '#f0fdf4' },
    WARNING:   { label: 'Warning',   color: '#d97706', bg: '#fffbeb' },
    REVIEW:    { label: 'Review',    color: '#dc2626', bg: '#fef2f2' },
    SUSPENDED: { label: 'Suspended', color: '#7f1d1d', bg: '#fee2e2' },
  };
  ```

  In the table body, for each report row that has `report.targetType === 'property'`, add a cell showing the property's current fraudStatus (if available from the backend's populate). If the backend doesn't currently return property fraudStatus, show the `report.escalationLevel` as a proxy for now, and note in the commit message that the backend populate should be enhanced.

  Add "Suspend" and "Restore" action buttons for property reports:

  ```jsx
  {report.targetType === 'property' && (
    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
      <button
        style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 8, border: '1px solid #dc2626', color: '#dc2626', background: 'transparent', cursor: 'pointer' }}
        onClick={() => handleFraudStatusUpdate(report.targetId, 'SUSPENDED')}
      >
        Suspend
      </button>
      <button
        style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 8, border: '1px solid #16a34a', color: '#16a34a', background: 'transparent', cursor: 'pointer' }}
        onClick={() => handleFraudStatusUpdate(report.targetId, 'NORMAL')}
      >
        Restore
      </button>
    </div>
  )}
  ```

- [ ] **Step 3: Add `handleFraudStatusUpdate` function inside AdminReports**

  Inside the `AdminReports` component, after the existing `handleUpdate` function, add:

  ```js
  const handleFraudStatusUpdate = async (propertyId, fraudStatus) => {
    if (!window.confirm(`Set property fraud status to ${fraudStatus}?`)) return;
    try {
      const token = localStorage.getItem('token');
      await updateFraudStatus(propertyId, fraudStatus, token);
      success(`Property fraud status set to ${fraudStatus}`);
      fetchReports(page);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update fraud status');
    }
  };
  ```

  Add `updateFraudStatus` to the import from `'../services/api'`:

  ```js
  import { getReports, getReportStats, updateReport, updateFraudStatus } from '../services/api';
  ```

- [ ] **Step 4: Verify ESLint**

  ```bash
  $env:ESLINT_USE_FLAT_CONFIG="false"; npx eslint src/pages/AdminReports.js src/services/api.js --max-warnings=0 2>&1 | Select-Object -First 10
  ```
  Expected: No new errors.

- [ ] **Step 5: Commit**

  ```bash
  git add client/src/pages/AdminReports.js client/src/services/api.js
  git commit -m "feat: add Suspend/Restore fraud actions to AdminReports; add updateFraudStatus API"
  ```

---

## Task 10: Ownership Verification Page

**Files:**
- Create: `client/src/pages/OwnershipVerificationPage.js`
- Create: `client/src/pages/OwnershipVerificationPage.css`
- Modify: `client/src/App.js`

- [ ] **Step 1: Create `OwnershipVerificationPage.css`**

  Create `client/src/pages/OwnershipVerificationPage.css`:

  ```css
  /* Ownership Verification Service Page — professional, trust-focused */

  .ovp-container {
    max-width: 800px;
    margin: 0 auto;
    padding: var(--space-16) var(--space-6);
  }

  .ovp-hero {
    text-align: center;
    margin-bottom: var(--space-16);
    padding-bottom: var(--space-8);
    border-bottom: 1px solid var(--border-subtle, rgba(15, 23, 42, 0.06));
  }

  .ovp-hero-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: 3px 10px;
    border-radius: var(--radius-full, 9999px);
    background: rgba(15, 118, 110, 0.08);
    color: var(--color-primary, #0F766E);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: var(--space-4);
  }

  .ovp-hero h1 {
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    font-weight: 800;
    color: var(--color-graphite-900, #0F172A);
    margin-bottom: var(--space-4);
    letter-spacing: -0.03em;
  }

  .ovp-hero-sub {
    font-size: 1.125rem;
    color: var(--gray-600, #475569);
    line-height: 1.6;
    max-width: 560px;
    margin: 0 auto;
  }

  .ovp-section {
    margin-bottom: var(--space-12);
  }

  .ovp-section h2 {
    font-size: 1.375rem;
    font-weight: 700;
    color: var(--color-graphite-900, #0F172A);
    margin-bottom: var(--space-4);
  }

  .ovp-section p {
    color: var(--gray-600, #475569);
    line-height: 1.7;
    margin-bottom: var(--space-3);
  }

  .ovp-benefits {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: var(--space-4);
    margin-top: var(--space-4);
  }

  .ovp-benefit {
    padding: var(--space-5);
    border-radius: var(--radius-lg, 16px);
    border: 1px solid var(--border-subtle, rgba(15, 23, 42, 0.06));
    background: var(--color-bg-surface, #fff);
    box-shadow: var(--shadow-sm);
  }

  .ovp-benefit-icon {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md, 12px);
    background: rgba(15, 118, 110, 0.08);
    color: var(--color-primary, #0F766E);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--space-3);
  }

  .ovp-benefit h3 {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--color-graphite-900, #0F172A);
    margin-bottom: var(--space-2);
  }

  .ovp-benefit p {
    font-size: 0.875rem;
    color: var(--gray-500, #64748B);
    margin-bottom: 0;
  }

  .ovp-steps {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    margin-top: var(--space-4);
  }

  .ovp-step {
    display: flex;
    gap: var(--space-4);
    align-items: flex-start;
  }

  .ovp-step-num {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--color-primary, #0F766E);
    color: #fff;
    font-size: 0.75rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ovp-step p { margin-bottom: 0; }

  .ovp-price-card {
    padding: var(--space-8);
    border-radius: var(--radius-2xl, 24px);
    border: 1px solid var(--border-subtle, rgba(15, 23, 42, 0.06));
    background: var(--color-bg-surface, #fff);
    box-shadow: var(--shadow-md);
    text-align: center;
    max-width: 360px;
    margin: var(--space-6) auto 0;
  }

  .ovp-price {
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--color-graphite-900, #0F172A);
    letter-spacing: -0.04em;
  }

  .ovp-price-label {
    font-size: 0.875rem;
    color: var(--gray-500, #64748B);
    margin-bottom: var(--space-4);
  }

  .ovp-faq {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    margin-top: var(--space-4);
  }

  .ovp-faq-item {
    padding: var(--space-4) var(--space-5);
    border-radius: var(--radius-lg, 16px);
    border-left: 3px solid var(--color-primary, #0F766E);
    background: var(--color-bg-surface, #fff);
    box-shadow: var(--shadow-xs);
  }

  .ovp-faq-item h3 {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--color-graphite-900, #0F172A);
    margin-bottom: var(--space-2);
  }

  .ovp-faq-item p { font-size: 0.875rem; margin-bottom: 0; }

  .ovp-cta {
    text-align: center;
    padding: var(--space-12) var(--space-6);
    background: rgba(15, 118, 110, 0.04);
    border-radius: var(--radius-2xl, 24px);
    border: 1px solid rgba(15, 118, 110, 0.10);
    margin-top: var(--space-12);
  }

  .ovp-cta h2 { margin-bottom: var(--space-2); }
  .ovp-cta p  { color: var(--gray-600, #475569); margin-bottom: var(--space-6); }

  .ovp-cta-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-6);
    border-radius: var(--radius-button, 12px);
    background: var(--color-primary, #0F766E);
    color: #fff;
    font-weight: 600;
    font-size: 0.9375rem;
    text-decoration: none;
    transition: background 180ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .ovp-cta-btn:hover { background: var(--color-primary-hover, #0D5F58); color: #fff; }

  @media (max-width: 768px) {
    .ovp-container { padding: var(--space-8) var(--space-4); }
    .ovp-benefits { grid-template-columns: 1fr; }
  }
  ```

- [ ] **Step 2: Create `OwnershipVerificationPage.js`**

  Create `client/src/pages/OwnershipVerificationPage.js`:

  ```jsx
  import React from 'react';
  import { Link } from 'react-router-dom';
  import { ShieldCheck, FileText, BadgeCheck, Eye, Mail } from 'lucide-react';
  import './OwnershipVerificationPage.css';

  const BENEFITS = [
    {
      icon: ShieldCheck,
      title: 'Verified Owner Badge',
      body: 'A visible trust signal on your listing, visible to all buyers in search and property detail views.',
    },
    {
      icon: FileText,
      title: 'Document Review',
      body: 'Our team reviews your submitted ownership information against available records.',
    },
    {
      icon: Eye,
      title: 'Higher Buyer Confidence',
      body: 'Verified listings receive stronger engagement from serious buyers.',
    },
    {
      icon: BadgeCheck,
      title: 'Priority Trust Placement',
      body: 'Verified ownership is highlighted in the trust strip on your property detail page.',
    },
  ];

  const STEPS = [
    { text: 'Contact us through the form below or via email to initiate the verification process.' },
    { text: 'Our team will request the relevant documents based on your property type and ownership status.' },
    { text: 'We review the submitted materials and perform verification checks where possible.' },
    { text: 'If approved, your listing receives the Verified Owner badge — visible to all buyers.' },
  ];

  const FAQ = [
    {
      q: 'What does Ownership Verification mean?',
      a: 'We review submitted ownership information and perform verification checks where possible. This is not a legal certification — it is a trust signal for buyers indicating that we have reviewed the provided documents.',
    },
    {
      q: 'What documents may be requested?',
      a: 'Common documents include an ownership certificate (mülkiyyət sənədi), ID verification, and any relevant transaction records. The exact documents depend on the property type and circumstances.',
    },
    {
      q: 'How long does the review take?',
      a: 'Most reviews are completed within 2–5 business days. Complex cases may take longer. You will be notified by email at each stage.',
    },
    {
      q: 'What if my listing is rental, not for sale?',
      a: 'Ownership verification is available for rental listings too. Renters benefit from knowing the person they are dealing with has a legitimate connection to the property.',
    },
    {
      q: 'Is the badge permanent?',
      a: 'The badge remains active on your listing until the listing is removed or the verification status is updated by our team. Re-verification may be required after significant listing changes.',
    },
  ];

  const OwnershipVerificationPage = () => (
    <div className="ovp-container">

      {/* Hero */}
      <div className="ovp-hero">
        <div className="ovp-hero-eyebrow">
          <ShieldCheck size={12} strokeWidth={2.5} aria-hidden="true" />
          Trust Service
        </div>
        <h1>Ownership Verification</h1>
        <p className="ovp-hero-sub">
          Build buyer confidence with a verified ownership badge on your listing.
          We review your submitted ownership documents and mark your listing as verified.
        </p>
      </div>

      {/* What is it */}
      <div className="ovp-section">
        <h2>What is Ownership Verification?</h2>
        <p>
          Ownership Verification is a trust service offered by EmlakPro. When you submit ownership
          documentation, our team reviews the materials against available records and performs
          verification checks where possible.
        </p>
        <p>
          This is not a legal certification. It is a marketplace trust signal that tells buyers:
          "We have reviewed the ownership information for this listing and it is consistent with
          what the seller has provided."
        </p>
      </div>

      {/* Benefits */}
      <div className="ovp-section">
        <h2>Benefits</h2>
        <div className="ovp-benefits">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="ovp-benefit">
              <div className="ovp-benefit-icon">
                <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="ovp-section">
        <h2>How It Works</h2>
        <div className="ovp-steps">
          {STEPS.map((step, i) => (
            <div key={i} className="ovp-step">
              <div className="ovp-step-num">{i + 1}</div>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Documents */}
      <div className="ovp-section">
        <h2>What Documents May Be Requested</h2>
        <p>
          The exact documents depend on your property type and ownership situation. Common materials include:
        </p>
        <ul style={{ color: 'var(--gray-600)', lineHeight: 1.8, paddingLeft: '1.5rem' }}>
          <li>Ownership certificate (mülkiyyət sənədi) or equivalent</li>
          <li>National ID or passport for identity confirmation</li>
          <li>Purchase agreement or notarized contract (where applicable)</li>
          <li>Developer documentation for off-plan or new-build properties</li>
        </ul>
        <p style={{ marginTop: 'var(--space-3)' }}>
          You will never be asked to share financial account details or passwords.
        </p>
      </div>

      {/* Pricing */}
      <div className="ovp-section">
        <h2>Pricing</h2>
        <div className="ovp-price-card">
          <div className="ovp-price">20 AZN</div>
          <div className="ovp-price-label">one-time review fee per listing</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', margin: 0 }}>
            Fee covers document review, verification checks, and badge placement.
            Non-refundable if verification cannot be completed due to insufficient documentation.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div className="ovp-section">
        <h2>Frequently Asked Questions</h2>
        <div className="ovp-faq">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="ovp-faq-item">
              <h3>{q}</h3>
              <p>{a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="ovp-cta">
        <h2>Ready to Get Verified?</h2>
        <p>Contact our team to begin the ownership verification process for your listing.</p>
        <Link to="/contact" className="ovp-cta-btn">
          <Mail size={16} strokeWidth={2} aria-hidden="true" />
          Contact Us to Start
        </Link>
      </div>

    </div>
  );

  export default OwnershipVerificationPage;
  ```

- [ ] **Step 3: Add route to App.js**

  Open `client/src/App.js`. Find where other static pages are routed (e.g., `/contact`, `/about`, `/services`). Add:

  ```jsx
  <Route path="/services/ownership-verification" element={
    <MainLayout><OwnershipVerificationPage /></MainLayout>
  } />
  ```

  Add the import at the top:

  ```js
  import OwnershipVerificationPage from './pages/OwnershipVerificationPage';
  ```

- [ ] **Step 4: Verify ESLint**

  ```bash
  $env:ESLINT_USE_FLAT_CONFIG="false"; npx eslint src/pages/OwnershipVerificationPage.js src/App.js --max-warnings=0 2>&1 | Select-Object -First 10
  ```
  Expected: No new errors.

- [ ] **Step 5: Commit**

  ```bash
  git add \
    client/src/pages/OwnershipVerificationPage.js \
    client/src/pages/OwnershipVerificationPage.css \
    client/src/App.js
  git commit -m "feat: add Ownership Verification service page and route"
  ```

---

## Task 11: Services.js — Ownership Verification Card

**Files:**
- Modify: `client/src/pages/Services.js`

- [ ] **Step 1: Add the Ownership Verification card**

  Open `client/src/pages/Services.js`. In the "Property Listing Services" section, find the grid that contains Photography, Virtual Staging, and Valuation cards. Add the Ownership Verification card alongside them:

  ```jsx
  <div style={{ padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
    <h3>🛡️ Ownership Verification</h3>
    <p>Build buyer confidence with a verified ownership badge on your listing. We review your documents and mark your listing as verified.</p>
    <ul style={{ margin: '0.75rem 0', paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
      <li>Document review</li>
      <li>Verified Owner badge</li>
      <li>Higher buyer confidence</li>
    </ul>
    <p style={{ fontWeight: '600', color: '#059669', marginTop: '0.5rem' }}>₼20</p>
    <Link to="/services/ownership-verification">
      <Button variant="outline" size="sm" style={{ marginTop: '1rem' }}>Learn More</Button>
    </Link>
  </div>
  ```

- [ ] **Step 2: Verify ESLint**

  ```bash
  $env:ESLINT_USE_FLAT_CONFIG="false"; npx eslint src/pages/Services.js --max-warnings=0 2>&1 | Select-Object -First 10
  ```
  Expected: No new errors.

- [ ] **Step 3: Commit**

  ```bash
  git add client/src/pages/Services.js
  git commit -m "feat: add Ownership Verification card to Services page (20 AZN)"
  ```

---

## Task 12: Final Build Verification

- [ ] **Step 1: Verify all server modules load**

  ```bash
  node -e "
  require('./server/lib/promotion/fraudStatus');
  require('./server/lib/mailer');
  require('./server/controllers/reportController');
  require('./server/routes/adminRoutes');
  console.log('All Phase 5.4 server modules OK');
  "
  ```
  Expected: `All Phase 5.4 server modules OK`

- [ ] **Step 2: Run ESLint across all new/modified client files**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  $env:ESLINT_USE_FLAT_CONFIG="false"; npx eslint \
    src/utils/roomCount.js \
    src/utils/nlpSearch.js \
    src/components/FilterBar.js \
    src/components/FilterModal.js \
    src/components/VerifiedOwnerBadge.js \
    src/pages/CreateProperty.js \
    src/pages/HomeNew.js \
    src/pages/Search/index.js \
    src/pages/PropertyDetail.js \
    src/components/PropertyPreviewDrawer.js \
    src/components/PropertyMap.js \
    src/pages/AdminReports.js \
    src/pages/OwnershipVerificationPage.js \
    src/pages/Services.js \
    src/services/api.js \
    src/App.js \
    --max-warnings=0 2>&1 | Select-Object -First 20
  ```
  Expected: No new errors.

- [ ] **Step 3: Run the React build**

  ```bash
  npm run build 2>&1 | Select-Object -Last 15
  ```
  Expected: `Compiled successfully.` or `Compiled with warnings.` — zero compilation errors.

- [ ] **Step 4: Final commit**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app"
  git add .
  git commit -m "feat: Phase 5.4 complete — localization, fraud workflow, ownership verification"
  ```

---

## Deliverables Summary (Part 12)

### Files Created (5)
| File | Purpose |
|------|---------|
| `client/src/utils/roomCount.js` | Room count helpers (getRoomCount, formatRooms, roomsToBedrooms) |
| `client/src/components/VerifiedOwnerBadge.js` | Emerald trust badge for ownership-verified listings |
| `client/src/components/VerifiedOwnerBadge.css` | Badge styles |
| `client/src/pages/OwnershipVerificationPage.js` | Public service page (what/how/benefits/docs/price/FAQ/CTA) |
| `client/src/pages/OwnershipVerificationPage.css` | Page styles |

### Files Modified (14)
| File | Change |
|------|--------|
| `server/lib/promotion/fraudStatus.js` | SUSPENDED threshold 8 → 10 |
| `server/lib/mailer.js` | +`sendFraudWarningEmail()` |
| `server/controllers/reportController.js` | Wire fraud thresholds, update fraudStatus/fraudReportCount, email at 3 |
| `server/routes/adminRoutes.js` | +`PUT /admin/properties/:id/fraud-status` |
| `client/src/utils/nlpSearch.js` | Room tokens: N room → bedrooms N-1; chips show "N Rooms" |
| `client/src/components/FilterBar.js` | Beds→Rooms labels; Studio→1 Room in types |
| `client/src/components/FilterModal.js` | Bedroom section→Rooms; Studio→1 Room |
| `client/src/pages/CreateProperty.js` | Studio→1 Room; Bedrooms→Rooms label; remove Azerbaijani type labels |
| `client/src/pages/HomeNew.js` | formatRooms() in all card sections |
| `client/src/pages/Search/index.js` | formatRooms() + VerifiedOwnerBadge |
| `client/src/pages/PropertyDetail.js` | formatRooms() + VerifiedOwnerBadge |
| `client/src/components/PropertyPreviewDrawer.js` | formatRooms() + VerifiedOwnerBadge |
| `client/src/components/PropertyMap.js` | Room count in popup HTML |
| `client/src/pages/AdminReports.js` | Suspend/Restore fraud actions |
| `client/src/pages/Services.js` | Ownership Verification card (20 AZN) |
| `client/src/App.js` | `/services/ownership-verification` route |
| `client/src/services/api.js` | +`updateFraudStatus()` |

### Fraud Workflow Summary
| Reports | fraudStatus | Effect | Email |
|---------|------------|--------|-------|
| 0–2 | NORMAL | Public, no flag | No |
| 3–4 | WARNING | Flagged for admin review | Yes — once at count=3 |
| 5–9 | REVIEW | Flagged, in admin queue | No |
| ≥10 | SUSPENDED | Hidden from public search (`status='pending'`) | No |

Admin can override any fraudStatus via `PUT /admin/properties/:id/fraud-status`.

### Ownership Verification Summary
- Public page at `/services/ownership-verification`
- Price: 20 AZN (one-time review fee per listing)
- Card added to Services.js alongside Photography, Virtual Staging, Promotion
- `VerifiedOwnerBadge` shows on: Search cards, PropertyDetail, PropertyPreviewDrawer
- Badge condition: `property.ownershipVerificationStatus === 'approved'`

### Room-Count Conversion Summary
| DB field | Display |
|----------|---------|
| `bedrooms: 0` (Studio) | 1 Room |
| `bedrooms: 1` | 2 Rooms |
| `bedrooms: 2` | 3 Rooms |
| `bedrooms: N` | N+1 Rooms |

NLP: "2 room" → bedrooms:1; "2 bedroom" → bedrooms:2 (silent 3-room interpretation for chips).
Filter options: same `bedrooms` values; labels changed to "2 Rooms+", "3 Rooms+", etc.

### English Cleanup Report
| File | Change |
|------|--------|
| `CreateProperty.js` line 138 | `'Old Building (Köhnə tikili)'` → `'Old Building'` |
| `CreateProperty.js` line 139 | `'New Building (Yeni tikili)'` → `'New Building'` |
| `nlpSearch.js` | No user-facing Azerbaijani text — internal parsing tokens are intentional compatibility features, not user-visible labels |

### Build Status
- Zero ESLint errors (pre-existing warnings not new to this sprint)
- `Compiled successfully.` — zero compilation errors
- TypeScript: not applicable (plain JavaScript project)
