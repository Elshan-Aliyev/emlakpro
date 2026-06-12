# Phase 5.5C — Launch Readiness & Trust Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gap between Phase 5.5B's service pages and a production-ready launch — wiring a unified admin leads dashboard, email notifications for every service request, a homepage trust/service strip, a modernised footer, and SEO meta on all service pages.

**Architecture:** Service leads (photography, virtual staging, contact) are stored in a new `ServiceLead` Mongoose model. Promotion requests continue to use `PromotionRequest` (Phase 5.5B). Both are surfaced in a new `AdminLeads.js` page. Emails use the existing `server/lib/mailer.js` + nodemailer infrastructure. SEO is handled by a no-dependency `SeoHead` utility component that writes directly to `document.head`. No new npm packages are required.

**Tech Stack:** Node.js/Express/Mongoose (existing), React 18, Lucide icons, CSS custom properties, existing `mailer.js` SMTP wrapper.

---

## Revision Notes

| Decision | Detail |
|---|---|
| Lead capture timing | ServiceLead is created on contact form submission, not on CTA click — CTA click already fires `service_inquiry_submitted` analytics |
| ContactUs.js | Converted from static page to form. Pre-populated subject from React Router `location.state` (set by BookPhotoshoot/DigitalStaging CTAs) |
| SEO approach | Custom `SeoHead` hook writes `<title>` and `<meta>` tags directly — avoids adding `react-helmet-async` |
| Promotion requests in leads | `PromotionRequest` data is fetched from existing `/api/promotion-requests/admin` endpoint and rendered as a separate tab |
| Lead statuses | `new` / `contacted` / `completed` — admin-only transitions |
| Admin email | Reads `ADMIN_EMAIL` env var; falls back to `SMTP_FROM` recipient. Add `ADMIN_EMAIL=` to `.env` |

---

## File Map

### New files

| File | Responsibility |
|---|---|
| `server/models/ServiceLead.js` | Photography / virtual staging / contact inquiries |
| `server/controllers/serviceLeadController.js` | `submit` (public), `list` (admin), `updateStatus` (admin) |
| `server/routes/serviceLeadRoutes.js` | 3 routes |
| `client/src/pages/AdminLeads.js` | Unified leads dashboard (ServiceLeads + PromotionRequests) |
| `client/src/pages/AdminLeads.css` | Dashboard styles |
| `client/src/components/SeoHead.js` | Writes title + meta + canonical to `document.head` |

### Modified files

| File | Change |
|---|---|
| `server/lib/mailer.js` | Add 4 email functions: `sendServiceLeadConfirmation`, `sendServiceLeadAdminNotification`, `sendPromotionRequestConfirmation`, `sendPromotionRequestAdminNotification` |
| `server/controllers/promotionRequestController.js` | Fire 2 emails in `submitRequest` |
| `server/routes/serviceLeadRoutes.js` | (new, listed above) |
| `server/server.js` | Mount `serviceLeadRoutes` at `/api/service-leads` |
| `client/src/pages/ContactUs.js` | Convert to form, submit to `/api/service-leads`, read navigation state for subject |
| `client/src/services/api.js` | Add `submitServiceLead`, `getAdminLeads`, `updateLeadStatus` |
| `client/src/pages/HomeNew.js` | Add service highlights strip (4 tiles) |
| `client/src/pages/HomeNew.css` | Styles for service strip |
| `client/src/layouts/Footer.js` | Add Services + Support columns |
| `client/src/layouts/Footer.css` | Grid adjustment for 5 columns |
| `client/src/App.js` | Add `/admin/leads` route (lazy, protected admin) |
| `client/src/pages/BookPhotoshoot.js` | Add `<SeoHead>` |
| `client/src/pages/DigitalStaging.js` | Add `<SeoHead>` |
| `client/src/pages/Services.js` | Add `<SeoHead>` |
| `client/src/pages/PrepareContract.js` | Add `<SeoHead>` |
| `client/src/pages/ListProperty.js` | Add `<SeoHead>` |
| `client/src/pages/ShortTermRental.js` | Add `<SeoHead>` |
| `client/src/pages/Advertise.js` | Add `<SeoHead>` |
| `client/src/pages/VerificationApplication.js` | Add `<SeoHead>` |
| `server/.env` | Document `ADMIN_EMAIL` variable |

---

## Task 1: ServiceLead Model + Controller + Routes + api.js Client

**Files:**
- Create: `server/models/ServiceLead.js`
- Create: `server/controllers/serviceLeadController.js`
- Create: `server/routes/serviceLeadRoutes.js`
- Modify: `server/server.js`
- Modify: `client/src/services/api.js`

- [ ] **Step 1: Create `server/models/ServiceLead.js`**

  ```js
  'use strict';
  const mongoose = require('mongoose');

  const LEAD_TYPES = ['photography', 'virtual_staging', 'contact'];
  const STATUSES   = ['new', 'contacted', 'completed'];

  const serviceLeadSchema = new mongoose.Schema({
    leadType:   { type: String, enum: LEAD_TYPES, required: true, index: true },
    name:       { type: String, required: true, trim: true, maxlength: 120 },
    email:      { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    phone:      { type: String, default: '', trim: true, maxlength: 30 },
    subject:    { type: String, default: '', trim: true, maxlength: 200 },
    message:    { type: String, required: true, trim: true, maxlength: 3000 },
    meta:       { type: Object, default: {} }, // package, tier, etc. from navigation state
    status:     { type: String, enum: STATUSES, default: 'new', index: true },
    adminNote:  { type: String, default: '' },
    processedAt: { type: Date, default: null },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  }, { timestamps: true });

  module.exports = mongoose.model('ServiceLead', serviceLeadSchema);
  ```

- [ ] **Step 2: Create `server/controllers/serviceLeadController.js`**

  ```js
  'use strict';
  const ServiceLead = require('../models/ServiceLead');
  const { sendServiceLeadConfirmation, sendServiceLeadAdminNotification } = require('../lib/mailer');

  const VALID_TYPES    = ['photography', 'virtual_staging', 'contact'];
  const VALID_STATUSES = ['new', 'contacted', 'completed'];

  // ── POST / — public submission ─────────────────────────────────────────────
  exports.submit = async (req, res) => {
    try {
      const { leadType, name, email, phone, subject, message, meta } = req.body;
      if (!VALID_TYPES.includes(leadType)) {
        return res.status(400).json({ message: 'Invalid leadType.' });
      }
      if (!name || !email || !message) {
        return res.status(400).json({ message: 'name, email, and message are required.' });
      }
      if (message.trim().length < 10) {
        return res.status(400).json({ message: 'Message must be at least 10 characters.' });
      }

      const lead = await ServiceLead.create({
        leadType,
        name:    name.trim(),
        email:   email.trim().toLowerCase(),
        phone:   (phone || '').trim(),
        subject: (subject || '').trim(),
        message: message.trim(),
        meta:    meta || {},
      });

      // Fire emails non-blocking
      sendServiceLeadConfirmation({ name: lead.name, email: lead.email, leadType, subject: lead.subject }).catch(() => {});
      sendServiceLeadAdminNotification({ name: lead.name, email: lead.email, leadType, subject: lead.subject, message: lead.message }).catch(() => {});

      res.status(201).json({ message: 'Inquiry submitted successfully.', id: lead._id });
    } catch (err) {
      console.error('ServiceLead submit error:', err);
      res.status(500).json({ message: 'Failed to submit inquiry.' });
    }
  };

  // ── GET / — admin list ─────────────────────────────────────────────────────
  exports.list = async (req, res) => {
    try {
      const { status, leadType, page = 1, limit = 25 } = req.query;
      const filter = {};
      if (status   && VALID_STATUSES.includes(status))   filter.status   = status;
      if (leadType && VALID_TYPES.includes(leadType))     filter.leadType = leadType;

      const [leads, total] = await Promise.all([
        ServiceLead.find(filter)
          .sort({ createdAt: -1 })
          .skip((Number(page) - 1) * Number(limit))
          .limit(Number(limit))
          .lean(),
        ServiceLead.countDocuments(filter),
      ]);
      res.json({ leads, total });
    } catch (err) {
      res.status(500).json({ message: 'Failed to load leads.' });
    }
  };

  // ── PATCH /:id/status — admin updates status ───────────────────────────────
  exports.updateStatus = async (req, res) => {
    try {
      const { status, adminNote } = req.body;
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ message: 'status must be new, contacted, or completed.' });
      }
      const lead = await ServiceLead.findById(req.params.id);
      if (!lead) return res.status(404).json({ message: 'Lead not found.' });

      lead.status      = status;
      lead.processedAt = new Date();
      lead.processedBy = req.user.id;
      if (adminNote !== undefined) lead.adminNote = adminNote;
      await lead.save();

      res.json(lead);
    } catch (err) {
      res.status(500).json({ message: 'Failed to update lead status.' });
    }
  };
  ```

- [ ] **Step 3: Create `server/routes/serviceLeadRoutes.js`**

  ```js
  'use strict';
  const express     = require('express');
  const router      = express.Router();
  const verifyToken = require('../middleware/authMiddleware');
  const { isAdmin } = require('../middleware/roleMiddleware');
  const ctrl        = require('../controllers/serviceLeadController');

  router.post('/',            ctrl.submit);
  router.get('/',             verifyToken, isAdmin, ctrl.list);
  router.patch('/:id/status', verifyToken, isAdmin, ctrl.updateStatus);

  module.exports = router;
  ```

- [ ] **Step 4: Mount in `server/server.js`**

  Read `server/server.js`. After the last `const ... = require('./routes/...')` block, add:
  ```js
  const serviceLeadRoutes = require('./routes/serviceLeadRoutes');
  ```
  After the last `app.use('/api/...')` line, add:
  ```js
  app.use('/api/service-leads', serviceLeadRoutes);
  ```

- [ ] **Step 5: Add to `server/.env`** (documentation only — no credentials)

  Read `server/.env`. After the SMTP block, append:
  ```
  # Admin notification email — receives leads and promotion request alerts
  # ADMIN_EMAIL=admin@emlakpro.az
  ```

- [ ] **Step 6: Verify server modules load**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\server"
  node -e "
    require('./models/ServiceLead');
    require('./controllers/serviceLeadController');
    require('./routes/serviceLeadRoutes');
    console.log('ServiceLead modules OK');
  "
  ```
  Expected: `ServiceLead modules OK`

- [ ] **Step 7: Add API client functions to `client/src/services/api.js`**

  Read `api.js`. Before `export default api;`, add:
  ```js
  // ── Service Leads ─────────────────────────────────────────────────────────

  export const submitServiceLead = (data) =>
    api.post('/service-leads', data);

  export const getAdminLeads = (params, token) =>
    api.get('/service-leads', { params, headers: { Authorization: `Bearer ${token}` } });

  export const updateLeadStatus = (id, status, adminNote, token) =>
    api.patch(`/service-leads/${id}/status`, { status, adminNote }, { headers: { Authorization: `Bearer ${token}` } });
  ```

- [ ] **Step 8: ESLint api.js**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint src/services/api.js --max-warnings=0 2>&1 | tail -5
  ```
  Expected: no output.

- [ ] **Step 9: Commit**

  ```bash
  git add server/models/ServiceLead.js server/controllers/serviceLeadController.js server/routes/serviceLeadRoutes.js server/server.js server/.env client/src/services/api.js
  git commit -m "feat(leads): add ServiceLead model, controller, routes, and API client"
  ```

---

## Task 2: Email Templates (mailer.js additions)

**Files:**
- Modify: `server/lib/mailer.js`

- [ ] **Step 1: Read `server/lib/mailer.js`** to understand the existing pattern before editing.

- [ ] **Step 2: Append 4 new email functions to `server/lib/mailer.js`**

  Find the `exports.isEnabled = enabled;` line at the bottom. **Before** it, add:

  ```js
  // ─── Service lead: user confirmation ─────────────────────────────────────

  const LEAD_TYPE_LABELS = {
    photography:     'Professional Photography',
    virtual_staging: 'Virtual Staging',
    contact:         'General Inquiry',
  };

  exports.sendServiceLeadConfirmation = ({ name, email, leadType, subject }) =>
    send({
      to:      email,
      subject: `We received your inquiry — EmlakPro`,
      html: `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
      <tr><td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
          <tr><td style="background:#0F766E;padding:24px 32px;">
            <p style="margin:0;font-size:18px;font-weight:600;color:#ffffff;letter-spacing:-0.01em;">Əmlak Pro</p>
          </td></tr>
          <tr><td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:15px;color:#374151;">Hi ${name},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              Thank you for your <strong>${LEAD_TYPE_LABELS[leadType] || 'service'}</strong> inquiry${subject ? ` regarding "<em>${subject}</em>"` : ''}.
              Our team will review your request and get back to you within 1 business day.
            </p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;">
              <p style="margin:0;font-size:14px;color:#166534;font-weight:500;">What happens next?</p>
              <p style="margin:8px 0 0;font-size:13px;color:#166534;line-height:1.6;">
                A member of our team will contact you at this email address to confirm details and schedule next steps.
              </p>
            </div>
          </td></tr>
          <tr><td style="padding:16px 32px 24px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
              EmlakPro · Baku, Azerbaijan<br>
              If you did not submit this inquiry, please ignore this email.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
  </html>
      `.trim(),
    });

  // ─── Service lead: admin notification ────────────────────────────────────

  exports.sendServiceLeadAdminNotification = ({ name, email, leadType, subject, message }) =>
    send({
      to:      process.env.ADMIN_EMAIL || FROM,
      subject: `[EmlakPro Lead] ${LEAD_TYPE_LABELS[leadType] || 'Inquiry'} from ${name}`,
      html: `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
      <tr><td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
          <tr><td style="background:#1e293b;padding:24px 32px;">
            <p style="margin:0;font-size:14px;font-weight:600;color:#ffffff;">New ${LEAD_TYPE_LABELS[leadType] || 'Lead'}</p>
          </td></tr>
          <tr><td style="padding:32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
                <p style="margin:0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Name</p>
                <p style="margin:4px 0 0;font-size:14px;color:#111827;">${name}</p>
              </td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
                <p style="margin:0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Email</p>
                <p style="margin:4px 0 0;font-size:14px;color:#111827;"><a href="mailto:${email}" style="color:#0F766E;">${email}</a></p>
              </td></tr>
              ${subject ? `<tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
                <p style="margin:0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Subject</p>
                <p style="margin:4px 0 0;font-size:14px;color:#111827;">${subject}</p>
              </td></tr>` : ''}
              <tr><td style="padding:8px 0;">
                <p style="margin:0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Message</p>
                <p style="margin:4px 0 0;font-size:14px;color:#374151;line-height:1.6;">${message}</p>
              </td></tr>
            </table>
            <a href="${getBase()}/admin/leads" style="display:inline-block;margin-top:24px;background:#0F766E;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
              View in Admin Leads
            </a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
  </html>
      `.trim(),
    });

  // ─── Promotion request: user confirmation ─────────────────────────────────

  exports.sendPromotionRequestConfirmation = ({ ownerEmail, ownerName, propertyTitle, tier, days }) =>
    send({
      to:      ownerEmail,
      subject: `Promotion request received — EmlakPro`,
      html: `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
      <tr><td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
          <tr><td style="background:#0F766E;padding:24px 32px;">
            <p style="margin:0;font-size:18px;font-weight:600;color:#ffffff;letter-spacing:-0.01em;">Əmlak Pro</p>
          </td></tr>
          <tr><td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:15px;color:#374151;">Hi ${ownerName || 'there'},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              Your <strong>${tier}</strong> promotion request for <strong>"${propertyTitle}"</strong> (${days} days) has been received and is pending review.
              We typically process requests within 1 business day.
            </p>
            <a href="${getBase()}/account/listings" style="display:inline-block;background:#0F766E;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
              View My Listings
            </a>
          </td></tr>
          <tr><td style="padding:16px 32px 24px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">Əmlak Pro · Baku, Azerbaijan</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
  </html>
      `.trim(),
    });

  // ─── Promotion request: admin notification ────────────────────────────────

  exports.sendPromotionRequestAdminNotification = ({ ownerName, ownerEmail, propertyTitle, tier, days }) =>
    send({
      to:      process.env.ADMIN_EMAIL || FROM,
      subject: `[EmlakPro] New promotion request — ${tier} · ${propertyTitle}`,
      html: `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
      <tr><td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
          <tr><td style="background:#1e293b;padding:24px 32px;">
            <p style="margin:0;font-size:14px;font-weight:600;color:#ffffff;">New Promotion Request — ${tier}</p>
          </td></tr>
          <tr><td style="padding:32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
                <p style="margin:0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Owner</p>
                <p style="margin:4px 0 0;font-size:14px;color:#111827;">${ownerName} · <a href="mailto:${ownerEmail}" style="color:#0F766E;">${ownerEmail}</a></p>
              </td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
                <p style="margin:0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Property</p>
                <p style="margin:4px 0 0;font-size:14px;color:#111827;">${propertyTitle}</p>
              </td></tr>
              <tr><td style="padding:8px 0;">
                <p style="margin:0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Requested</p>
                <p style="margin:4px 0 0;font-size:14px;color:#111827;">${tier} · ${days} days</p>
              </td></tr>
            </table>
            <a href="${getBase()}/admin/leads" style="display:inline-block;margin-top:24px;background:#0F766E;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
              Review in Admin
            </a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
  </html>
      `.trim(),
    });
  ```

- [ ] **Step 3: Verify mailer loads**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\server"
  node -e "const m = require('./lib/mailer'); console.log(Object.keys(m).join(', '))"
  ```
  Expected output must include: `sendInquiryNotification, sendPasswordReset, sendServiceLeadConfirmation, sendServiceLeadAdminNotification, sendPromotionRequestConfirmation, sendPromotionRequestAdminNotification, isEnabled`

- [ ] **Step 4: Commit**

  ```bash
  git add server/lib/mailer.js
  git commit -m "feat(mailer): add 4 email functions for service leads and promotion requests"
  ```

---

## Task 3: Wire Promotion Request Emails

**Files:**
- Modify: `server/controllers/promotionRequestController.js`

- [ ] **Step 1: Read `server/controllers/promotionRequestController.js`**

- [ ] **Step 2: Add mailer import at the top of the file**

  After the existing `require` lines, add:
  ```js
  const { sendPromotionRequestConfirmation, sendPromotionRequestAdminNotification } = require('../lib/mailer');
  ```

- [ ] **Step 3: Fire emails in `submitRequest`**

  Find the line `res.status(201).json(pr);` inside `exports.submitRequest`. **Before** it, add:

  ```js
  // Fire emails non-blocking — fetch owner details for the confirmation
  User.findById(req.user.id).select('name lastName email').then(owner => {
    if (!owner) return;
    const ownerName  = `${owner.name || ''}${owner.lastName ? ' ' + owner.lastName : ''}`.trim() || 'there';
    const propTitle  = property.title || String(propertyId);
    sendPromotionRequestConfirmation({
      ownerEmail:    owner.email,
      ownerName,
      propertyTitle: propTitle,
      tier:          requestedTier,
      days:          Number(requestedDays),
    }).catch(() => {});
    sendPromotionRequestAdminNotification({
      ownerName,
      ownerEmail:    owner.email,
      propertyTitle: propTitle,
      tier:          requestedTier,
      days:          Number(requestedDays),
    }).catch(() => {});
  }).catch(() => {});
  ```

  **Important:** `User` must be required at the top of the controller. Check if it is already imported. If not, add:
  ```js
  const User = require('../models/User');
  ```

- [ ] **Step 4: Verify controller loads**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\server"
  node -e "require('./controllers/promotionRequestController'); console.log('promotionRequestController OK')"
  ```
  Expected: `promotionRequestController OK`

- [ ] **Step 5: Commit**

  ```bash
  git add server/controllers/promotionRequestController.js
  git commit -m "feat(promotion): send user + admin emails on promotion request submission"
  ```

---

## Task 4: ContactUs.js — Convert to Form

**Files:**
- Modify: `client/src/pages/ContactUs.js`

- [ ] **Step 1: Read `client/src/pages/ContactUs.js`** to understand the current static structure.

- [ ] **Step 2: Completely replace `client/src/pages/ContactUs.js` with**

  ```jsx
  import React, { useState, useEffect } from 'react';
  import { useLocation } from 'react-router-dom';
  import { CheckCircle } from 'lucide-react';
  import { submitServiceLead } from '../services/api';
  import './StaticPages.css';
  import './ContactUs.css';

  const SUBJECT_TYPE_MAP = {
    'Photography booking':    'photography',
    'Virtual staging order':  'virtual_staging',
  };

  const ContactUs = () => {
    const location = useLocation();
    const navState = location.state || {};

    const [form, setForm] = useState({
      name:    '',
      email:   '',
      phone:   '',
      subject: navState.subject || '',
      message: '',
    });
    const [submitting,  setSubmitting]  = useState(false);
    const [submitted,   setSubmitted]   = useState(false);
    const [error,       setError]       = useState('');

    // Pre-fill subject if navigated from a service CTA
    useEffect(() => {
      if (navState.subject) {
        setForm(f => ({ ...f, subject: navState.subject }));
      }
    }, [navState.subject]);

    const handleChange = (e) => {
      const { name, value } = e.target;
      setForm(f => ({ ...f, [name]: value }));
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      setError('');
      if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
        setError('Name, email, and message are required.');
        return;
      }

      const leadType = SUBJECT_TYPE_MAP[form.subject] || 'contact';

      setSubmitting(true);
      try {
        await submitServiceLead({
          leadType,
          name:    form.name.trim(),
          email:   form.email.trim(),
          phone:   form.phone.trim(),
          subject: form.subject.trim(),
          message: form.message.trim(),
          meta:    { package: navState.package, tier: navState.tier },
        });
        setSubmitted(true);
      } catch (err) {
        const msg = err.response?.data?.message;
        setError(msg || 'Failed to send. Please try again or email us directly.');
      } finally {
        setSubmitting(false);
      }
    };

    if (submitted) {
      return (
        <div className="static-page-container">
          <div className="cu-success">
            <CheckCircle size={40} strokeWidth={1.5} color="var(--color-primary, #0F766E)" aria-hidden="true" />
            <h1>Message sent</h1>
            <p>Thank you for reaching out. We will get back to you within 1 business day.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="static-page-container">
        <div className="static-page-content">
          <h1>Contact Us</h1>
          <p className="subtitle">Get in touch with our team</p>

          <div className="cu-layout">

            {/* Contact info */}
            <div className="cu-info">
              <section>
                <h2>Customer Support</h2>
                <p>Account help, listing questions, and general enquiries.</p>
                <p><strong>Email:</strong> support@emlakpro.az</p>
                <p><strong>Phone:</strong> +994 12 345 67 89</p>
                <p><strong>Hours:</strong> Monday – Friday, 09:00 – 18:00 (GMT+4)</p>
              </section>
              <section>
                <h2>Business Inquiries</h2>
                <p>Partnerships, advertising, and commercial questions.</p>
                <p><strong>Email:</strong> business@emlakpro.az</p>
              </section>
              <section>
                <h2>Office</h2>
                <p>Nizami Street 123, Baku AZ1000, Azerbaijan</p>
              </section>
            </div>

            {/* Form */}
            <form className="cu-form" onSubmit={handleSubmit} noValidate>
              <h2>Send a message</h2>

              <div className="cu-field">
                <label htmlFor="cu-name">Name <span className="cu-required">*</span></label>
                <input
                  id="cu-name" name="name" type="text"
                  className="cu-input" value={form.name}
                  onChange={handleChange} maxLength={120}
                  placeholder="Your full name"
                />
              </div>

              <div className="cu-field">
                <label htmlFor="cu-email">Email <span className="cu-required">*</span></label>
                <input
                  id="cu-email" name="email" type="email"
                  className="cu-input" value={form.email}
                  onChange={handleChange} maxLength={200}
                  placeholder="you@example.com"
                />
              </div>

              <div className="cu-field">
                <label htmlFor="cu-phone">Phone <span className="cu-optional">(optional)</span></label>
                <input
                  id="cu-phone" name="phone" type="tel"
                  className="cu-input" value={form.phone}
                  onChange={handleChange} maxLength={30}
                  placeholder="+994 50 000 0000"
                />
              </div>

              <div className="cu-field">
                <label htmlFor="cu-subject">Subject</label>
                <input
                  id="cu-subject" name="subject" type="text"
                  className="cu-input" value={form.subject}
                  onChange={handleChange} maxLength={200}
                  placeholder="How can we help?"
                />
              </div>

              <div className="cu-field">
                <label htmlFor="cu-message">Message <span className="cu-required">*</span></label>
                <textarea
                  id="cu-message" name="message"
                  className="cu-textarea" rows={5}
                  value={form.message}
                  onChange={handleChange} maxLength={3000}
                  placeholder="Tell us what you need…"
                />
              </div>

              {error && <p className="cu-error" role="alert">{error}</p>}

              <button type="submit" className="cu-submit" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send message'}
              </button>
            </form>

          </div>
        </div>
      </div>
    );
  };

  export default ContactUs;
  ```

- [ ] **Step 3: Create `client/src/pages/ContactUs.css`**

  ```css
  .cu-layout {
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    gap: 48px;
    margin-top: 32px;
    align-items: start;
  }

  .cu-info section {
    margin-bottom: 28px;
  }

  .cu-info h2 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-graphite-900, #0f172a);
    margin: 0 0 8px;
  }

  .cu-info p {
    font-size: 0.9rem;
    color: var(--gray-500, #64748b);
    line-height: 1.6;
    margin: 0 0 4px;
  }

  .cu-form {
    background: var(--color-bg-surface, #fff);
    border: 1px solid var(--border-default, rgba(15,23,42,0.10));
    border-radius: 12px;
    padding: 28px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .cu-form h2 {
    font-size: 1.0625rem;
    font-weight: 700;
    color: var(--color-graphite-900, #0f172a);
    margin: 0 0 4px;
  }

  .cu-field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .cu-field label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-graphite-700, #334155);
  }

  .cu-required { color: #dc2626; margin-left: 2px; }
  .cu-optional { color: var(--gray-400, #94a3b8); font-weight: 400; font-size: 0.8125rem; }

  .cu-input,
  .cu-textarea {
    border: 1.5px solid var(--border-default, rgba(15,23,42,0.12));
    border-radius: 8px;
    padding: 9px 12px;
    font-size: 0.9rem;
    font-family: inherit;
    color: var(--color-graphite-700, #334155);
    background: var(--color-bg-surface, #fff);
    transition: border-color 0.12s;
  }

  .cu-input:focus,
  .cu-textarea:focus {
    outline: none;
    border-color: var(--color-primary, #0F766E);
  }

  .cu-textarea { resize: vertical; min-height: 120px; }

  .cu-error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 0.8125rem;
    color: #991b1b;
    margin: 0;
  }

  .cu-submit {
    padding: 11px 28px;
    background: var(--color-primary, #0F766E);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    align-self: flex-start;
    transition: background 0.15s;
  }
  .cu-submit:hover:not(:disabled) { background: #0d6560; }
  .cu-submit:disabled { opacity: 0.45; cursor: not-allowed; }

  .cu-success {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 60px 32px;
    text-align: center;
  }

  .cu-success h1 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-graphite-900, #0f172a);
    margin: 0;
  }

  .cu-success p {
    font-size: 0.9375rem;
    color: var(--gray-500, #64748b);
    margin: 0;
    max-width: 380px;
  }

  @media (max-width: 768px) {
    .cu-layout {
      grid-template-columns: 1fr;
      gap: 32px;
    }
  }
  ```

- [ ] **Step 4: ESLint check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint src/pages/ContactUs.js --max-warnings=0 2>&1 | tail -5
  ```
  Expected: no output.

- [ ] **Step 5: Commit**

  ```bash
  git add client/src/pages/ContactUs.js client/src/pages/ContactUs.css
  git commit -m "feat(contact): convert ContactUs to live form — submits ServiceLead, pre-fills from CTA state"
  ```

---

## Task 5: AdminLeads Page

**Files:**
- Create: `client/src/pages/AdminLeads.js`
- Create: `client/src/pages/AdminLeads.css`
- Modify: `client/src/App.js`

- [ ] **Step 1: Create `client/src/pages/AdminLeads.js`**

  ```jsx
  import React, { useEffect, useState, useCallback } from 'react';
  import { useAuth } from '../context/AuthContext';
  import { useToast } from '../components/Toast';
  import { getAdminLeads, updateLeadStatus, getAdminPromotionRequests, approvePromotionRequest, rejectPromotionRequest } from '../services/api';
  import './Admin.css';
  import './AdminLeads.css';

  const TABS = [
    { id: 'all',               label: 'All Leads'         },
    { id: 'photography',       label: 'Photography'       },
    { id: 'virtual_staging',   label: 'Virtual Staging'   },
    { id: 'contact',           label: 'Contact'           },
    { id: 'promotion_requests', label: 'Promotion Requests' },
  ];

  const STATUS_META = {
    new:       { label: 'New',       color: '#dc2626', bg: '#fef2f2' },
    contacted: { label: 'Contacted', color: '#d97706', bg: '#fffbeb' },
    completed: { label: 'Completed', color: '#16a34a', bg: '#f0fdf4' },
  };

  const PR_STATUS_META = {
    pending:  { label: 'Pending',  color: '#d97706', bg: '#fffbeb' },
    approved: { label: 'Approved', color: '#16a34a', bg: '#f0fdf4' },
    rejected: { label: 'Rejected', color: '#dc2626', bg: '#fef2f2' },
  };

  const LEAD_TYPE_LABELS = {
    photography:     'Photography',
    virtual_staging: 'Virtual Staging',
    contact:         'Contact',
  };

  const TIER_COLORS = {
    SPOTLIGHT: { color: '#0F766E', bg: '#f0fdf4' },
    PREMIUM:   { color: '#7c3aed', bg: '#f5f3ff' },
    FEATURED:  { color: '#d97706', bg: '#fffbeb' },
  };

  const AdminLeads = () => {
    const { user } = useAuth();
    const { success, error: showError } = useToast();

    const [activeTab,   setActiveTab]   = useState('all');
    const [leads,       setLeads]       = useState([]);
    const [promoReqs,   setPromoReqs]   = useState([]);
    const [total,       setTotal]       = useState(0);
    const [loading,     setLoading]     = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [page,        setPage]        = useState(1);
    const [pages,       setPages]       = useState(1);
    const [noteModal,   setNoteModal]   = useState(null); // { lead, nextStatus }
    const [noteText,    setNoteText]    = useState('');
    const [updating,    setUpdating]    = useState(false);

    const isPromoTab = activeTab === 'promotion_requests';

    const fetchLeads = useCallback(async (p = 1) => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (isPromoTab) {
          const res = await getAdminPromotionRequests(statusFilter || undefined, token);
          setLeads([]);
          setPromoReqs(res.data.requests || []);
          setTotal(res.data.total || 0);
          setPages(1);
        } else {
          const params = { page: p, limit: 25 };
          if (statusFilter) params.status = statusFilter;
          if (activeTab !== 'all') params.leadType = activeTab;
          const res = await getAdminLeads(params, token);
          setLeads(res.data.leads || []);
          setPromoReqs([]);
          setTotal(res.data.total || 0);
          setPages(Math.ceil((res.data.total || 0) / 25));
        }
        setPage(p);
      } catch (err) {
        showError('Failed to load leads.');
      } finally {
        setLoading(false);
      }
    }, [activeTab, statusFilter, isPromoTab, showError]);

    useEffect(() => { fetchLeads(1); }, [activeTab, statusFilter, fetchLeads]);

    const handleTabChange = (tabId) => {
      setActiveTab(tabId);
      setStatusFilter('');
      setPage(1);
    };

    const openNote = (item, nextStatus) => {
      setNoteModal({ item, nextStatus });
      setNoteText('');
    };

    const handleUpdateLeadStatus = async () => {
      if (!noteModal) return;
      setUpdating(true);
      try {
        const token = localStorage.getItem('token');
        await updateLeadStatus(noteModal.item._id, noteModal.nextStatus, noteText, token);
        success(`Marked as ${noteModal.nextStatus}.`);
        setNoteModal(null);
        fetchLeads(page);
      } catch (err) {
        showError('Failed to update status.');
      } finally {
        setUpdating(false);
      }
    };

    const handleApprovePromo = async (pr) => {
      try {
        const token = localStorage.getItem('token');
        await approvePromotionRequest(pr._id, '', token);
        success('Promotion approved and activated.');
        fetchLeads(page);
      } catch (err) {
        showError(err.response?.data?.message || 'Failed to approve.');
      }
    };

    const handleRejectPromo = async (pr) => {
      try {
        const token = localStorage.getItem('token');
        await rejectPromotionRequest(pr._id, '', token);
        success('Promotion request rejected.');
        fetchLeads(page);
      } catch (err) {
        showError('Failed to reject.');
      }
    };

    if (!user) return null;

    return (
      <div className="admin-page">
        <div className="admin-container">
          <div className="admin-page-header">
            <h1>Leads</h1>
            <p>Service inquiries, promotion requests, and contact submissions</p>
          </div>

          {/* Tabs */}
          <div className="al-tabs">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`al-tab-btn${activeTab === t.id ? ' al-tab-btn--active' : ''}`}
                onClick={() => handleTabChange(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="al-toolbar">
            <select
              className="al-filter-select"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All statuses</option>
              {isPromoTab ? (
                <>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </>
              ) : (
                <>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="completed">Completed</option>
                </>
              )}
            </select>
            <span className="al-total">{total} total</span>
          </div>

          {/* Table */}
          {loading ? (
            <div className="admin-loading">Loading…</div>
          ) : isPromoTab ? (
            <div className="al-table-wrap">
              <table className="al-table">
                <thead>
                  <tr>
                    <th>Owner</th>
                    <th>Property</th>
                    <th>Tier</th>
                    <th>Days</th>
                    <th>Status</th>
                    <th>Received</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {promoReqs.length === 0 ? (
                    <tr><td colSpan={7} className="al-empty-cell">No promotion requests.</td></tr>
                  ) : promoReqs.map(pr => {
                    const tc = TIER_COLORS[pr.requestedTier] || {};
                    const sm = PR_STATUS_META[pr.status] || PR_STATUS_META.pending;
                    return (
                      <tr key={pr._id}>
                        <td>
                          <div className="al-cell-name">{pr.ownerId?.name} {pr.ownerId?.lastName}</div>
                          <div className="al-cell-email">{pr.ownerId?.email}</div>
                        </td>
                        <td className="al-cell-subject">{pr.propertyId?.title || '—'}</td>
                        <td>
                          <span className="al-badge" style={{ color: tc.color, background: tc.bg }}>
                            {pr.requestedTier}
                          </span>
                        </td>
                        <td>{pr.requestedDays}d</td>
                        <td>
                          <span className="al-badge" style={{ color: sm.color, background: sm.bg }}>
                            {sm.label}
                          </span>
                        </td>
                        <td className="al-cell-date">
                          {new Date(pr.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td>
                          {pr.status === 'pending' && (
                            <div className="al-actions">
                              <button className="al-btn al-btn--approve" onClick={() => handleApprovePromo(pr)}>Approve</button>
                              <button className="al-btn al-btn--reject"  onClick={() => handleRejectPromo(pr)}>Reject</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="al-table-wrap">
              <table className="al-table">
                <thead>
                  <tr>
                    <th>Contact</th>
                    <th>Type</th>
                    <th>Subject</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>Received</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.length === 0 ? (
                    <tr><td colSpan={7} className="al-empty-cell">No leads found.</td></tr>
                  ) : leads.map(lead => {
                    const sm = STATUS_META[lead.status] || STATUS_META.new;
                    return (
                      <tr key={lead._id}>
                        <td>
                          <div className="al-cell-name">{lead.name}</div>
                          <div className="al-cell-email">{lead.email}</div>
                          {lead.phone && <div className="al-cell-email">{lead.phone}</div>}
                        </td>
                        <td>
                          <span className="al-type-chip">
                            {LEAD_TYPE_LABELS[lead.leadType] || lead.leadType}
                          </span>
                        </td>
                        <td className="al-cell-subject">{lead.subject || '—'}</td>
                        <td className="al-cell-message">{lead.message.slice(0, 80)}{lead.message.length > 80 ? '…' : ''}</td>
                        <td>
                          <span className="al-badge" style={{ color: sm.color, background: sm.bg }}>
                            {sm.label}
                          </span>
                        </td>
                        <td className="al-cell-date">
                          {new Date(lead.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td>
                          <div className="al-actions">
                            {lead.status === 'new' && (
                              <button className="al-btn al-btn--contacted" onClick={() => openNote(lead, 'contacted')}>
                                Mark contacted
                              </button>
                            )}
                            {lead.status !== 'completed' && (
                              <button className="al-btn al-btn--complete" onClick={() => openNote(lead, 'completed')}>
                                Complete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!isPromoTab && pages > 1 && (
            <div className="admin-pagination">
              <button disabled={page === 1} onClick={() => fetchLeads(page - 1)}>Previous</button>
              <span>Page {page} of {pages}</span>
              <button disabled={page >= pages} onClick={() => fetchLeads(page + 1)}>Next</button>
            </div>
          )}

        </div>

        {/* Note modal for status updates */}
        {noteModal && (
          <div className="al-note-overlay" onClick={() => !updating && setNoteModal(null)}>
            <div className="al-note-dialog" onClick={e => e.stopPropagation()}>
              <h3>Mark as {noteModal.nextStatus}</h3>
              <textarea
                className="al-note-input"
                rows={3}
                placeholder="Optional admin note…"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
              />
              <div className="al-note-actions">
                <button onClick={() => setNoteModal(null)} disabled={updating}>Cancel</button>
                <button className="al-btn--approve" onClick={handleUpdateLeadStatus} disabled={updating}>
                  {updating ? 'Saving…' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  export default AdminLeads;
  ```

- [ ] **Step 2: Create `client/src/pages/AdminLeads.css`**

  ```css
  .al-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .al-tab-btn {
    padding: 7px 14px;
    border-radius: 7px;
    border: 1.5px solid var(--border-default, rgba(15,23,42,0.10));
    background: none;
    font-size: 0.8125rem;
    color: var(--gray-500, #64748b);
    cursor: pointer;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
  }

  .al-tab-btn--active {
    background: var(--color-primary, #0F766E);
    border-color: var(--color-primary, #0F766E);
    color: #fff;
    font-weight: 600;
  }

  .al-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .al-filter-select {
    border: 1.5px solid var(--border-default, rgba(15,23,42,0.10));
    border-radius: 7px;
    padding: 7px 12px;
    font-size: 0.875rem;
    background: var(--color-bg-surface, #fff);
    color: var(--color-graphite-700, #334155);
    cursor: pointer;
  }

  .al-total {
    font-size: 0.8125rem;
    color: var(--gray-400, #94a3b8);
    margin-left: auto;
  }

  .al-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border-subtle, rgba(15,23,42,0.08));
    border-radius: 10px;
  }

  .al-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .al-table th {
    padding: 10px 14px;
    text-align: left;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--gray-500, #64748b);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: var(--gray-50, #f8fafc);
    border-bottom: 1px solid var(--border-subtle, rgba(15,23,42,0.08));
  }

  .al-table td {
    padding: 12px 14px;
    border-bottom: 1px solid var(--border-subtle, rgba(15,23,42,0.06));
    vertical-align: top;
  }

  .al-table tr:last-child td {
    border-bottom: none;
  }

  .al-cell-name  { font-weight: 600; color: var(--color-graphite-800, #1e293b); }
  .al-cell-email { font-size: 0.75rem; color: var(--gray-400, #94a3b8); margin-top: 2px; }
  .al-cell-date  { font-size: 0.75rem; color: var(--gray-400, #94a3b8); white-space: nowrap; }
  .al-cell-subject { max-width: 160px; color: var(--color-graphite-700, #334155); }
  .al-cell-message { max-width: 220px; color: var(--gray-500, #64748b); font-size: 0.8125rem; line-height: 1.5; }

  .al-empty-cell {
    text-align: center;
    padding: 32px !important;
    color: var(--gray-400, #94a3b8);
    font-size: 0.9rem;
  }

  .al-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 20px;
    font-size: 0.6875rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .al-type-chip {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: var(--gray-100, #f1f5f9);
    color: var(--gray-600, #475569);
    white-space: nowrap;
  }

  .al-actions { display: flex; gap: 6px; flex-wrap: wrap; }

  .al-btn {
    padding: 5px 10px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
    white-space: nowrap;
    transition: background 0.12s;
  }

  .al-btn--approve, .al-btn--complete {
    background: #f0fdf4;
    border-color: #bbf7d0;
    color: #166534;
  }
  .al-btn--approve:hover, .al-btn--complete:hover { background: #dcfce7; }

  .al-btn--reject {
    background: #fef2f2;
    border-color: #fecaca;
    color: #991b1b;
  }
  .al-btn--reject:hover { background: #fee2e2; }

  .al-btn--contacted {
    background: #fffbeb;
    border-color: #fde68a;
    color: #92400e;
  }
  .al-btn--contacted:hover { background: #fef3c7; }

  /* Note modal */
  .al-note-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15,23,42,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1200;
    padding: 16px;
  }

  .al-note-dialog {
    background: var(--color-bg-surface, #fff);
    border-radius: 10px;
    padding: 24px;
    width: 100%;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    box-shadow: 0 16px 32px -8px rgba(15,23,42,0.18);
  }

  .al-note-dialog h3 {
    font-size: 1rem;
    font-weight: 700;
    margin: 0;
    color: var(--color-graphite-900, #0f172a);
    text-transform: capitalize;
  }

  .al-note-input {
    border: 1.5px solid var(--border-default, rgba(15,23,42,0.12));
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 0.875rem;
    font-family: inherit;
    resize: vertical;
    color: var(--color-graphite-700, #334155);
  }
  .al-note-input:focus { outline: none; border-color: var(--color-primary, #0F766E); }

  .al-note-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .al-note-actions button {
    padding: 8px 16px;
    border-radius: 7px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border: 1.5px solid var(--border-default, rgba(15,23,42,0.12));
    background: none;
    color: var(--gray-600, #475569);
  }
  .al-note-actions button:last-child {
    background: var(--color-primary, #0F766E);
    border-color: var(--color-primary, #0F766E);
    color: #fff;
  }
  .al-note-actions button:disabled { opacity: 0.45; cursor: not-allowed; }
  ```

- [ ] **Step 3: Add `/admin/leads` route to `client/src/App.js`**

  Read `client/src/App.js`. Find the admin lazy imports block (near `const AdminAbuse = lazy(...)`). Add:
  ```jsx
  const AdminLeads = lazy(() => import('./pages/AdminLeads'));
  ```

  Find the admin routes section (near `<Route path="/admin/abuse" ...>`). Add:
  ```jsx
  <Route path="/admin/leads" element={
    <ProtectedRoute requireAdmin><MainLayout><AdminLeads /></MainLayout></ProtectedRoute>
  } />
  ```

- [ ] **Step 4: ESLint check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint src/pages/AdminLeads.js src/pages/ContactUs.js --max-warnings=0 2>&1 | tail -5
  ```
  Expected: no output.

- [ ] **Step 5: Commit**

  ```bash
  git add client/src/pages/AdminLeads.js client/src/pages/AdminLeads.css client/src/pages/ContactUs.js client/src/pages/ContactUs.css client/src/App.js
  git commit -m "feat(admin): add unified AdminLeads dashboard (service leads + promotion requests)"
  ```

---

## Task 6: Homepage Service Trust Strip

**Files:**
- Modify: `client/src/pages/HomeNew.js`
- Modify: `client/src/pages/HomeNew.css`

- [ ] **Step 1: Read `client/src/pages/HomeNew.js`** to find the location of the existing `trust-pillars` section (around line 697).

- [ ] **Step 2: Add service strip import**

  Find the lucide-react import in HomeNew.js. Add `Camera`, `Layers`, `ShieldCheck`, `Award` to the imports if they are not already present.

- [ ] **Step 3: Insert service highlights strip just BEFORE the existing `trust-pillars` section**

  Find the `<section className="trust-pillars"` opening tag. Insert this block immediately before it:

  ```jsx
  {/* Service highlights strip */}
  <section className="svc-strip" aria-label="Platform services">
    <div className="svc-strip-inner">
      {[
        {
          icon: <ShieldCheck size={22} strokeWidth={1.5} aria-hidden="true" />,
          title: 'Verified Owners',
          desc:  'Listings backed by identity and document checks.',
          href:  '/trust',
        },
        {
          icon: <Camera size={22} strokeWidth={1.5} aria-hidden="true" />,
          title: 'Professional Photography',
          desc:  'High-resolution shoots with 24-hour delivery.',
          href:  '/services/photoshoot',
        },
        {
          icon: <Layers size={22} strokeWidth={1.5} aria-hidden="true" />,
          title: 'AI Virtual Staging',
          desc:  'Transform empty rooms — from AZN 50 per room.',
          href:  '/services/staging',
        },
        {
          icon: <Award size={22} strokeWidth={1.5} aria-hidden="true" />,
          title: 'Trusted Marketplace',
          desc:  'Fraud detection, moderation, and transparent rankings.',
          href:  '/trust',
        },
      ].map((item, i) => (
        <Link key={i} to={item.href} className="svc-tile">
          <span className="svc-tile-icon">{item.icon}</span>
          <h3 className="svc-tile-title">{item.title}</h3>
          <p className="svc-tile-desc">{item.desc}</p>
        </Link>
      ))}
    </div>
  </section>
  ```

  **Note:** `Link` from `react-router-dom` is already imported in HomeNew.js.

- [ ] **Step 4: Add styles to `client/src/pages/HomeNew.css`**

  Read `HomeNew.css` to find the end of the file. Append:

  ```css
  /* ── Service highlights strip ────────────────────────────────────────────── */

  .svc-strip {
    background: var(--color-bg-surface, #fff);
    border-top:    1px solid var(--border-subtle, rgba(15,23,42,0.07));
    border-bottom: 1px solid var(--border-subtle, rgba(15,23,42,0.07));
    padding: 40px 20px;
  }

  .svc-strip-inner {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
  }

  .svc-tile {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 20px;
    border-radius: 10px;
    border: 1px solid var(--border-subtle, rgba(15,23,42,0.07));
    text-decoration: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .svc-tile:hover {
    border-color: var(--color-primary, #0F766E);
    box-shadow: 0 2px 12px rgba(15,118,110,0.10);
  }

  .svc-tile-icon {
    color: var(--color-primary, #0F766E);
    display: flex;
  }

  .svc-tile-title {
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--color-graphite-800, #1e293b);
    margin: 0;
  }

  .svc-tile-desc {
    font-size: 0.8125rem;
    color: var(--gray-500, #64748b);
    margin: 0;
    line-height: 1.5;
  }

  @media (max-width: 900px) {
    .svc-strip-inner { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 540px) {
    .svc-strip-inner { grid-template-columns: 1fr; gap: 12px; }
  }
  ```

- [ ] **Step 5: ESLint check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint src/pages/HomeNew.js --max-warnings=0 2>&1 | tail -5
  ```
  Expected: no output.

- [ ] **Step 6: Commit**

  ```bash
  git add client/src/pages/HomeNew.js client/src/pages/HomeNew.css
  git commit -m "feat(homepage): add 4-tile service highlights strip above trust pillars"
  ```

---

## Task 7: Footer Modernization

**Files:**
- Modify: `client/src/layouts/Footer.js`
- Modify: `client/src/layouts/Footer.css`

- [ ] **Step 1: Read both files** to understand the existing column structure and CSS.

- [ ] **Step 2: Add Services and Support columns to `Footer.js`**

  Find the closing `</nav>` tag in the `footer-top` section. Before it, the existing footer has Platform, Company, and Legal columns. Add these two new columns after the Company column and before the Legal column:

  ```jsx
  <div className="footer-col">
    <h4 className="footer-col-title">Services</h4>
    <ul>
      <li><Link to="/services/photoshoot">Photography</Link></li>
      <li><Link to="/services/staging">Virtual Staging</Link></li>
      <li><Link to="/verification-application">Ownership Verification</Link></li>
      <li><Link to="/advertise">Promote Listing</Link></li>
      <li><Link to="/services/contracts">Contracts</Link></li>
    </ul>
  </div>
  <div className="footer-col">
    <h4 className="footer-col-title">Support</h4>
    <ul>
      <li><Link to="/help">Help Centre</Link></li>
      <li><Link to="/contact">Contact Us</Link></li>
      <li><Link to="/trust">Marketplace Trust</Link></li>
      <li><Link to="/resources">Resources</Link></li>
    </ul>
  </div>
  ```

- [ ] **Step 3: Update `Footer.css` to accommodate 5 columns**

  Read `Footer.css`. Find the `.footer-nav` rule. Update the grid to handle 5 columns:

  Change the existing `.footer-nav` grid declaration to:
  ```css
  .footer-nav {
    display: grid;
    grid-template-columns: repeat(5, auto);
    gap: 40px;
  }
  ```

  **Note:** If there is already a `grid-template-columns` rule for `footer-nav` set to 3 columns, replace that value with `repeat(5, auto)`.

  Also check for any responsive breakpoint that reduces to fewer columns — update it to:
  ```css
  @media (max-width: 900px) {
    .footer-nav { grid-template-columns: repeat(3, auto); }
  }
  @media (max-width: 600px) {
    .footer-nav { grid-template-columns: repeat(2, auto); gap: 24px; }
  }
  ```

  If these breakpoints don't exist, add them.

- [ ] **Step 4: ESLint check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint src/layouts/Footer.js --max-warnings=0 2>&1 | tail -5
  ```
  Expected: no output.

- [ ] **Step 5: Commit**

  ```bash
  git add client/src/layouts/Footer.js client/src/layouts/Footer.css
  git commit -m "feat(footer): add Services and Support columns with all service page links"
  ```

---

## Task 8: SeoHead Component

**Files:**
- Create: `client/src/components/SeoHead.js`

- [ ] **Step 1: Create `client/src/components/SeoHead.js`**

  ```js
  import { useEffect } from 'react';

  const SITE_NAME = 'Əmlak Pro';
  const DEFAULT_IMAGE = '/og-default.jpg';

  function setMetaByName(name, content) {
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function setMetaByProperty(property, content) {
    let el = document.querySelector(`meta[property="${property}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', property);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function setCanonical(href) {
    let el = document.querySelector('link[rel="canonical"]');
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', 'canonical');
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  }

  /**
   * SeoHead — sets document.title and meta tags without a package dependency.
   * Renders nothing. Call at the top of any page component.
   *
   * @param {string}  title       Page-specific title (no site suffix needed)
   * @param {string}  description 140–160 character description
   * @param {string}  [canonical] Full canonical URL. Defaults to current href.
   * @param {string}  [image]     OG/Twitter image URL. Defaults to /og-default.jpg.
   */
  const SeoHead = ({ title, description, canonical, image }) => {
    const fullTitle  = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const ogImage    = image || DEFAULT_IMAGE;
    const canonUrl   = canonical || (typeof window !== 'undefined' ? window.location.href : '');

    useEffect(() => {
      document.title = fullTitle;

      setMetaByName('description',         description || '');
      setMetaByProperty('og:title',        fullTitle);
      setMetaByProperty('og:description',  description || '');
      setMetaByProperty('og:image',        ogImage);
      setMetaByProperty('og:url',          canonUrl);
      setMetaByProperty('og:type',         'website');
      setMetaByProperty('og:site_name',    SITE_NAME);
      setMetaByName('twitter:card',        'summary_large_image');
      setMetaByName('twitter:title',       fullTitle);
      setMetaByName('twitter:description', description || '');
      setMetaByName('twitter:image',       ogImage);
      setCanonical(canonUrl);
    }, [fullTitle, description, canonUrl, ogImage]);

    return null;
  };

  export default SeoHead;
  ```

- [ ] **Step 2: ESLint check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint src/components/SeoHead.js --max-warnings=0 2>&1 | tail -5
  ```
  Expected: no output.

- [ ] **Step 3: Commit**

  ```bash
  git add client/src/components/SeoHead.js
  git commit -m "feat(seo): add SeoHead utility — writes title, meta, OG, Twitter card, canonical"
  ```

---

## Task 9: SEO on All Service Pages

**Files:**
- Modify: `client/src/pages/BookPhotoshoot.js`
- Modify: `client/src/pages/DigitalStaging.js`
- Modify: `client/src/pages/Services.js`
- Modify: `client/src/pages/PrepareContract.js`
- Modify: `client/src/pages/ListProperty.js`
- Modify: `client/src/pages/ShortTermRental.js`
- Modify: `client/src/pages/Advertise.js`
- Modify: `client/src/pages/VerificationApplication.js`

For each file, the changes are:
1. Add `import SeoHead from '../components/SeoHead';`
2. Render `<SeoHead ... />` as the first child inside the outermost JSX element

**Read each file before editing to understand the JSX structure and adjust the import path depth if needed.**

- [ ] **Step 1: `BookPhotoshoot.js`**

  Add import: `import SeoHead from '../components/SeoHead';`

  Inside the component's `return (...)`, make `<SeoHead>` the first child of the outermost `<div className="service-page">`:

  ```jsx
  <SeoHead
    title="Professional Property Photography"
    description="High-quality property photography in Baku. 3 packages from AZN 149. HDR processing, drone shots, 24-hour delivery."
    canonical="https://emlakpro.az/services/photoshoot"
  />
  ```

- [ ] **Step 2: `DigitalStaging.js`**

  ```jsx
  <SeoHead
    title="Virtual Staging Services"
    description="Virtually stage empty rooms in 48 hours. From AZN 50 per room. Photorealistic furniture, unlimited revisions on bundle orders."
    canonical="https://emlakpro.az/services/staging"
  />
  ```

- [ ] **Step 3: `Services.js`**

  Read the file. Add import and render at top of JSX:
  ```jsx
  <SeoHead
    title="Property Services"
    description="Professional real estate services in Azerbaijan — photography, virtual staging, ownership verification, contract preparation, and promotion."
    canonical="https://emlakpro.az/services"
  />
  ```

- [ ] **Step 4: `PrepareContract.js`**

  ```jsx
  <SeoHead
    title="Prepare a Contract"
    description="Get expert help preparing property sale or rental contracts in Azerbaijan. Legally sound, fast turnaround."
    canonical="https://emlakpro.az/services/contracts"
  />
  ```

- [ ] **Step 5: `ListProperty.js`**

  ```jsx
  <SeoHead
    title="List Your Property"
    description="List your property on Əmlak Pro — Azerbaijan's premium property marketplace. Reach thousands of verified buyers and renters."
    canonical="https://emlakpro.az/services/list-property"
  />
  ```

- [ ] **Step 6: `ShortTermRental.js`**

  ```jsx
  <SeoHead
    title="Short-Term Rental Services"
    description="Manage your short-term rental property with Əmlak Pro. Professional listing, photography, and guest management."
    canonical="https://emlakpro.az/services/short-term-rental"
  />
  ```

- [ ] **Step 7: `Advertise.js`**

  ```jsx
  <SeoHead
    title="Advertise Your Property"
    description="Promote your listing to thousands of buyers on Əmlak Pro. Featured, Premium, and Spotlight tiers available."
    canonical="https://emlakpro.az/advertise"
  />
  ```

- [ ] **Step 8: `VerificationApplication.js`**

  ```jsx
  <SeoHead
    title="Ownership Verification"
    description="Verify your property ownership on Əmlak Pro. Verified listings appear higher in search and earn buyer trust."
    canonical="https://emlakpro.az/verification-application"
  />
  ```

- [ ] **Step 9: ESLint check all 8 files**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint \
    src/pages/BookPhotoshoot.js \
    src/pages/DigitalStaging.js \
    src/pages/Services.js \
    src/pages/PrepareContract.js \
    src/pages/ListProperty.js \
    src/pages/ShortTermRental.js \
    src/pages/Advertise.js \
    src/pages/VerificationApplication.js \
    --max-warnings=0 2>&1 | tail -10
  ```
  Expected: no output.

- [ ] **Step 10: Commit**

  ```bash
  git add \
    client/src/pages/BookPhotoshoot.js \
    client/src/pages/DigitalStaging.js \
    client/src/pages/Services.js \
    client/src/pages/PrepareContract.js \
    client/src/pages/ListProperty.js \
    client/src/pages/ShortTermRental.js \
    client/src/pages/Advertise.js \
    client/src/pages/VerificationApplication.js \
    client/src/components/SeoHead.js
  git commit -m "feat(seo): add title, description, OG, Twitter card, canonical to all service pages"
  ```

---

## Task 10: Build Verification

- [ ] **Step 1: Server syntax check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\server"
  node -e "
    require('./models/ServiceLead');
    require('./controllers/serviceLeadController');
    require('./routes/serviceLeadRoutes');
    require('./lib/mailer');
    require('./controllers/promotionRequestController');
    console.log('All Phase 5.5C server modules OK');
  "
  ```
  Expected: `All Phase 5.5C server modules OK`

- [ ] **Step 2: ESLint sweep — all modified/created client files**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint \
    src/pages/AdminLeads.js \
    src/pages/ContactUs.js \
    src/pages/HomeNew.js \
    src/layouts/Footer.js \
    src/components/SeoHead.js \
    src/pages/BookPhotoshoot.js \
    src/pages/DigitalStaging.js \
    src/pages/Services.js \
    src/pages/PrepareContract.js \
    src/pages/ListProperty.js \
    src/pages/ShortTermRental.js \
    src/pages/Advertise.js \
    src/pages/VerificationApplication.js \
    src/services/api.js \
    --max-warnings=0 2>&1 | tail -10
  ```
  Expected: no output.

- [ ] **Step 3: React build — zero errors**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  npm run build 2>&1 | grep -E "^(Compiled|ERROR|Failed)" | head -10
  ```
  Expected: `Compiled successfully.` or `Compiled with warnings.`

- [ ] **Step 4: Analytics preservation check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  node -e "
    const fs = require('fs');
    const src = fs.readFileSync('src/services/analytics.js', 'utf8');
    const required = [
      'photography_page_viewed','virtual_staging_page_viewed',
      'promotion_page_viewed','promotion_plan_selected',
      'verification_page_viewed','service_inquiry_submitted'
    ];
    const missing = required.filter(e => !src.includes(e));
    if (missing.length) { console.error('MISSING EVENTS:', missing); process.exit(1); }
    else console.log('All Phase 5.5B analytics events preserved.');
  "
  ```
  Expected: `All Phase 5.5B analytics events preserved.`

- [ ] **Step 5: Git status — confirm clean tree**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app"
  git log --oneline -12
  git status
  ```

---

## Deliverables Summary

### New files (6)
| File | Purpose |
|---|---|
| `server/models/ServiceLead.js` | Photography / virtual staging / contact inquiries |
| `server/controllers/serviceLeadController.js` | submit, list, updateStatus |
| `server/routes/serviceLeadRoutes.js` | 3 API routes |
| `client/src/pages/AdminLeads.js` | Unified leads dashboard |
| `client/src/pages/AdminLeads.css` | Dashboard styles |
| `client/src/components/SeoHead.js` | Title + meta + OG + Twitter card + canonical |

### Modified files (17)
| File | Change |
|---|---|
| `server/lib/mailer.js` | 4 new email functions |
| `server/controllers/promotionRequestController.js` | Fire 2 emails on submit |
| `server/server.js` | Mount `/api/service-leads` |
| `server/.env` | Document `ADMIN_EMAIL` var |
| `client/src/pages/ContactUs.js` | Live form + ServiceLead submission |
| `client/src/pages/ContactUs.css` | New (form styles) |
| `client/src/services/api.js` | 3 new client functions |
| `client/src/pages/AdminLeads.css` | New (dashboard styles) |
| `client/src/App.js` | `/admin/leads` route |
| `client/src/pages/HomeNew.js` | 4-tile service strip |
| `client/src/pages/HomeNew.css` | `.svc-strip` styles |
| `client/src/layouts/Footer.js` | Services + Support columns |
| `client/src/layouts/Footer.css` | 5-column grid |
| 8 service pages | `<SeoHead>` meta per page |
