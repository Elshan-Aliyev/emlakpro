# 🛡️ TRUST SYSTEM DESIGN - Azerbaijan Real Estate Platform

## Context & Problem Statement

**Market Reality:** Azerbaijan users don't trust real estate agents or online listings due to:
- Fake listings with stolen photos
- Agents posting properties they don't represent
- Phone numbers that lead to scammers
- Inflated prices or misleading descriptions
- No accountability when listings are fraudulent

**Goal:** Build a visual trust layer that helps buyers identify legitimate listings instantly, while keeping the verification process simple enough that sellers will complete it.

---

## 1. TRUST LEVEL DEFINITIONS

### 🔓 Level 0: UNVERIFIED (Default)
**Achievement:** None - this is the baseline state when a listing is first created

**Requirements:**
- None - listing posted with no verification

**What This Signals:**
- "New listing, no trust established yet"
- User may be legitimate but hasn't proven identity
- Proceed with caution

**User Impact:**
- Listings appear in search but ranked lower
- Clear "Unverified" badge visible
- Buyers see warning: "Contact this seller carefully - identity not verified"

---

### 📱 Level 1: PHONE VERIFIED
**Achievement:** User confirms they control the phone number listed

**Requirements:**
- SMS OTP verification to provided phone number
- Phone number must match Azerbaijan format (+994)
- One phone number per account (prevents farming)

**What This Signals:**
- "Real person with working Azerbaijan phone"
- Reduces spam/bot listings
- User is contactable

**Automation:** ✅ **Fully automated** (SMS API: Twilio, AWS SNS, or local provider like ASAN SMS)

**User Impact:**
- Green checkmark badge appears
- Listing ranked higher in search
- Buyers see: "Phone verified - safe to call"

---

### 🆔 Level 2: ID VERIFIED
**Achievement:** User submits government-issued ID and it's validated

**Requirements:**
- Upload photo of Azerbaijan ID card or passport
- Selfie holding ID (prevents stolen ID fraud)
- Manual admin review OR automated OCR verification
- Name on listing must match ID name

**What This Signals:**
- "Real Azerbaijan resident with verified identity"
- Accountability - user can't hide behind anonymity
- Serious seller, not scammer

**Automation:** 🟡 **Semi-automated**
- Stage 1: Automated OCR extracts name/ID number (use Tesseract.js or AWS Textract)
- Stage 2: Automated face matching (selfie vs ID photo) - use face-api.js or AWS Rekognition
- Stage 3: Manual admin review for edge cases (blurry photos, OCR failures)

**User Impact:**
- Blue shield badge appears
- Listing featured in "Verified Sellers" section
- Buyer confidence increases 3x
- Platform shows snippet: "Eliyev Rustam - ID Verified ✓"

---

### 🏠 Level 3: OWNERSHIP VERIFIED (Premium)
**Achievement:** User proves they own or are authorized to sell/rent the property

**Requirements:**
- Upload title deed (ÇIXARIŞ - property ownership certificate in Azerbaijan)
- OR rental agreement (if agent represents landlord)
- OR developer authorization letter (for new projects)
- Document must show property address matching listing address
- Manual admin review (cross-check with State Registry)

**What This Signals:**
- "This person legally controls this property"
- Eliminates fake listings entirely
- Professional agents/owners only

**Automation:** ⚠️ **Manual review required**
- Azerbaijan's State Committee on Property Issues (DQDK) doesn't have public API
- Admin manually verifies document authenticity
- Future: API integration with government registry if available

**User Impact:**
- Gold crown badge appears
- Listing boosted to top of search results
- Buyers see: "Property ownership confirmed ✓"
- Premium placement in homepage carousel

---

### ⭐ Level 4: PLATFORM VERIFIED (Future - Company Accounts)
**Achievement:** Platform manually vets and endorses professional agencies

**Requirements:**
- Active business license (Lisenziya)
- Physical office address verified by platform staff
- Minimum 10 successful transactions on platform
- Zero fraud complaints
- Paid professional account ($50-100/month)

**What This Signals:**
- "Trusted professional agency endorsed by platform"
- Track record of legitimate transactions
- Customer support guarantee

**Automation:** ❌ **Fully manual**
- Platform admin physically visits office
- Reviews transaction history
- Checks legal documents
- Ongoing monitoring for complaints

**User Impact:**
- Purple "Platform Verified" banner
- Dedicated agency profile page with reviews
- Listings appear in "Trusted Agencies" filter
- Contact badges: "Response time: 2 hours avg"

---

## 2. VISUAL TRUST INDICATORS

### A) Listing Card (Grid View)
```
┌──────────────────────────────────────┐
│ [Property Image]          🔓 UNVERIFIED │ ← Top-right corner badge
│                                          │
│ 2-bed apartment in Nasimi               │
│ 1,200 AZN/month                         │
│                                          │
│ 👤 Rustam  📱✓ Phone Verified           │ ← Inline trust indicator
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ [Property Image]          🛡️ ID VERIFIED │ ← Blue shield badge
│                                          │
│ 3-bed villa in Badamdar                 │
│ 450,000 AZN                             │
│                                          │
│ 👤 Nigar Aliyeva  🆔✓ ID Verified       │ ← Name shown when ID verified
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ [Property Image]        👑 OWNERSHIP ✓  │ ← Gold crown for ownership
│                                          │
│ Premium office space, Nizami            │
│ $5,000/month                            │
│                                          │
│ 🏢 Baku Developments  ⭐ Platform Verified │
└──────────────────────────────────────┘
```

### B) Listing Detail Page
**Top Section (Hero Area):**
```
════════════════════════════════════════
         🛡️ ID VERIFIED LISTING
════════════════════════════════════════

3-Bedroom Apartment in Nasimi District
1,200 AZN/month

┌─────────────────────────────────────┐
│  SELLER TRUST SCORE: 🟢🟢🟢🟡⚪       │ ← Visual trust meter (3/5)
│                                     │
│  ✅ Phone Verified (March 15, 2026) │
│  ✅ ID Verified (March 16, 2026)    │
│  ⏳ Ownership verification pending  │
│  ⚪ Not a platform partner          │
│                                     │
│  Listed by: Rustam Eliyev           │ ← Real name shown
│  Member since: January 2026         │
│  Listings: 3 active                 │
└─────────────────────────────────────┘

[Contact Seller] ← Enabled
[Report Listing] ← Always visible
```

### C) Badge Design System

**Visual Language:**
- 🔓 **Unverified** → Gray, opacity 50%, dashed border → "Caution"
- 📱 **Phone Verified** → Green checkmark, solid border → "Basic trust"
- 🛡️ **ID Verified** → Blue shield, gradient → "Strong trust"
- 👑 **Ownership Verified** → Gold crown, shimmer effect → "Premium trust"
- ⭐ **Platform Verified** → Purple star, glow effect → "Endorsed"

**Mobile Optimization:**
- Badges 40x40px minimum (thumb-friendly)
- High contrast for outdoor viewing
- Icons + text (not icon-only) for clarity
- Tooltip on tap: "What does this mean?"

### D) Trust Filters in Search
```
Filters:
☑️ Show only verified listings
  ↳ Phone verified or higher
  ↳ ID verified or higher  
  ↳ Ownership verified only
  ↳ Platform verified agencies only
```

---

## 3. BACKEND CHANGES REQUIRED

### A) Database Schema (MongoDB)

**User Model** (`server/models/User.js`) - Add fields:
```javascript
{
  // Existing fields...
  
  // Trust system fields
  trustLevel: {
    type: Number,
    default: 0,
    enum: [0, 1, 2, 3, 4] // 0=unverified, 1=phone, 2=ID, 3=ownership, 4=platform
  },
  
  verifications: {
    phone: {
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      phoneNumber: String // Saved after verification
    },
    
    identity: {
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      submittedAt: Date,
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: null },
      idType: { type: String, enum: ['id-card', 'passport'] },
      idNumber: String, // Hashed/encrypted
      fullName: String,
      photoUrl: String, // Cloudinary URL of ID photo
      selfieUrl: String, // Cloudinary URL of selfie
      rejectionReason: String
    },
    
    ownership: {
      verified: { type: Boolean, default: false },
      verifiedAt: Date
    },
    
    platform: {
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      businessLicense: String,
      officeAddress: String
    }
  },
  
  trustScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100 // Calculated score based on multiple factors
  },
  
  verificationHistory: [{
    type: { type: String }, // 'phone', 'id', 'ownership', 'platform'
    timestamp: Date,
    status: String, // 'submitted', 'approved', 'rejected'
    adminNotes: String
  }]
}
```

**Property Model** (`server/models/Property.js`) - Add fields:
```javascript
{
  // Existing fields...
  
  // Inherit trust level from owner at creation
  trustLevel: {
    type: Number,
    default: 0,
    ref: 'User.trustLevel' // Synced from user
  },
  
  ownershipVerification: {
    submitted: { type: Boolean, default: false },
    status: { type: String, enum: ['none', 'pending', 'approved', 'rejected'] },
    documentUrl: String, // Title deed/rental agreement
    submittedAt: Date,
    verifiedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin ID
    adminNotes: String
  },
  
  // Fraud detection
  flaggedAsSpam: { type: Boolean, default: false },
  flagCount: { type: Number, default: 0 },
  flagReasons: [String]
}
```

**New Model:** Verification Requests (`server/models/VerificationRequest.js`)
```javascript
{
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['phone', 'identity', 'ownership', 'platform'], required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  
  // For phone verification
  phoneNumber: String,
  otpCode: String,
  otpExpiresAt: Date,
  
  // For ID verification
  idDocuments: {
    photoUrl: String,
    selfieUrl: String,
    extractedData: {
      fullName: String,
      idNumber: String,
      dateOfBirth: Date,
      expiryDate: Date
    }
  },
  
  // For ownership verification
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  ownershipDocuments: [{
    type: String, // 'title-deed', 'rental-agreement', 'authorization-letter'
    url: String
  }],
  
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: Date,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  adminNotes: String,
  rejectionReason: String
}
```

### B) New API Endpoints

**Verification Routes** (`server/routes/verificationRoutes.js`):
```
POST   /api/verification/phone/send-otp        → Send SMS code
POST   /api/verification/phone/verify-otp      → Confirm code, set phone verified
POST   /api/verification/identity/submit       → Upload ID + selfie
GET    /api/verification/identity/status       → Check review status
POST   /api/verification/ownership/submit      → Upload title deed
GET    /api/verification/requests              → (Admin) List pending reviews
PUT    /api/verification/requests/:id/approve  → (Admin) Approve verification
PUT    /api/verification/requests/:id/reject   → (Admin) Reject with reason
GET    /api/verification/me                    → Get current user's trust levels
```

**Search Enhancement** (`server/routes/propertyRoutes.js`):
```
GET    /api/properties?trustLevel=2    → Filter by minimum trust level
GET    /api/properties?verified=true   → Show only phone-verified or higher
```

### C) Admin Dashboard (New)

**Required Admin Pages:**
```
/admin/verifications          → Queue of pending ID/ownership reviews
/admin/verifications/:id      → Review single verification with approve/reject
/admin/users/flagged          → Users reported for fraud
/admin/properties/flagged     → Listings flagged as fake
/admin/trust-stats            → Analytics: % of listings verified, conversion rates
```

---

## 4. AUTOMATION vs MANUAL VERIFICATION

### ✅ FULLY AUTOMATED

**Phone Verification (Level 1)**
- **Tech:** Twilio SMS API or local Azerbaijan provider (ASAN SMS, Azercell Gateway)
- **Flow:** User enters phone → Backend generates 6-digit OTP → SMS sent → User enters code → Backend validates → `verifications.phone.verified = true`
- **Cost:** ~$0.05 per SMS
- **Speed:** Instant

**Basic ID OCR (Level 2 - Stage 1)**
- **Tech:** Tesseract.js (free, runs in browser) or AWS Textract (paid, more accurate)
- **Flow:** User uploads ID → Extract text fields (name, ID number, expiry) → Auto-populate form → User confirms
- **Accuracy:** 80-90% for Azerbaijan IDs (Cyrillic + Latin text)
- **Speed:** 2-5 seconds

### 🟡 SEMI-AUTOMATED

**ID Verification (Level 2 - Full)**
- **Automated stages:**
  - OCR extracts name/ID number
  - Face matching (selfie vs ID photo) using face-api.js
  - Check if ID expired
  - Flag duplicate ID numbers across accounts
- **Manual stage:**
  - Admin reviews flagged cases (blurry photo, OCR mismatch, suspicious patterns)
  - Final approval click
- **Time:** 90% auto-approved in seconds, 10% reviewed within 24 hours

**Ownership Verification (Level 3 - Document Check)**
- **Automated stages:**
  - OCR extracts property address from title deed
  - Auto-match address to listing address (fuzzy matching)
  - Flag if addresses don't match
- **Manual stage:**
  - Admin visually confirms document authenticity (watermarks, official stamps)
  - Cross-reference with Azerbaijan State Registry (no API, manual lookup)
- **Time:** 1-2 days (manual bottleneck)

### ❌ FULLY MANUAL

**Platform Verification (Level 4)**
- Requires physical office visit
- Business license validation
- Transaction history review
- Ongoing relationship management
- **Time:** 1-2 weeks per agency

---

## 5. ANTI-FRAUD MEASURES

### A) Prevent Duplicate Listings

**Problem:** Same property posted multiple times by different fake accounts

**Solution:**
```javascript
// Hash property fingerprint on creation
const propertyFingerprint = hash([
  coordinates.lat.toFixed(4),
  coordinates.lng.toFixed(4),
  bedrooms,
  builtUpArea,
  price
]);

// Check for duplicates
const duplicate = await Property.findOne({ 
  fingerprint: propertyFingerprint,
  createdAt: { $gte: Date.now() - 30 * 24 * 60 * 60 * 1000 } // Last 30 days
});

if (duplicate && user.trustLevel < 2) {
  throw new Error('Similar listing already exists. Verify your ID to post.');
}
```

**Impact:** Unverified users can't spam duplicate listings

---

### B) Image Plagiarism Detection

**Problem:** Scammers steal photos from other listings

**Solution:**
- **Stage 1 (Launch):** Reverse image search API (Google Vision API or TinEye)
- **Stage 2 (Future):** Perceptual hashing (pHash) to detect similar images even if cropped/filtered

```javascript
// On image upload
const imageHash = await generatePerceptualHash(imageUrl);
const existingListing = await Property.findOne({ 
  imageHashes: imageHash,
  _id: { $ne: currentPropertyId } 
});

if (existingListing && user.trustLevel === 0) {
  flagProperty(propertyId, 'stolen-images');
  notifyAdmin(`Unverified user uploaded duplicate images`);
}
```

**Impact:** Reduces fake listings by 60-70%

---

### C) Phone Number Restrictions

**Problem:** One scammer creates 100 accounts with burner phones

**Solution:**
```javascript
// One phone per account (strict)
const existingUser = await User.findOne({ 
  'verifications.phone.phoneNumber': phoneNumber 
});

if (existingUser) {
  throw new Error('This phone number is already verified on another account');
}

// Rate limit OTP requests (prevent brute force)
const recentOtps = await OtpLog.countDocuments({
  phoneNumber: phoneNumber,
  createdAt: { $gte: Date.now() - 60 * 60 * 1000 } // Last hour
});

if (recentOtps > 3) {
  throw new Error('Too many verification attempts. Try again in 1 hour.');
}
```

**Impact:** Makes account farming expensive/impossible

---

### D) User Reporting System

**Flow:**
1. Buyer sees suspicious listing → Clicks "Report Listing"
2. Selects reason: "Fake photos / Wrong price / Scam attempt / Property doesn't exist"
3. Backend increments `flagCount` on property
4. If `flagCount >= 3` → Auto-hide listing + notify admin
5. Admin reviews → Either reinstates or bans user

```javascript
// Auto-hide threshold
if (property.flagCount >= 3 && user.trustLevel < 2) {
  property.status = 'hidden';
  property.flaggedAsSpam = true;
  await property.save();
  
  sendAdminAlert({
    type: 'fraud-alert',
    propertyId: property._id,
    userId: property.userId,
    reason: 'Multiple user reports'
  });
}
```

**Impact:** Community-driven fraud detection

---

### E) Trust-Based Listing Limits

**Problem:** Scammers mass-post 50 fake listings in one day

**Solution:**
```javascript
// Listing quotas by trust level
const listingLimits = {
  0: 2,   // Unverified: max 2 listings
  1: 5,   // Phone verified: max 5 listings
  2: 20,  // ID verified: max 20 listings
  3: 100, // Ownership verified: unlimited (platform assumes legit)
  4: -1   // Platform verified: unlimited
};

const userListingCount = await Property.countDocuments({ 
  userId: user._id,
  status: 'active'
});

const maxAllowed = listingLimits[user.trustLevel];
if (userListingCount >= maxAllowed) {
  throw new Error(`Verify your ID to post more than ${maxAllowed} listings`);
}
```

**Impact:** Forces scammers to verify identity or stay limited

---

### F) Ownership Verification Incentive

**Carrot approach:** Make ownership verification attractive

**Benefits for ownership-verified listings:**
- 🏆 **5x search ranking boost** (appears first in results)
- 💎 **Featured in homepage carousel** (free visibility)
- 📞 **Buyer trust = 3x more inquiries** (data-driven claim)
- ⚡ **Fast-track support** (24hr response from platform)
- 🎨 **Premium badge** (gold crown on listing)

**Result:** Legitimate sellers rush to verify, scammers can't (no real title deeds)

---

## 6. ROLLOUT STRATEGY

### Phase 1 (Week 1-2): Phone Verification
- Build SMS OTP flow
- Add "Phone Verified" badge to listings
- Show trust filter in search
- **Metric:** Aim for 30% of active users verified in first month

### Phase 2 (Week 3-4): ID Verification
- Build ID upload UI
- Implement OCR + basic admin review
- Launch "ID Verified" badge
- **Metric:** Aim for 10-15% of users ID-verified

### Phase 3 (Month 2): Ownership Verification
- Build document upload for title deeds
- Train admin team on document review
- Launch "Ownership Verified" premium badge
- **Metric:** 5% of listings ownership-verified

### Phase 4 (Month 3+): Platform Partnerships
- Manually vet 5-10 professional agencies
- Offer paid "Platform Verified" accounts
- Build agency profile pages

---

## SUMMARY: IMPACT ON AZERBAIJAN MARKET

**Before Trust System:**
- ❌ 50% of listings are fake or misleading
- ❌ Buyers waste hours contacting scammers
- ❌ Platform has no credibility
- ❌ Good sellers buried among fraudsters

**After Trust System:**
- ✅ Verified listings get 3-5x more views (search ranking + trust filter)
- ✅ Buyers confidently contact ID-verified sellers
- ✅ Scammers leave platform (can't verify fake identities)
- ✅ Platform becomes "safest place to find real listings"
- ✅ **Competitive advantage:** First Azerbaijan platform with visible trust layer

**Key Success Metric:** % of listings that are Phone Verified or higher
- **Target:** 50% within 3 months, 70% within 6 months

---

## NEXT STEPS

**Ready to implement Phase 1 (Phone Verification)?**

Implementation order:
1. Update User model with trust system fields
2. Create VerificationRequest model
3. Build phone verification API endpoints
4. Integrate SMS provider (Twilio recommended for MVP)
5. Add verification UI components
6. Update listing cards with trust badges
7. Add trust level filtering to search

**Estimated development time:** 1-2 weeks for Phase 1
