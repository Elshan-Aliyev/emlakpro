# 📅 CALENDAR SYNCHRONIZATION SYSTEM - Short-Term Rentals

## Context & Problem Statement

**Market Need:** Azerbaijan property owners list on multiple platforms (Airbnb, Booking.com, local sites) and need to:
- Prevent double bookings across platforms
- Manually updating calendars on each platform is time-consuming and error-prone
- Buyers need to see real-time availability

**Goal:** Build an iCal-based calendar sync system that automatically blocks dates booked on external platforms, keeping availability accurate without manual updates.

**Why iCal (not APIs)?**
- ✅ Universal standard - works with Airbnb, Booking.com, VRBO, Google Calendar, etc.
- ✅ No API keys or OAuth needed (Airbnb API is restricted)
- ✅ One-way sync is sufficient for blocking dates
- ✅ Simple for users: just copy/paste a link

---

## 1. HOW iCAL SYNC WORKS (Simple Explanation)

### What is iCal?

**iCal (.ics)** is a universal calendar file format. Think of it like a shared Google Doc, but for calendars.

**How platforms use it:**
1. Airbnb generates a special link for your listing: `https://airbnb.com/calendar/ical/ABC123.ics`
2. This link contains all your bookings in a machine-readable format
3. Other platforms can "read" this link to see when your property is booked
4. When someone books on Airbnb, the .ics file updates automatically

### Real Example

**iCal file content (.ics format):**
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Airbnb Inc//Hosting Calendar//EN
BEGIN:VEVENT
DTSTART:20260325
DTEND:20260329
SUMMARY:Reserved - Airbnb
UID:abc123@airbnb.com
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR
```

**What this means:**
- Property is booked from **March 25-29, 2026**
- Booking source: **Airbnb**
- Status: **Confirmed** (not tentative)

### How We Use It

1. **User action:** Property owner pastes Airbnb calendar link into our platform
2. **Our system:** Fetches the .ics file every 6 hours
3. **Parsing:** Extracts all booked date ranges
4. **Database update:** Marks those dates as "unavailable" in our calendar
5. **Result:** Buyers see accurate availability, can't book blocked dates

**Key limitation:** This is **one-way sync** (we read external calendars, but can't write to them). Solution: We also generate our own .ics export that users paste into Airbnb/Booking.

---

## 2. BACKEND FLOW FOR IMPORTING CALENDAR DATA

### A) User Setup Flow

```
User Flow:
┌─────────────────────────────────────────────────────┐
│ 1. User creates short-term rental listing           │
│    ↓                                                 │
│ 2. System generates unique calendar for listing     │
│    ↓                                                 │
│ 3. User clicks "Sync External Calendars"            │
│    ↓                                                 │
│ 4. User pastes Airbnb iCal link (optional)          │
│    ↓                                                 │
│ 5. User pastes Booking.com link (optional)          │
│    ↓                                                 │
│ 6. User clicks "Save & Sync"                        │
│    ↓                                                 │
│ 7. System immediately fetches all external calendars │
│    ↓                                                 │
│ 8. Booked dates marked as unavailable               │
└─────────────────────────────────────────────────────┘
```

### B) Backend Processing Flow

**Endpoint:** `POST /api/properties/:id/calendars/sync`

```javascript
// Step 1: User submits external calendar links
const externalCalendars = [
  { source: 'Airbnb', url: 'https://airbnb.com/calendar/ical/ABC123.ics' },
  { source: 'Booking.com', url: 'https://booking.com/ical/XYZ789.ics' }
];

// Step 2: For each calendar, fetch .ics file
for (const calendar of externalCalendars) {
  const icsData = await fetchIcalFile(calendar.url);
  
  // Step 3: Parse .ics file and extract events
  const events = parseIcalData(icsData);
  
  // Step 4: Convert events to date ranges
  const blockedDates = events.map(event => ({
    startDate: event.dtstart,
    endDate: event.dtend,
    source: calendar.source,
    bookingId: event.uid,
    status: event.status // CONFIRMED, TENTATIVE, CANCELLED
  }));
  
  // Step 5: Save to database
  await saveBlockedDates(propertyId, blockedDates);
}

// Step 6: Return updated availability calendar
return getPropertyAvailability(propertyId);
```

### C) Implementation Details

**Library to use:** `node-ical` (npm package)
```bash
npm install node-ical
```

**Code example:**
```javascript
const ical = require('node-ical');
const axios = require('axios');

async function fetchAndParseIcal(url) {
  try {
    // Fetch .ics file from external URL
    const response = await axios.get(url, {
      timeout: 10000, // 10 second timeout
      headers: { 'User-Agent': 'YourPlatform/1.0' }
    });
    
    // Parse iCal data
    const events = ical.parseICS(response.data);
    
    const blockedDates = [];
    
    for (let eventId in events) {
      const event = events[eventId];
      
      // Only process VEVENT (actual bookings, not metadata)
      if (event.type === 'VEVENT') {
        // Skip cancelled events
        if (event.status === 'CANCELLED') continue;
        
        blockedDates.push({
          startDate: event.start, // Date object
          endDate: event.end,     // Date object
          summary: event.summary, // e.g., "Reserved - Airbnb"
          uid: event.uid,
          status: event.status    // CONFIRMED or TENTATIVE
        });
      }
    }
    
    return blockedDates;
    
  } catch (error) {
    console.error('Failed to fetch iCal:', error.message);
    throw new Error('Invalid or inaccessible calendar URL');
  }
}
```

### D) Automatic Background Sync

**Cron Job:** Run every 6 hours to refresh all calendars

```javascript
// scripts/sync-calendars.js
const cron = require('node-cron');

// Run every 6 hours: 0 */6 * * *
cron.schedule('0 */6 * * *', async () => {
  console.log('Starting calendar sync...');
  
  // Get all properties with external calendars
  const properties = await Property.find({
    'shortTermRental.enabled': true,
    'shortTermRental.externalCalendars.0': { $exists: true } // Has at least one calendar
  });
  
  for (const property of properties) {
    try {
      await syncPropertyCalendar(property._id);
      console.log(`✓ Synced property ${property._id}`);
    } catch (error) {
      console.error(`✗ Failed to sync ${property._id}:`, error.message);
      // Log error but continue with other properties
    }
  }
  
  console.log('Calendar sync complete');
});

async function syncPropertyCalendar(propertyId) {
  const property = await Property.findById(propertyId);
  
  const allBlockedDates = [];
  
  // Fetch each external calendar
  for (const extCal of property.shortTermRental.externalCalendars) {
    const blockedDates = await fetchAndParseIcal(extCal.url);
    allBlockedDates.push(...blockedDates.map(d => ({
      ...d,
      source: extCal.source
    })));
  }
  
  // Replace old blocked dates with fresh data
  await BlockedDate.deleteMany({ 
    propertyId: propertyId,
    source: { $ne: 'platform' } // Keep our platform's own bookings
  });
  
  await BlockedDate.insertMany(allBlockedDates.map(d => ({
    propertyId: propertyId,
    startDate: d.startDate,
    endDate: d.endDate,
    source: d.source,
    externalBookingId: d.uid,
    syncedAt: new Date()
  })));
}
```

---

## 3. DATABASE STRUCTURE FOR STORING AVAILABILITY

### A) Property Model Extensions

**Add to existing Property schema:**
```javascript
// server/models/Property.js

const PropertySchema = new mongoose.Schema({
  // ... existing fields ...
  
  shortTermRental: {
    enabled: { type: Boolean, default: false },
    
    // Base nightly price
    nightlyRate: { type: Number },
    
    // Minimum nights required
    minNights: { type: Number, default: 1 },
    
    // Maximum nights allowed
    maxNights: { type: Number, default: 365 },
    
    // Cleaning fee (one-time)
    cleaningFee: { type: Number, default: 0 },
    
    // Check-in time (e.g., "15:00")
    checkInTime: { type: String, default: '15:00' },
    
    // Check-out time
    checkOutTime: { type: String, default: '11:00' },
    
    // External calendar links (Airbnb, Booking, etc.)
    externalCalendars: [{
      source: { type: String, required: true }, // 'Airbnb', 'Booking.com', 'VRBO'
      url: { type: String, required: true },    // iCal URL
      addedAt: { type: Date, default: Date.now },
      lastSyncedAt: { type: Date },
      syncStatus: { type: String, enum: ['active', 'error'], default: 'active' },
      errorMessage: String
    }],
    
    // Our platform's iCal export URL (for users to add to other platforms)
    exportCalendarUrl: { type: String },
    
    // Default availability (all dates available unless blocked)
    defaultAvailable: { type: Boolean, default: true },
    
    // Instant booking enabled?
    instantBooking: { type: Boolean, default: false }
  }
});
```

### B) New Model: BlockedDate

```javascript
// server/models/BlockedDate.js

const BlockedDateSchema = new mongoose.Schema({
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true,
    index: true
  },
  
  // Date range
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  
  endDate: {
    type: Date,
    required: true
  },
  
  // Source of block
  source: {
    type: String,
    enum: ['platform', 'Airbnb', 'Booking.com', 'VRBO', 'manual'],
    required: true
  },
  
  // Booking details (if from external calendar)
  externalBookingId: String, // UID from iCal
  
  guestName: String, // For platform bookings
  
  // Status
  status: {
    type: String,
    enum: ['confirmed', 'tentative', 'cancelled'],
    default: 'confirmed'
  },
  
  // Metadata
  syncedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  
  // Manual blocks (owner manually blocked dates)
  reason: String // e.g., "Property maintenance", "Personal use"
});

// Compound index for efficient queries
BlockedDateSchema.index({ propertyId: 1, startDate: 1, endDate: 1 });

// Method to check if date range overlaps with blocked dates
BlockedDateSchema.statics.isRangeBlocked = async function(propertyId, startDate, endDate) {
  const overlappingBlock = await this.findOne({
    propertyId: propertyId,
    status: { $ne: 'cancelled' },
    $or: [
      // New booking starts during blocked period
      { startDate: { $lte: startDate }, endDate: { $gte: startDate } },
      // New booking ends during blocked period
      { startDate: { $lte: endDate }, endDate: { $gte: endDate } },
      // New booking completely contains blocked period
      { startDate: { $gte: startDate }, endDate: { $lte: endDate } }
    ]
  });
  
  return !!overlappingBlock;
};

module.exports = mongoose.model('BlockedDate', BlockedDateSchema);
```

### C) New Model: Booking

```javascript
// server/models/Booking.js

const BookingSchema = new mongoose.Schema({
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  
  guestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Dates
  checkInDate: { type: Date, required: true },
  checkOutDate: { type: Date, required: true },
  nights: { type: Number, required: true },
  
  // Pricing
  nightlyRate: { type: Number, required: true },
  cleaningFee: { type: Number, default: 0 },
  totalPrice: { type: Number, required: true },
  
  // Guest info
  numberOfGuests: { type: Number, required: true },
  guestPhone: String,
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  confirmedAt: Date,
  cancelledAt: Date,
  
  // Cancellation
  cancelledBy: { type: String, enum: ['guest', 'host', 'system'] },
  cancellationReason: String,
  
  // Special requests
  guestMessage: String
});

// Automatically create BlockedDate when booking confirmed
BookingSchema.post('save', async function(doc) {
  if (doc.status === 'confirmed') {
    const BlockedDate = require('./BlockedDate');
    
    await BlockedDate.findOneAndUpdate(
      {
        propertyId: doc.propertyId,
        startDate: doc.checkInDate,
        endDate: doc.checkOutDate,
        source: 'platform'
      },
      {
        propertyId: doc.propertyId,
        startDate: doc.checkInDate,
        endDate: doc.checkOutDate,
        source: 'platform',
        guestName: doc.guestId,
        status: 'confirmed',
        syncedAt: new Date()
      },
      { upsert: true }
    );
  }
});

module.exports = mongoose.model('Booking', BookingSchema);
```

---

## 4. SYNC FREQUENCY & STRATEGY

### Recommended Sync Schedule

| Trigger | Frequency | Purpose |
|---------|-----------|---------|
| **User clicks "Sync Now"** | Immediate | Manual refresh when user adds new calendar or suspects outdated data |
| **Background cron job** | Every 6 hours | Keep all properties updated automatically |
| **After platform booking** | Immediate | Instantly block dates when someone books on our platform |
| **Before checkout (validation)** | Real-time | Final check before confirming booking to prevent race conditions |

### Implementation

**1. Manual Sync (User-triggered)**
```javascript
// routes/propertyRoutes.js
router.post('/properties/:id/calendars/sync', authMiddleware, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    
    // Verify user owns property
    if (property.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Sync all external calendars
    await syncPropertyCalendar(property._id);
    
    res.json({ 
      message: 'Calendar synced successfully',
      lastSyncedAt: new Date()
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Sync failed', error: error.message });
  }
});
```

**2. Automatic Background Sync**
```javascript
// server/server.js - Add to startup
const cron = require('node-cron');
const { syncAllCalendars } = require('./services/calendarSyncService');

// Run every 6 hours at :00 minutes
cron.schedule('0 */6 * * *', () => {
  console.log('🔄 Starting scheduled calendar sync...');
  syncAllCalendars();
});
```

**3. Pre-Booking Validation**
```javascript
// controllers/bookingController.js
async function createBooking(req, res) {
  const { propertyId, checkInDate, checkOutDate } = req.body;
  
  // CRITICAL: Sync calendar immediately before checking availability
  await syncPropertyCalendar(propertyId);
  
  // Check if dates are blocked
  const isBlocked = await BlockedDate.isRangeBlocked(
    propertyId,
    new Date(checkInDate),
    new Date(checkOutDate)
  );
  
  if (isBlocked) {
    return res.status(409).json({ 
      message: 'These dates are no longer available. Please choose different dates.',
      code: 'DATES_UNAVAILABLE'
    });
  }
  
  // Proceed with booking...
  const booking = await Booking.create({
    propertyId,
    guestId: req.user._id,
    checkInDate,
    checkOutDate,
    // ... other fields
  });
  
  res.status(201).json(booking);
}
```

### Why 6 Hours?

**Balance between freshness and server load:**
- ✅ **Fresh enough:** Most platforms don't update calendars more than 2-3 times per day
- ✅ **Server-friendly:** Won't overwhelm external APIs with requests
- ✅ **Cost-effective:** Minimal HTTP requests (4 per property per day)
- ⚠️ **Trade-off:** Up to 6-hour delay in sync

**For last-minute bookings:** The pre-checkout real-time sync catches any changes.

---

## 5. EDGE CASES & PROBLEM HANDLING

### A) Double Bookings

**Scenario:** Guest books on our platform in the 30 seconds before external calendar syncs a new Airbnb booking for same dates.

**Solution:**
```javascript
// Use pessimistic locking
async function createBooking(propertyId, dates) {
  // Start transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // 1. Sync calendar (get latest data)
    await syncPropertyCalendar(propertyId);
    
    // 2. Re-check availability within transaction
    const isBlocked = await BlockedDate.isRangeBlocked(propertyId, dates);
    
    if (isBlocked) {
      throw new Error('Dates no longer available');
    }
    
    // 3. Create blocking record FIRST (atomic)
    await BlockedDate.create([{
      propertyId: propertyId,
      startDate: dates.checkIn,
      endDate: dates.checkOut,
      source: 'platform',
      status: 'confirmed'
    }], { session });
    
    // 4. Then create booking record
    const booking = await Booking.create([bookingData], { session });
    
    // Commit transaction
    await session.commitTransaction();
    return booking;
    
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

**Additional safeguard:** Send immediate email to property owner when double booking detected, asking them to manually resolve.

---

### B) Sync Delays / Stale Data

**Problem:** External calendar hasn't updated yet, leading to outdated availability.

**Solutions:**

**1. Show "Last Updated" timestamp**
```javascript
// On listing page
"Availability last updated: 2 hours ago"
[Refresh Now] ← Button for users to trigger manual sync
```

**2. Warning banner for old data**
```javascript
if (hoursSinceLastSync > 12) {
  showWarning('⚠️ Calendar data may be outdated. Contact owner to confirm availability.');
}
```

**3. Owner notifications**
```javascript
// If sync fails 3 times in a row
if (consecutiveSyncFailures >= 3) {
  sendEmail(propertyOwner, {
    subject: 'Calendar sync issue',
    body: 'Your Airbnb calendar hasn\'t synced in 18 hours. Please check your calendar URL.'
  });
}
```

---

### C) Invalid Calendar URLs

**Problem:** User pastes wrong URL or external platform changes format.

**Validation:**
```javascript
function validateIcalUrl(url) {
  // Check basic URL format
  if (!url.startsWith('http')) {
    throw new Error('URL must start with http:// or https://');
  }
  
  // Check if it's a calendar URL (common patterns)
  const validPatterns = [
    /airbnb\.com.*ical/i,
    /booking\.com.*ical/i,
    /\.ics$/i,
    /calendar.*ical/i
  ];
  
  const isValid = validPatterns.some(pattern => pattern.test(url));
  
  if (!isValid) {
    throw new Error('This doesn\'t look like a valid calendar URL. It should end with .ics or contain "ical".');
  }
  
  return true;
}

// Test by actually fetching
async function testIcalUrl(url) {
  try {
    const blockedDates = await fetchAndParseIcal(url);
    return { valid: true, eventsFound: blockedDates.length };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
```

**UI feedback:**
```
Step 1: User pastes URL
Step 2: System validates format (instant)
Step 3: System tests fetch (2-3 seconds)
Step 4: Show result:
  ✅ "Calendar connected! Found 5 bookings."
  OR
  ❌ "Can't access this calendar. Please check the URL."
```

---

### D) Cancelled Bookings

**Problem:** External booking was cancelled, but still shows as blocked in .ics file.

**Solution:**
```javascript
// When parsing iCal, respect STATUS field
function parseEvent(event) {
  // Skip cancelled events
  if (event.status === 'CANCELLED') {
    return null;
  }
  
  // Mark tentative bookings differently
  const isConfirmed = event.status === 'CONFIRMED';
  
  return {
    startDate: event.start,
    endDate: event.end,
    status: isConfirmed ? 'confirmed' : 'tentative'
  };
}

// In availability check, only block for confirmed bookings
const isBlocked = await BlockedDate.findOne({
  propertyId: propertyId,
  startDate: { $lte: dates.checkIn },
  endDate: { $gte: dates.checkOut },
  status: 'confirmed' // Ignore tentative
});
```

---

### E) Time Zone Issues

**Problem:** iCal uses UTC, but property is in Azerbaijan (UTC+4).

**Solution:**
```javascript
const moment = require('moment-timezone');

function normalizeToPropertyTimezone(date, propertyTimezone = 'Asia/Baku') {
  // Convert UTC date to property's local midnight
  return moment(date).tz(propertyTimezone).startOf('day').toDate();
}

// When storing blocked dates
const blockedDate = {
  startDate: normalizeToPropertyTimezone(event.start),
  endDate: normalizeToPropertyTimezone(event.end)
};
```

---

### F) Same-Day Bookings

**Problem:** Guest books today for check-in today, but external calendar sync is delayed.

**Solution:**
```javascript
// Block same-day bookings for properties with external calendars
const minAdvanceHours = property.shortTermRental.externalCalendars.length > 0 ? 24 : 0;

const hoursTillCheckIn = (new Date(checkInDate) - new Date()) / (1000 * 60 * 60);

if (hoursTillCheckIn < minAdvanceHours) {
  return res.status(400).json({
    message: 'This property requires 24 hours advance booking. Please contact the owner directly for same-day bookings.'
  });
}
```

---

## 6. USER INTERFACE DESIGN

### A) Calendar Management Page (Property Owner)

**Location:** `/account/properties/:id/calendar`

```
┌────────────────────────────────────────────────────┐
│  📅 Calendar & Availability                        │
└────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  SYNC EXTERNAL CALENDARS                            │
│                                                     │
│  Keep your calendar updated automatically by        │
│  connecting calendars from other platforms.         │
│                                                     │
│  ┌────────────────────────────────────────┐        │
│  │ 🏠 Airbnb Calendar                      │        │
│  │ https://airbnb.com/calendar/ical/...   │        │
│  │ ✅ Synced 2 hours ago | 3 bookings     │        │
│  │ [Remove] [Sync Now]                    │        │
│  └────────────────────────────────────────┘        │
│                                                     │
│  ┌────────────────────────────────────────┐        │
│  │ 🅱️ Booking.com Calendar                 │        │
│  │ https://booking.com/ical/xyz789.ics    │        │
│  │ ⚠️ Sync failed - check URL             │        │
│  │ [Edit] [Retry]                         │        │
│  └────────────────────────────────────────┘        │
│                                                     │
│  [+ Add Another Calendar]                          │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  EXPORT YOUR CALENDAR                               │
│                                                     │
│  Copy this link and paste it into Airbnb/Booking   │
│  to sync bookings FROM our platform TO theirs.     │
│                                                     │
│  📋 https://yourplatform.az/ical/export/abc123     │
│  [Copy Link]                                       │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  BLOCK DATES MANUALLY                               │
│                                                     │
│  Block specific dates when your property is         │
│  unavailable (maintenance, personal use, etc.)      │
│                                                     │
│  From: [📅 Select Date]  To: [📅 Select Date]      │
│  Reason: [Personal use ▼]                          │
│  [Block Dates]                                     │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  AVAILABILITY CALENDAR                              │
│                                                     │
│  ← March 2026 →                                    │
│                                                     │
│  Mo Tu We Th Fr Sa Su                              │
│                                                     │
│   1  2  3  4  5  6  7                              │
│   8  9 [10][11] 12 13 14  ← Booked (Airbnb)       │
│  15 16 17 18 19 20 [21]   ← Blocked (Manual)       │
│ [22][23][24] 25 26 27 28  ← Booked (Platform)      │
│  29 30 31                                          │
│                                                     │
│  Legend:                                           │
│  ⬜ Available  🟦 Platform Booking                 │
│  🟩 Airbnb     🟧 Manual Block                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### B) Add Calendar Dialog (Simple Version)

```
┌─────────────────────────────────────────────────────┐
│  Connect External Calendar                          │
│                                                     │
│  Which platform?                                   │
│  ○ Airbnb                                          │
│  ○ Booking.com                                     │
│  ○ VRBO                                            │
│  ● Other                                           │
│                                                     │
│  ─────────────────────────────────────────────     │
│                                                     │
│  HOW TO GET YOUR CALENDAR LINK:                    │
│                                                     │
│  1. Go to your Airbnb calendar settings            │
│  2. Look for "Calendar sync" or "Export calendar"  │
│  3. Copy the link that ends with .ics              │
│  4. Paste it below                                 │
│                                                     │
│  [📺 Watch Video Tutorial]                         │
│                                                     │
│  ─────────────────────────────────────────────     │
│                                                     │
│  Calendar Link:                                    │
│  ┌─────────────────────────────────────────┐      │
│  │ https://                                │      │
│  └─────────────────────────────────────────┘      │
│                                                     │
│  [Cancel]  [Connect Calendar]                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**After pasting URL:**
```
  ✅ Testing calendar link...
  
  ✓ Calendar connected successfully!
  📊 Found 3 upcoming bookings
  
  [View Calendar]
```

### C) Buyer View (Simplified Availability)

**On listing page, instead of complex calendar:**

```
┌─────────────────────────────────────────────────────┐
│  CHECK AVAILABILITY                                 │
│                                                     │
│  Check-in:  [📅 25 Mar 2026 ▼]                     │
│  Check-out: [📅 29 Mar 2026 ▼]                     │
│                                                     │
│  Guests: [2 ▼]                                     │
│                                                     │
│  ──────────────────────────────────                │
│  4 nights × 120 AZN = 480 AZN                      │
│  Cleaning fee:       20 AZN                        │
│  ──────────────────────────────────                │
│  Total:             500 AZN                        │
│                                                     │
│  [Check Availability]                              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Result feedback:**
```
✅ Available! These dates are free.
   [Reserve Now]

OR

❌ Not available. These dates are already booked.
   Suggested alternatives:
   • Mar 30 - Apr 3 (available)
   • Apr 5 - Apr 9 (available)
```

**Calendar view for buyers (optional):**
```
Mini calendar showing:
  Gray = Booked
  Green = Available
  
No source details shown (buyers don't need to know
whether it's Airbnb or platform booking)
```

### D) Mobile-First Design

**Key principles for Azerbaijan market:**
- Large tap targets (48x48px minimum)
- Date picker uses native mobile input
- Copy button for calendar URL (one-tap)
- Video tutorials embedded (3G-friendly, short clips)
- Error messages in simple Azerbaijani
- Progress indicators for sync operations

**Example mobile UI:**
```
╔═══════════════════════════╗
║  📅 Qonaq Təqvimi        ║ ← In Azerbaijani
╠═══════════════════════════╣
║                           ║
║  🏠 Airbnb Təqvimi       ║
║  ✅ 2 saat əvvəl         ║
║  [Yenilə]                ║
║                           ║
║  ────────────────────    ║
║                           ║
║  [+ Təqvim Əlavə Et]     ║ ← Large button
║                           ║
╚═══════════════════════════╝
```

---

## 7. TECHNICAL IMPLEMENTATION CHECKLIST

### Phase 1: Basic iCal Import (Week 1)
- [ ] Install `node-ical` package
- [ ] Create `BlockedDate` model
- [ ] Build `fetchAndParseIcal()` function
- [ ] Add `externalCalendars` field to Property model
- [ ] Create API endpoint: `POST /properties/:id/calendars/add`
- [ ] Create API endpoint: `DELETE /properties/:id/calendars/:calId`
- [ ] Build availability checker: `isRangeBlocked()`
- [ ] Test with real Airbnb calendar URL

### Phase 2: Background Sync (Week 2)
- [ ] Set up cron job (6-hour interval)
- [ ] Build `syncAllCalendars()` service
- [ ] Add error logging for failed syncs
- [ ] Email notifications for consecutive failures
- [ ] Add "Last synced" timestamp display

### Phase 3: UI Components (Week 2-3)
- [ ] Calendar management page (`/account/properties/:id/calendar`)
- [ ] "Add Calendar" dialog with validation
- [ ] Visual calendar grid showing blocked dates
- [ ] Color-coding by source (platform, Airbnb, Booking, manual)
- [ ] Manual date blocking interface
- [ ] Mobile-responsive design

### Phase 4: Booking Integration (Week 3)
- [ ] Pre-booking availability validation
- [ ] Real-time sync before checkout
- [ ] Create `Booking` model
- [ ] Auto-create BlockedDate on platform booking
- [ ] Transaction-based double-booking prevention

### Phase 5: Export (Week 4)
- [ ] Generate iCal export for each property
- [ ] Endpoint: `GET /ical/export/:propertyId.ics`
- [ ] Include all platform bookings in export
- [ ] Update export when new bookings created

### Phase 6: Polish & Edge Cases (Week 4)
- [ ] Timezone normalization (Azerbaijan = UTC+4)
- [ ] Cancelled booking handling
- [ ] Same-day booking restrictions
- [ ] URL validation and testing
- [ ] Duplicate detection
- [ ] Help documentation / video tutorials

---

## 8. COST & PERFORMANCE

### Server Load Estimates

**Assumptions:**
- 1000 short-term rental properties
- Each has 2 external calendars on average
- 6-hour sync interval = 4 syncs/day

**Calculations:**
```
Total syncs per day: 1000 properties × 2 calendars × 4 syncs = 8,000 HTTP requests/day
Average request: ~2 seconds
Total daily processing: 8,000 × 2s = 16,000 seconds = 4.4 hours of CPU time

Spread over 24 hours with 6-hour intervals:
  4 batches × 2,000 requests each
  Each batch completes in ~1 hour
```

**Verdict:** ✅ Very manageable with single server

### Database Size

**Per property with 100 bookings/year:**
```
BlockedDate records: ~200/year (100 external + 100 platform)
Document size: ~200 bytes
Total: 200 × 200 bytes = 40 KB per property

For 1000 properties: 40 MB/year
```

**Verdict:** ✅ Negligible storage cost

### External API Costs

**Most iCal URLs are free to fetch (Airbnb, Booking don't charge for iCal access)**

**Only cost: HTTP bandwidth**
```
Average .ics file size: 5 KB
8,000 fetches/day × 5 KB = 40 MB/day = 1.2 GB/month
```

**Verdict:** ✅ Free tier of most hosting providers covers this

---

## 9. SECURITY CONSIDERATIONS

### A) Calendar URL Privacy

**Risk:** iCal URLs contain bookings and can be accessed by anyone with the link.

**Mitigation:**
```javascript
// Store calendar URLs encrypted
const crypto = require('crypto');

function encryptCalendarUrl(url) {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.CALENDAR_SECRET);
  return cipher.update(url, 'utf8', 'hex') + cipher.final('hex');
}

function decryptCalendarUrl(encrypted) {
  const decipher = crypto.createDecipher('aes-256-cbc', process.env.CALENDAR_SECRET);
  return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
}
```

### B) Rate Limiting

**Prevent abuse of sync endpoints:**
```javascript
const rateLimit = require('express-rate-limit');

const syncLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 manual syncs per hour per user
  message: 'Too many sync requests. Automatic sync runs every 6 hours.'
});

router.post('/properties/:id/calendars/sync', syncLimiter, syncCalendar);
```

### C) URL Validation

**Prevent SSRF attacks:**
```javascript
function isValidIcalUrl(url) {
  const parsed = new URL(url);
  
  // Only allow HTTPS (not http, file://, etc.)
  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed');
  }
  
  // Block localhost and private IPs
  const hostname = parsed.hostname;
  if (
    hostname === 'localhost' ||
    hostname.startsWith('127.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.')
  ) {
    throw new Error('Private IP addresses are not allowed');
  }
  
  return true;
}
```

---

## SUMMARY & NEXT STEPS

### What We've Designed

✅ **iCal-based sync system** that reads calendars from Airbnb, Booking.com, VRBO  
✅ **Background sync every 6 hours** keeps data fresh without overwhelming servers  
✅ **Real-time validation** before booking prevents double bookings  
✅ **Simple UI** for non-technical Azerbaijan property owners  
✅ **Two-way sync** (import external + export platform bookings)  
✅ **Edge case handling** for cancellations, timezone issues, sync failures  

### Why This Works

- ✅ **No API keys needed** - works with any platform that supports iCal
- ✅ **Universal compatibility** - iCal is industry standard
- ✅ **Low cost** - minimal server resources, no API fees
- ✅ **Simple for users** - just paste a link, sync happens automatically
- ✅ **Reliable** - multiple safety checks prevent double bookings

### Implementation Timeline

**Week 1:** Basic iCal import + database models  
**Week 2:** Background sync + error handling  
**Week 3:** Calendar management UI  
**Week 4:** Booking integration + export  

**Total:** 4 weeks to full production-ready system

### Success Metrics

**Target goals (Month 3):**
- 30% of short-term rentals have external calendars connected
- <1% double booking rate (from all sources)
- Average sync freshness: <3 hours
- 90% sync success rate

---

**Ready to start implementing? Which phase should we build first?**
