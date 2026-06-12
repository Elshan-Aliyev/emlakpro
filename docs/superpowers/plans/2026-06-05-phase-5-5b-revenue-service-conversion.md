# Phase 5.5B — Revenue & Service Conversion Completion

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace stub service pages with conversion-ready content, wire a promotion request flow into My Listings, surface full promotion status (tier / dates / days remaining) to owners, and instrument 6 revenue-critical analytics events.

**Architecture:** All new UI is pure React with no external dependencies. The promotion request flow is backend-gated (model + REST endpoint) — no payment gateway. Analytics events are added to the existing `track()` wrapper and `TRACKED_FOR_STORE`. No new routes are added to `App.js`; `PromoteListingModal` is a modal component mounted inside `AccountListings`. Promotion visibility is an inline `PromotionStatusBlock` rendered in `AccountListings` (listing row) and `PropertyDetail` (owner edit bar).

**Tech Stack:** React 18 (lazy/Suspense already configured), Express/Mongoose (existing server), Lucide icons, `ServicePages.css` shared styles, CSS custom properties from `globals.css`.

---

## Revision Notes

| Decision | Detail |
|---|---|
| No payment gateway | Promotion requests go to an admin queue; admin approves via existing `PUT /api/admin/properties/:id/promotion` |
| PromoteListingModal | Modal component, not a route; imported directly into `AccountListings.js` |
| BookPhotoshoot | Rewrite in place — keep 3-tier pricing, add process/deliverables/FAQ/CTA |
| DigitalStaging | Full replacement of "Coming Soon" placeholder |
| Verify link fix | Change dead `<a href="/services/ownership-verification">` to `<Link to="/verification-application">` |
| Promotion visibility | Show tier + start date + expiry date + days remaining in AccountListings (per row) and PropertyDetail (owner edit bar) |
| service_inquiry_submitted | Fire on Photography and Virtual Staging CTA clicks; add to TRACKED_FOR_STORE |

---

## File Map

### New files

| File | Responsibility |
|---|---|
| `client/src/components/PromoteListingModal.js` | Tier comparison, duration picker, request submission, analytics |
| `client/src/components/PromoteListingModal.css` | Modal styles |
| `server/models/PromotionRequest.js` | Track user promotion requests (pending/approved/rejected) |
| `server/controllers/promotionRequestController.js` | submit, list (admin), approve, reject |
| `server/routes/promotionRequestRoutes.js` | POST `/`, GET `/admin`, PATCH `/:id/approve`, PATCH `/:id/reject` |

### Modified files

| File | Change |
|---|---|
| `client/src/pages/BookPhotoshoot.js` | Full rewrite: process, pricing, deliverables, FAQ, CTA |
| `client/src/pages/DigitalStaging.js` | Full rewrite: process, pricing, deliverables, FAQ, CTA |
| `client/src/pages/ServicePages.css` | Add process, deliverables, FAQ, CTA section styles |
| `client/src/pages/AccountListings.js` | Add Promote button + PromoteListingModal, fix verify link, show active tier chip |
| `client/src/pages/VerificationApplication.js` | Add `verification_page_viewed` on mount |
| `client/src/services/api.js` | Add `submitPromotionRequest`, `getAdminPromotionRequests`, `approvePromotionRequest`, `rejectPromotionRequest` |
| `client/src/services/analytics.js` | Add 5 events to `TRACKED_FOR_STORE` |
| `server/server.js` | Mount `promotionRequestRoutes` at `/api/promotion-requests` |

---

## Task 1: ServicePages.css — Add Shared Section Styles

**Files:**
- Modify: `client/src/pages/ServicePages.css`

- [ ] **Step 1: Append the following to `client/src/pages/ServicePages.css`**

  Read the file first to find the end, then append below all existing content:

  ```css
  /* ── Process section ──────────────────────────────────────────────────────── */

  .sp-section {
    padding: 56px 0;
    border-top: 1px solid var(--gray-100, #f3f4f6);
  }

  .sp-section-title {
    font-size: 1.375rem;
    font-weight: 700;
    color: var(--color-graphite-900, #0f172a);
    margin: 0 0 32px;
  }

  .sp-steps {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .sp-step {
    display: flex;
    gap: 18px;
    align-items: flex-start;
  }

  .sp-step-num {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--color-primary, #0F766E);
    color: #fff;
    font-size: 0.875rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .sp-step-body h4 {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--color-graphite-800, #1e293b);
    margin: 0 0 4px;
  }

  .sp-step-body p {
    font-size: 0.875rem;
    color: var(--gray-500, #64748b);
    margin: 0;
    line-height: 1.5;
  }

  /* ── Deliverables grid ─────────────────────────────────────────────────────── */

  .sp-deliverables-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
  }

  .sp-deliverable {
    background: var(--gray-50, #f8fafc);
    border: 1px solid var(--gray-100, #f1f5f9);
    border-radius: 10px;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .sp-deliverable-icon {
    color: var(--color-primary, #0F766E);
    display: flex;
  }

  .sp-deliverable h4 {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--color-graphite-800, #1e293b);
    margin: 0;
  }

  .sp-deliverable p {
    font-size: 0.8125rem;
    color: var(--gray-500, #64748b);
    margin: 0;
    line-height: 1.5;
  }

  /* ── FAQ accordion ─────────────────────────────────────────────────────────── */

  .sp-faq {
    display: flex;
    flex-direction: column;
    gap: 0;
    border: 1px solid var(--gray-100, #f1f5f9);
    border-radius: 10px;
    overflow: hidden;
  }

  .sp-faq-item {
    border-bottom: 1px solid var(--gray-100, #f1f5f9);
  }

  .sp-faq-item:last-child {
    border-bottom: none;
  }

  .sp-faq-q {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    cursor: pointer;
    background: var(--color-bg-surface, #fff);
    border: none;
    width: 100%;
    text-align: left;
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--color-graphite-800, #1e293b);
    gap: 12px;
  }

  .sp-faq-q:hover {
    background: var(--gray-50, #f8fafc);
  }

  .sp-faq-chevron {
    flex-shrink: 0;
    color: var(--gray-400, #94a3b8);
    transition: transform 0.2s;
  }

  .sp-faq-chevron--open {
    transform: rotate(180deg);
  }

  .sp-faq-a {
    padding: 0 20px 16px;
    font-size: 0.875rem;
    color: var(--gray-500, #64748b);
    line-height: 1.65;
    background: var(--gray-50, #f8fafc);
  }

  /* ── CTA bar ──────────────────────────────────────────────────────────────── */

  .sp-cta {
    background: var(--color-primary, #0F766E);
    border-radius: 12px;
    padding: 40px 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
    margin-top: 56px;
  }

  .sp-cta-text h3 {
    font-size: 1.125rem;
    font-weight: 700;
    color: #fff;
    margin: 0 0 6px;
  }

  .sp-cta-text p {
    font-size: 0.9rem;
    color: rgba(255,255,255,0.8);
    margin: 0;
  }

  .sp-cta-btn {
    padding: 12px 28px;
    background: #fff;
    color: var(--color-primary, #0F766E);
    border: none;
    border-radius: 8px;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s;
  }

  .sp-cta-btn:hover {
    background: #f0fdf4;
  }

  /* ── Package card fixes for hero gradient ──────────────────────────────────── */

  .service-hero--photography {
    background: linear-gradient(135deg, #0f172a 0%, #0F766E 100%);
  }

  .service-hero--staging {
    background: linear-gradient(135deg, #0f172a 0%, #6d28d9 60%, #0F766E 100%);
  }
  ```

- [ ] **Step 2: Build check (CSS only — no build needed, just verify no syntax issues)**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  node -e "require('fs').readFileSync('src/pages/ServicePages.css', 'utf8'); console.log('CSS readable OK')"
  ```
  Expected: `CSS readable OK`

- [ ] **Step 3: Commit**

  ```bash
  git add client/src/pages/ServicePages.css
  git commit -m "feat(services): add shared CSS for process, deliverables, FAQ, CTA sections"
  ```

---

## Task 2: Photography Service Page (BookPhotoshoot.js rewrite)

**Files:**
- Modify: `client/src/pages/BookPhotoshoot.js`

- [ ] **Step 1: Rewrite `client/src/pages/BookPhotoshoot.js`**

  Full replacement (read the file first — you are replacing all content):

  ```jsx
  import React, { useState, useEffect } from 'react';
  import { useNavigate } from 'react-router-dom';
  import { Camera, Clock, Star, Layers, CheckCircle, Image, FileImage, ChevronDown } from 'lucide-react';
  import { track } from '../services/analytics';
  import './ServicePages.css';

  const PACKAGES = [
    {
      id: 'basic',
      name: 'Basic',
      price: 149,
      features: ['15–20 edited photos', 'Standard colour correction', '24-hour delivery', 'High-resolution JPEGs'],
    },
    {
      id: 'standard',
      name: 'Standard',
      price: 299,
      popular: true,
      features: ['25–30 edited photos', 'HDR processing', 'Same-day delivery', 'Drone exterior shot (if permitted)', 'Twilight photo (1)'],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 499,
      features: ['40+ edited photos', 'Full HDR + advanced retouching', 'Priority same-day delivery', 'Drone footage & photos', 'Twilight photography (3)', '3D virtual tour', 'Video walkthrough (2 min)'],
    },
  ];

  const PROCESS_STEPS = [
    { title: 'Book a slot', desc: 'Choose a date and time that suits you. We confirm within 2 hours.' },
    { title: 'On-site shoot', desc: 'Our photographer arrives, stages the space, and captures every room.' },
    { title: 'Editing', desc: 'Colour-correction, HDR processing, and sky replacement applied overnight.' },
    { title: 'Review & approve', desc: 'You receive a private gallery link and can request up to 3 retouches.' },
    { title: 'Download & publish', desc: 'High-resolution files delivered via download link, ready to upload.' },
  ];

  const DELIVERABLES = [
    { icon: <Image size={20} strokeWidth={1.5} aria-hidden="true" />, title: 'High-res JPEGs', desc: 'Full-resolution files suitable for print and web.' },
    { icon: <FileImage size={20} strokeWidth={1.5} aria-hidden="true" />, title: 'Web-optimised set', desc: 'Compressed versions pre-sized for listing platforms.' },
    { icon: <Layers size={20} strokeWidth={1.5} aria-hidden="true" />, title: 'Drone shots', desc: 'Aerial exterior and neighbourhood shots (Standard & Premium).' },
    { icon: <Star size={20} strokeWidth={1.5} aria-hidden="true" />, title: 'Virtual tour', desc: '3D walkthrough embedded in your listing page (Premium).' },
    { icon: <Clock size={20} strokeWidth={1.5} aria-hidden="true" />, title: 'Fast turnaround', desc: '24-hour standard, same-day for Standard & Premium.' },
    { icon: <CheckCircle size={20} strokeWidth={1.5} aria-hidden="true" />, title: '3 free retouches', desc: 'Request changes within 7 days of delivery at no cost.' },
  ];

  const FAQS = [
    { q: 'How far in advance should I book?', a: 'We recommend 2–3 days in advance, but same-week slots are often available. Contact us to check availability.' },
    { q: 'What should I do to prepare the property?', a: 'Declutter surfaces, open blinds for natural light, and remove personal items from countertops. We can advise further during booking.' },
    { q: 'Do you work in all districts of Baku?', a: 'Yes. We cover all districts and also travel to other cities for Premium bookings (travel fee may apply).' },
    { q: 'Can I request additional photos after the shoot?', a: 'Yes, additional photos can be ordered at AZN 5 each within 30 days of the shoot.' },
    { q: 'Is drone photography always included?', a: 'Drone shots are included in Standard and Premium packages where permitted. Some high-density areas have airspace restrictions — we notify you in advance.' },
  ];

  const FaqItem = ({ q, a }) => {
    const [open, setOpen] = useState(false);
    return (
      <div className="sp-faq-item">
        <button className="sp-faq-q" onClick={() => setOpen(o => !o)} aria-expanded={open}>
          {q}
          <ChevronDown size={16} className={`sp-faq-chevron${open ? ' sp-faq-chevron--open' : ''}`} aria-hidden="true" />
        </button>
        {open && <div className="sp-faq-a">{a}</div>}
      </div>
    );
  };

  const BookPhotoshoot = () => {
    const navigate = useNavigate();
    const [selectedPackage, setSelectedPackage] = useState(null);

    useEffect(() => {
      track('photography_page_viewed', {});
    }, []);

    const handleBook = () => {
      navigate('/contact', { state: { subject: 'Photography booking', package: selectedPackage } });
    };

    return (
      <div className="service-page">
        <div className="service-hero service-hero--photography">
          <div className="service-hero-content">
            <h1>Professional Property Photography</h1>
            <p>High-quality photos that sell properties faster and for more</p>
          </div>
        </div>

        <div className="service-container">

          {/* Packages */}
          <div className="packages-grid">
            {PACKAGES.map(pkg => (
              <div
                key={pkg.id}
                className={`package-card${selectedPackage === pkg.id ? ' selected' : ''}${pkg.popular ? ' popular' : ''}`}
                onClick={() => setSelectedPackage(pkg.id)}
              >
                {pkg.popular && <div className="popular-badge">Most Popular</div>}
                <h3>{pkg.name}</h3>
                <div className="package-price">
                  <span className="currency">AZN</span>
                  <span className="amount">{pkg.price}</span>
                </div>
                <ul className="package-features">
                  {pkg.features.map((f, i) => <li key={i}><CheckCircle size={14} strokeWidth={2} aria-hidden="true" /> {f}</li>)}
                </ul>
                <button
                  className="btn-select-package"
                  onClick={(e) => { e.stopPropagation(); setSelectedPackage(pkg.id); handleBook(); }}
                >
                  Book {pkg.name}
                </button>
              </div>
            ))}
          </div>

          {/* Process */}
          <div className="sp-section">
            <h2 className="sp-section-title">How it works</h2>
            <div className="sp-steps">
              {PROCESS_STEPS.map((s, i) => (
                <div key={i} className="sp-step">
                  <div className="sp-step-num">{i + 1}</div>
                  <div className="sp-step-body">
                    <h4>{s.title}</h4>
                    <p>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deliverables */}
          <div className="sp-section">
            <h2 className="sp-section-title">What you receive</h2>
            <div className="sp-deliverables-grid">
              {DELIVERABLES.map((d, i) => (
                <div key={i} className="sp-deliverable">
                  <span className="sp-deliverable-icon">{d.icon}</span>
                  <h4>{d.title}</h4>
                  <p>{d.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="sp-section">
            <h2 className="sp-section-title">Frequently asked questions</h2>
            <div className="sp-faq">
              {FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
            </div>
          </div>

          {/* CTA */}
          <div className="sp-cta">
            <div className="sp-cta-text">
              <h3>Ready to book a shoot?</h3>
              <p>We'll confirm your slot within 2 hours and send a preparation checklist.</p>
            </div>
            <button className="sp-cta-btn" onClick={handleBook}>
              Book a Photoshoot
            </button>
          </div>

        </div>
      </div>
    );
  };

  export default BookPhotoshoot;
  ```

- [ ] **Step 2: ESLint check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint src/pages/BookPhotoshoot.js --max-warnings=0 2>&1 | tail -5
  ```
  Expected: no output (0 warnings, 0 errors).

- [ ] **Step 3: Commit**

  ```bash
  git add client/src/pages/BookPhotoshoot.js
  git commit -m "feat(services): rewrite BookPhotoshoot — process, pricing, deliverables, FAQ, CTA"
  ```

---

## Task 3: Virtual Staging Service Page (DigitalStaging.js rewrite)

**Files:**
- Modify: `client/src/pages/DigitalStaging.js`

- [ ] **Step 1: Rewrite `client/src/pages/DigitalStaging.js`**

  Full replacement (read the file first — you are replacing all content):

  ```jsx
  import React, { useState, useEffect } from 'react';
  import { useNavigate } from 'react-router-dom';
  import { Layers, Sofa, Eye, Download, Clock, RefreshCcw, ChevronDown, CheckCircle } from 'lucide-react';
  import { track } from '../services/analytics';
  import './ServicePages.css';

  const PRICING_TIERS = [
    {
      id: 'single',
      name: 'Single Room',
      price: 50,
      unit: 'per room',
      features: ['1 room virtually staged', '3 style options to choose from', '48-hour delivery', 'High-resolution output', '2 revisions included'],
    },
    {
      id: 'bundle',
      name: 'Room Bundle',
      price: 180,
      unit: '4 rooms',
      popular: true,
      features: ['4 rooms virtually staged', 'Consistent style across all rooms', '48-hour delivery', 'High-resolution output', 'Unlimited revisions (7 days)', 'Before/After comparison images'],
    },
    {
      id: 'full',
      name: 'Full Property',
      price: 350,
      unit: 'up to 10 rooms',
      features: ['All rooms (up to 10) staged', 'Multiple style themes', '24-hour priority delivery', 'High-resolution + web-optimised output', 'Unlimited revisions (14 days)', 'Before/After images', 'Print-ready files'],
    },
  ];

  const PROCESS_STEPS = [
    { title: 'Send floor photos', desc: 'Submit photos of the empty rooms via the booking form. Any smartphone quality works.' },
    { title: 'Choose your style', desc: 'Select a style: Modern, Scandinavian, Classic, or Minimalist. We match furniture to your target buyer.' },
    { title: 'Staging in 48 hours', desc: 'Our design team digitally places furniture, lighting, and decor into each photo.' },
    { title: 'Review the results', desc: 'Receive your staged images and request revisions. No back-and-forth limit on bundle orders.' },
    { title: 'Download & publish', desc: 'High-resolution files ready to upload directly to your listing.' },
  ];

  const DELIVERABLES = [
    { icon: <Sofa size={20} strokeWidth={1.5} aria-hidden="true" />, title: 'Staged photos', desc: 'Realistic furniture and décor placed in each room.' },
    { icon: <Eye size={20} strokeWidth={1.5} aria-hidden="true" />, title: 'Style options', desc: 'Modern, Scandinavian, Classic, or Minimalist themes.' },
    { icon: <Download size={20} strokeWidth={1.5} aria-hidden="true" />, title: 'High-res + web files', desc: 'Full-resolution and compressed sets for every use.' },
    { icon: <RefreshCcw size={20} strokeWidth={1.5} aria-hidden="true" />, title: 'Revision rounds', desc: '2 revisions (Single), unlimited for Bundle and Full.' },
    { icon: <Clock size={20} strokeWidth={1.5} aria-hidden="true" />, title: '48-hour turnaround', desc: '24-hour priority turnaround available on Full Property.' },
    { icon: <Layers size={20} strokeWidth={1.5} aria-hidden="true" />, title: 'Before/After images', desc: 'Side-by-side comparison images included in Bundle and Full.' },
  ];

  const FAQS = [
    { q: 'Do you need high-quality photos to stage?', a: 'No. Standard smartphone photos work fine as long as the room is well-lit. We clean up minor lens distortion during editing.' },
    { q: 'How realistic does the staging look?', a: 'Very. We use photorealistic 3D assets and match natural lighting in each photo. Buyers regularly comment they thought the staging was real.' },
    { q: 'Can I request a specific furniture style?', a: 'Yes. Beyond the four preset themes you can describe your preference in the order notes and we will match it as closely as possible.' },
    { q: 'Is this allowed on real estate listings?', a: 'Yes, provided the staged images are disclosed as virtually staged. We include a standard disclosure note you can add to your listing.' },
    { q: 'What if I need more than 10 rooms?', a: 'Contact us for a custom quote. Large developments and commercial properties are handled on a per-project basis.' },
  ];

  const FaqItem = ({ q, a }) => {
    const [open, setOpen] = useState(false);
    return (
      <div className="sp-faq-item">
        <button className="sp-faq-q" onClick={() => setOpen(o => !o)} aria-expanded={open}>
          {q}
          <ChevronDown size={16} className={`sp-faq-chevron${open ? ' sp-faq-chevron--open' : ''}`} aria-hidden="true" />
        </button>
        {open && <div className="sp-faq-a">{a}</div>}
      </div>
    );
  };

  const DigitalStaging = () => {
    const navigate = useNavigate();
    const [selectedTier, setSelectedTier] = useState(null);

    useEffect(() => {
      track('virtual_staging_page_viewed', {});
    }, []);

    const handleOrder = () => {
      navigate('/contact', { state: { subject: 'Virtual staging order', tier: selectedTier } });
    };

    return (
      <div className="service-page">
        <div className="service-hero service-hero--staging">
          <div className="service-hero-content">
            <h1>Virtual Staging</h1>
            <p>Transform empty rooms into furnished spaces buyers can picture themselves in</p>
          </div>
        </div>

        <div className="service-container">

          {/* Pricing */}
          <div className="packages-grid">
            {PRICING_TIERS.map(tier => (
              <div
                key={tier.id}
                className={`package-card${selectedTier === tier.id ? ' selected' : ''}${tier.popular ? ' popular' : ''}`}
                onClick={() => setSelectedTier(tier.id)}
              >
                {tier.popular && <div className="popular-badge">Most Popular</div>}
                <h3>{tier.name}</h3>
                <div className="package-price">
                  <span className="currency">AZN</span>
                  <span className="amount">{tier.price}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginLeft: 4 }}>{tier.unit}</span>
                </div>
                <ul className="package-features">
                  {tier.features.map((f, i) => <li key={i}><CheckCircle size={14} strokeWidth={2} aria-hidden="true" /> {f}</li>)}
                </ul>
                <button
                  className="btn-select-package"
                  onClick={(e) => { e.stopPropagation(); setSelectedTier(tier.id); handleOrder(); }}
                >
                  Order {tier.name}
                </button>
              </div>
            ))}
          </div>

          {/* Process */}
          <div className="sp-section">
            <h2 className="sp-section-title">How it works</h2>
            <div className="sp-steps">
              {PROCESS_STEPS.map((s, i) => (
                <div key={i} className="sp-step">
                  <div className="sp-step-num">{i + 1}</div>
                  <div className="sp-step-body">
                    <h4>{s.title}</h4>
                    <p>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deliverables */}
          <div className="sp-section">
            <h2 className="sp-section-title">What you receive</h2>
            <div className="sp-deliverables-grid">
              {DELIVERABLES.map((d, i) => (
                <div key={i} className="sp-deliverable">
                  <span className="sp-deliverable-icon">{d.icon}</span>
                  <h4>{d.title}</h4>
                  <p>{d.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="sp-section">
            <h2 className="sp-section-title">Frequently asked questions</h2>
            <div className="sp-faq">
              {FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
            </div>
          </div>

          {/* CTA */}
          <div className="sp-cta">
            <div className="sp-cta-text">
              <h3>Ready to stage your listing?</h3>
              <p>Send us your photos and we will stage the first room as a free sample.</p>
            </div>
            <button className="sp-cta-btn" onClick={handleOrder}>
              Start Staging
            </button>
          </div>

        </div>
      </div>
    );
  };

  export default DigitalStaging;
  ```

- [ ] **Step 2: ESLint check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint src/pages/DigitalStaging.js --max-warnings=0 2>&1 | tail -5
  ```
  Expected: no output.

- [ ] **Step 3: Commit**

  ```bash
  git add client/src/pages/DigitalStaging.js
  git commit -m "feat(services): rewrite DigitalStaging — replace Coming Soon with full service page"
  ```

---

## Task 4: Backend — PromotionRequest Model + Routes + Controller

**Files:**
- Create: `server/models/PromotionRequest.js`
- Create: `server/controllers/promotionRequestController.js`
- Create: `server/routes/promotionRequestRoutes.js`
- Modify: `server/server.js`

- [ ] **Step 1: Create `server/models/PromotionRequest.js`**

  ```js
  'use strict';
  const mongoose = require('mongoose');

  const TIERS    = ['FEATURED', 'PREMIUM', 'SPOTLIGHT'];
  const DURATIONS = [7, 30, 90];
  const STATUSES = ['pending', 'approved', 'rejected'];

  const promotionRequestSchema = new mongoose.Schema({
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Property',
      required: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
      required: true,
      index: true,
    },
    requestedTier: { type: String, enum: TIERS, required: true },
    requestedDays: { type: Number, enum: DURATIONS, required: true },
    status:        { type: String, enum: STATUSES, default: 'pending' },
    adminNote:     { type: String, default: '' },
    processedAt:   { type: Date, default: null },
    processedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  }, { timestamps: true });

  // One pending request per property at a time
  promotionRequestSchema.index({ propertyId: 1, status: 1 });

  module.exports = mongoose.model('PromotionRequest', promotionRequestSchema);
  ```

- [ ] **Step 2: Create `server/controllers/promotionRequestController.js`**

  ```js
  'use strict';
  const PromotionRequest = require('../models/PromotionRequest');
  const Property         = require('../models/Property');

  const TIER_SCORES = { FREE: 1, FEATURED: 2, PREMIUM: 3, SPOTLIGHT: 4 };
  const VALID_TIERS = ['FEATURED', 'PREMIUM', 'SPOTLIGHT'];
  const VALID_DAYS  = [7, 30, 90];

  // ── POST / — user submits a promotion request ─────────────────────────────────
  exports.submitRequest = async (req, res) => {
    try {
      const { propertyId, requestedTier, requestedDays } = req.body;

      if (!propertyId || !requestedTier || !requestedDays) {
        return res.status(400).json({ message: 'propertyId, requestedTier, and requestedDays are required.' });
      }
      if (!VALID_TIERS.includes(requestedTier)) {
        return res.status(400).json({ message: `requestedTier must be one of: ${VALID_TIERS.join(', ')}` });
      }
      if (!VALID_DAYS.includes(Number(requestedDays))) {
        return res.status(400).json({ message: 'requestedDays must be 7, 30, or 90.' });
      }

      const property = await Property.findById(propertyId).select('ownerId');
      if (!property) return res.status(404).json({ message: 'Property not found.' });
      if (String(property.ownerId) !== String(req.user.id)) {
        return res.status(403).json({ message: 'You can only promote your own listings.' });
      }

      // Block if there is already a pending request for this property
      const existing = await PromotionRequest.findOne({ propertyId, status: 'pending' });
      if (existing) {
        return res.status(409).json({ message: 'A promotion request for this listing is already pending review.' });
      }

      const pr = await PromotionRequest.create({
        propertyId,
        ownerId:       req.user.id,
        requestedTier,
        requestedDays: Number(requestedDays),
      });

      res.status(201).json(pr);
    } catch (err) {
      console.error('submitRequest error:', err);
      res.status(500).json({ message: 'Failed to submit promotion request.' });
    }
  };

  // ── GET /my — user sees their own requests ────────────────────────────────────
  exports.getMyRequests = async (req, res) => {
    try {
      const requests = await PromotionRequest.find({ ownerId: req.user.id })
        .populate('propertyId', 'title images')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      res.json(requests);
    } catch (err) {
      res.status(500).json({ message: 'Failed to load requests.' });
    }
  };

  // ── GET /admin — admin lists all requests ─────────────────────────────────────
  exports.getAdminRequests = async (req, res) => {
    try {
      const { status = 'pending', page = 1, limit = 20 } = req.query;
      const filter = ['pending', 'approved', 'rejected'].includes(status) ? { status } : {};
      const [requests, total] = await Promise.all([
        PromotionRequest.find(filter)
          .populate('propertyId', 'title images location city')
          .populate('ownerId', 'name lastName email')
          .sort({ createdAt: -1 })
          .skip((Number(page) - 1) * Number(limit))
          .limit(Number(limit))
          .lean(),
        PromotionRequest.countDocuments(filter),
      ]);
      res.json({ requests, total });
    } catch (err) {
      res.status(500).json({ message: 'Failed to load admin requests.' });
    }
  };

  // ── PATCH /:id/approve — admin approves: sets promotion on property ──────────
  exports.approveRequest = async (req, res) => {
    try {
      const { adminNote = '' } = req.body;
      const pr = await PromotionRequest.findById(req.params.id);
      if (!pr) return res.status(404).json({ message: 'Request not found.' });
      if (pr.status !== 'pending') {
        return res.status(409).json({ message: 'Request is no longer pending.' });
      }

      const startDate = new Date();
      const endDate   = new Date(startDate.getTime() + pr.requestedDays * 24 * 60 * 60 * 1000);

      await Property.findByIdAndUpdate(pr.propertyId, {
        promotionTier:      pr.requestedTier,
        promotionScore:     TIER_SCORES[pr.requestedTier],
        isPromoted:         true,
        promotionStartDate: startDate,
        promotionEndDate:   endDate,
      });

      pr.status      = 'approved';
      pr.adminNote   = adminNote;
      pr.processedAt = new Date();
      pr.processedBy = req.user.id;
      await pr.save();

      res.json({ message: 'Request approved.', pr });
    } catch (err) {
      console.error('approveRequest error:', err);
      res.status(500).json({ message: 'Failed to approve request.' });
    }
  };

  // ── PATCH /:id/reject — admin rejects ─────────────────────────────────────────
  exports.rejectRequest = async (req, res) => {
    try {
      const { adminNote = '' } = req.body;
      const pr = await PromotionRequest.findById(req.params.id);
      if (!pr) return res.status(404).json({ message: 'Request not found.' });
      if (pr.status !== 'pending') {
        return res.status(409).json({ message: 'Request is no longer pending.' });
      }

      pr.status      = 'rejected';
      pr.adminNote   = adminNote;
      pr.processedAt = new Date();
      pr.processedBy = req.user.id;
      await pr.save();

      res.json({ message: 'Request rejected.', pr });
    } catch (err) {
      console.error('rejectRequest error:', err);
      res.status(500).json({ message: 'Failed to reject request.' });
    }
  };
  ```

- [ ] **Step 3: Create `server/routes/promotionRequestRoutes.js`**

  ```js
  'use strict';
  const express     = require('express');
  const router      = express.Router();
  const verifyToken = require('../middleware/authMiddleware');
  const { isAdmin } = require('../middleware/roleMiddleware');
  const ctrl        = require('../controllers/promotionRequestController');

  router.post('/',               verifyToken,          ctrl.submitRequest);
  router.get('/my',              verifyToken,          ctrl.getMyRequests);
  router.get('/admin',           verifyToken, isAdmin, ctrl.getAdminRequests);
  router.patch('/:id/approve',   verifyToken, isAdmin, ctrl.approveRequest);
  router.patch('/:id/reject',    verifyToken, isAdmin, ctrl.rejectRequest);

  module.exports = router;
  ```

- [ ] **Step 4: Mount in `server/server.js`**

  Read `server/server.js`. Find the block where other routes are required (e.g. `const homeRoutes = require('./routes/homeRoutes')`). After it, add:

  ```js
  const promotionRequestRoutes = require('./routes/promotionRequestRoutes');
  ```

  Then find the block where routes are mounted with `app.use(...)`. After the last `app.use('/api/...')` line in that block, add:

  ```js
  app.use('/api/promotion-requests', promotionRequestRoutes);
  ```

- [ ] **Step 5: Verify all new server modules load**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\server"
  node -e "
    require('./models/PromotionRequest');
    require('./controllers/promotionRequestController');
    require('./routes/promotionRequestRoutes');
    console.log('PromotionRequest modules OK');
  "
  ```
  Expected: `PromotionRequest modules OK`

- [ ] **Step 6: Add API client functions to `client/src/services/api.js`**

  Read `api.js`. Find `export default api;` at the bottom. Before it, add:

  ```js
  // ── Promotion Requests ────────────────────────────────────────────────────────

  export const submitPromotionRequest = (data, token) =>
    api.post('/promotion-requests', data, { headers: { Authorization: `Bearer ${token}` } });

  export const getMyPromotionRequests = (token) =>
    api.get('/promotion-requests/my', { headers: { Authorization: `Bearer ${token}` } });

  export const getAdminPromotionRequests = (status, token) =>
    api.get('/promotion-requests/admin', {
      params: { status },
      headers: { Authorization: `Bearer ${token}` },
    });

  export const approvePromotionRequest = (id, adminNote, token) =>
    api.patch(`/promotion-requests/${id}/approve`, { adminNote }, { headers: { Authorization: `Bearer ${token}` } });

  export const rejectPromotionRequest = (id, adminNote, token) =>
    api.patch(`/promotion-requests/${id}/reject`, { adminNote }, { headers: { Authorization: `Bearer ${token}` } });
  ```

- [ ] **Step 7: ESLint check api.js**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint src/services/api.js --max-warnings=0 2>&1 | tail -5
  ```
  Expected: no output.

- [ ] **Step 8: Commit**

  ```bash
  git add server/models/PromotionRequest.js server/controllers/promotionRequestController.js server/routes/promotionRequestRoutes.js server/server.js client/src/services/api.js
  git commit -m "feat(promotion): add PromotionRequest model, controller, routes, and API client functions"
  ```

---

## Task 5: PromoteListingModal Component

**Files:**
- Create: `client/src/components/PromoteListingModal.js`
- Create: `client/src/components/PromoteListingModal.css`

- [ ] **Step 1: Create `client/src/components/PromoteListingModal.js`**

  ```jsx
  import React, { useState, useEffect } from 'react';
  import { X, CheckCircle, Star, Zap, TrendingUp } from 'lucide-react';
  import { submitPromotionRequest } from '../services/api';
  import { track } from '../services/analytics';
  import './PromoteListingModal.css';

  const TIERS = [
    {
      id: 'FEATURED',
      label: 'Featured',
      icon: <Star size={20} strokeWidth={1.5} aria-hidden="true" />,
      color: '#f59e0b',
      tagline: '+15% search visibility',
      benefits: ['Yellow Featured badge', 'Boosted search ranking', 'Higher in filtered results'],
      pricing: { 7: 29, 30: 79, 90: 149 },
    },
    {
      id: 'PREMIUM',
      label: 'Premium',
      icon: <Zap size={20} strokeWidth={1.5} aria-hidden="true" />,
      color: '#7c3aed',
      popular: true,
      tagline: '+50% search visibility',
      benefits: ['Purple Premium badge', 'Prominent search placement', 'Highlighted card border', 'Spotlight map pin'],
      pricing: { 7: 59, 30: 149, 90: 279 },
    },
    {
      id: 'SPOTLIGHT',
      label: 'Spotlight',
      icon: <TrendingUp size={20} strokeWidth={1.5} aria-hidden="true" />,
      color: '#0F766E',
      tagline: '+200% search visibility',
      benefits: ['Teal Spotlight badge', 'Top search position', 'Homepage carousel placement', 'Amber map pin (scaled)', 'Admin-priority support'],
      pricing: { 7: 99, 30: 249, 90: 449 },
    },
  ];

  const DURATIONS = [
    { days: 7,  label: '7 days'  },
    { days: 30, label: '30 days' },
    { days: 90, label: '90 days' },
  ];

  const PromoteListingModal = ({ property, onClose, onSubmitted }) => {
    const [selectedTier, setSelectedTier]       = useState(null);
    const [selectedDays, setSelectedDays]       = useState(30);
    const [submitting,   setSubmitting]         = useState(false);
    const [error,        setError]              = useState('');
    const [submitted,    setSubmitted]          = useState(false);

    useEffect(() => {
      track('promotion_page_viewed', { propertyId: property._id });
    }, [property._id]);

    const handleTierSelect = (tierId) => {
      setSelectedTier(tierId);
      track('promotion_plan_selected', { propertyId: property._id, tier: tierId, days: selectedDays });
    };

    const handleDaysChange = (days) => {
      setSelectedDays(days);
      if (selectedTier) {
        track('promotion_plan_selected', { propertyId: property._id, tier: selectedTier, days });
      }
    };

    const handleSubmit = async () => {
      if (!selectedTier) { setError('Please select a promotion tier.'); return; }
      setError('');
      setSubmitting(true);
      try {
        const token = localStorage.getItem('token');
        await submitPromotionRequest({ propertyId: property._id, requestedTier: selectedTier, requestedDays: selectedDays }, token);
        setSubmitted(true);
        onSubmitted?.();
      } catch (err) {
        const msg = err.response?.data?.message;
        setError(msg || 'Failed to submit request. Please try again.');
      } finally {
        setSubmitting(false);
      }
    };

    const activeTier = TIERS.find(t => t.id === selectedTier);

    if (submitted) {
      return (
        <div className="plm-backdrop" onClick={onClose}>
          <div className="plm-panel plm-panel--success" onClick={e => e.stopPropagation()}>
            <CheckCircle size={40} strokeWidth={1.5} color="var(--color-primary, #0F766E)" aria-hidden="true" />
            <h2 className="plm-success-title">Request submitted</h2>
            <p className="plm-success-body">
              Your promotion request for <strong>{property.title}</strong> is under review.
              We typically process requests within 1 business day.
            </p>
            <button className="plm-close-btn plm-close-btn--primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="plm-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Promote listing">
        <div className="plm-panel" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="plm-header">
            <div>
              <h2 className="plm-title">Promote Listing</h2>
              <p className="plm-subtitle">{property.title}</p>
            </div>
            <button className="plm-x" onClick={onClose} aria-label="Close">
              <X size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          {/* Tier cards */}
          <div className="plm-tiers">
            {TIERS.map(tier => (
              <button
                key={tier.id}
                className={`plm-tier${selectedTier === tier.id ? ' plm-tier--selected' : ''}${tier.popular ? ' plm-tier--popular' : ''}`}
                onClick={() => handleTierSelect(tier.id)}
                type="button"
              >
                {tier.popular && <span className="plm-popular-badge">Popular</span>}
                <span className="plm-tier-icon" style={{ color: tier.color }}>{tier.icon}</span>
                <span className="plm-tier-label">{tier.label}</span>
                <span className="plm-tier-tagline">{tier.tagline}</span>
                <ul className="plm-tier-benefits">
                  {tier.benefits.map((b, i) => (
                    <li key={i}><CheckCircle size={11} strokeWidth={2.5} aria-hidden="true" /> {b}</li>
                  ))}
                </ul>
                {selectedDays && (
                  <span className="plm-tier-price">
                    AZN {tier.pricing[selectedDays]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Duration */}
          <div className="plm-duration">
            <span className="plm-duration-label">Duration</span>
            <div className="plm-duration-options">
              {DURATIONS.map(d => (
                <button
                  key={d.days}
                  className={`plm-duration-btn${selectedDays === d.days ? ' plm-duration-btn--active' : ''}`}
                  onClick={() => handleDaysChange(d.days)}
                  type="button"
                >
                  {d.label}
                  {activeTier && (
                    <span className="plm-duration-price"> · AZN {activeTier.pricing[d.days]}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Price summary */}
          {activeTier && (
            <div className="plm-summary">
              <span>{activeTier.label} · {selectedDays} days</span>
              <span className="plm-summary-price">AZN {activeTier.pricing[selectedDays]}</span>
            </div>
          )}

          {error && <p className="plm-error" role="alert">{error}</p>}

          <p className="plm-note">
            No payment is collected now. Admin will review and activate your promotion.
          </p>

          <div className="plm-actions">
            <button className="plm-btn plm-btn--cancel" type="button" onClick={onClose}>Cancel</button>
            <button
              className="plm-btn plm-btn--submit"
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !selectedTier}
            >
              {submitting ? 'Submitting…' : 'Submit request'}
            </button>
          </div>

        </div>
      </div>
    );
  };

  export default PromoteListingModal;
  ```

- [ ] **Step 2: Create `client/src/components/PromoteListingModal.css`**

  ```css
  .plm-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
    padding: 16px;
    overflow-y: auto;
  }

  .plm-panel {
    background: var(--color-bg-surface, #fff);
    border-radius: 14px;
    border: 1px solid var(--border-default, rgba(15,23,42,0.10));
    width: 100%;
    max-width: 620px;
    padding: 28px 28px 24px;
    box-shadow: 0 20px 48px -8px rgba(15,23,42,0.22);
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .plm-panel--success {
    max-width: 420px;
    align-items: center;
    text-align: center;
    gap: 16px;
    padding: 40px 32px;
  }

  .plm-success-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--color-graphite-900, #0f172a);
    margin: 0;
  }

  .plm-success-body {
    font-size: 0.9rem;
    color: var(--gray-500, #64748b);
    margin: 0;
    line-height: 1.6;
  }

  .plm-close-btn--primary {
    padding: 10px 28px;
    background: var(--color-primary, #0F766E);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
  }

  /* Header */
  .plm-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .plm-title {
    font-size: 1.0625rem;
    font-weight: 700;
    color: var(--color-graphite-900, #0f172a);
    margin: 0;
  }

  .plm-subtitle {
    font-size: 0.8125rem;
    color: var(--gray-400, #94a3b8);
    margin: 3px 0 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 360px;
  }

  .plm-x {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--gray-500, #6b7280);
    padding: 4px;
    border-radius: 6px;
    display: flex;
  }
  .plm-x:hover { background: var(--gray-100, #f1f5f9); }

  /* Tier cards */
  .plm-tiers {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .plm-tier {
    position: relative;
    border: 1.5px solid var(--border-default, rgba(15,23,42,0.10));
    border-radius: 10px;
    padding: 14px 14px 16px;
    background: var(--color-bg-surface, #fff);
    cursor: pointer;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .plm-tier:hover {
    border-color: var(--color-primary, #0F766E);
  }

  .plm-tier--selected {
    border-color: var(--color-primary, #0F766E);
    background: #f0fdf9;
    box-shadow: 0 0 0 2px rgba(15,118,110,0.15);
  }

  .plm-tier--popular {
    border-color: #7c3aed;
  }

  .plm-tier--popular.plm-tier--selected {
    border-color: #7c3aed;
    background: #faf5ff;
    box-shadow: 0 0 0 2px rgba(124,58,237,0.15);
  }

  .plm-popular-badge {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    background: #7c3aed;
    color: #fff;
    font-size: 0.6875rem;
    font-weight: 700;
    padding: 2px 10px;
    border-radius: 20px;
    white-space: nowrap;
  }

  .plm-tier-icon {
    display: flex;
    margin-bottom: 2px;
  }

  .plm-tier-label {
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--color-graphite-800, #1e293b);
  }

  .plm-tier-tagline {
    font-size: 0.75rem;
    color: var(--color-primary, #0F766E);
    font-weight: 500;
  }

  .plm-tier-benefits {
    list-style: none;
    padding: 0;
    margin: 4px 0 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .plm-tier-benefits li {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.75rem;
    color: var(--gray-500, #64748b);
  }

  .plm-tier-benefits li svg {
    color: var(--color-primary, #0F766E);
    flex-shrink: 0;
  }

  .plm-tier-price {
    margin-top: 8px;
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-graphite-900, #0f172a);
  }

  /* Duration */
  .plm-duration {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .plm-duration-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-graphite-700, #334155);
    white-space: nowrap;
  }

  .plm-duration-options {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .plm-duration-btn {
    padding: 7px 14px;
    border-radius: 7px;
    border: 1.5px solid var(--border-default, rgba(15,23,42,0.10));
    background: none;
    font-size: 0.8125rem;
    color: var(--gray-500, #64748b);
    cursor: pointer;
    transition: border-color 0.12s, background 0.12s, color 0.12s;
  }

  .plm-duration-btn--active {
    border-color: var(--color-primary, #0F766E);
    background: #f0fdf9;
    color: var(--color-primary, #0F766E);
    font-weight: 600;
  }

  .plm-duration-price {
    color: var(--gray-400, #94a3b8);
    font-weight: 400;
  }

  /* Summary */
  .plm-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--gray-50, #f8fafc);
    border-radius: 8px;
    padding: 12px 16px;
    font-size: 0.875rem;
    color: var(--color-graphite-700, #334155);
  }

  .plm-summary-price {
    font-size: 1.0625rem;
    font-weight: 700;
    color: var(--color-graphite-900, #0f172a);
  }

  .plm-error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 0.8125rem;
    color: #991b1b;
    margin: 0;
  }

  .plm-note {
    font-size: 0.8125rem;
    color: var(--gray-400, #94a3b8);
    margin: 0;
  }

  /* Actions */
  .plm-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    padding-top: 4px;
  }

  .plm-btn {
    padding: 9px 20px;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border: 1.5px solid transparent;
    transition: background 0.15s;
  }

  .plm-btn--cancel {
    background: none;
    border-color: var(--border-default, rgba(15,23,42,0.12));
    color: var(--gray-600, #475569);
  }
  .plm-btn--cancel:hover { background: var(--gray-50, #f8fafc); }

  .plm-btn--submit {
    background: var(--color-primary, #0F766E);
    border-color: var(--color-primary, #0F766E);
    color: #fff;
  }
  .plm-btn--submit:hover:not(:disabled) { background: #0d6560; }
  .plm-btn--submit:disabled { opacity: 0.45; cursor: not-allowed; }

  @media (max-width: 560px) {
    .plm-tiers { grid-template-columns: 1fr; }
    .plm-panel { padding: 20px 16px 18px; }
  }
  ```

- [ ] **Step 3: ESLint check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint src/components/PromoteListingModal.js --max-warnings=0 2>&1 | tail -5
  ```
  Expected: no output.

- [ ] **Step 4: Commit**

  ```bash
  git add client/src/components/PromoteListingModal.js client/src/components/PromoteListingModal.css
  git commit -m "feat(promotion): add PromoteListingModal — tier comparison, duration picker, request submission"
  ```

---

## Task 6: AccountListings — Promote Button + Verification Fixes

**Files:**
- Modify: `client/src/pages/AccountListings.js`

- [ ] **Step 1: Read `client/src/pages/AccountListings.js`** — you need to understand the existing import block, state declarations, and the actions area of each listing card before editing.

- [ ] **Step 2: Add import for PromoteListingModal and Link (if not already present)**

  At the top of the import block, find the existing imports. Add `PromoteListingModal`:

  ```jsx
  import PromoteListingModal from '../components/PromoteListingModal';
  ```

  The file already imports `Link` from `react-router-dom` — verify it is there; if not, add it to the destructure.

- [ ] **Step 3: Add `promoteTarget` state**

  In the component's `useState` block, after the existing `const [ovModal, setOvModal] = useState(null);` line, add:

  ```jsx
  const [promoteTarget, setPromoteTarget] = useState(null);
  ```

- [ ] **Step 4: Fix the dead verify-ownership link**

  Find this exact fragment in the render (inside the chips section):

  ```jsx
  <a href="/services/ownership-verification" style={{ fontSize: '0.75rem', color: '#0F766E', textDecoration: 'none' }}>
    Verify ownership →
  </a>
  ```

  Replace it with:

  ```jsx
  <Link to="/verification-application" style={{ fontSize: '0.75rem', color: '#0F766E', textDecoration: 'none' }}>
    Verify ownership →
  </Link>
  ```

- [ ] **Step 5: Add promotion tier chip in the status chips area**

  Find the `al-card-chips` div. After the existing `health` photo count warning chip and before the closing `</div>`, add:

  ```jsx
  {/* Active promotion badge */}
  {property.promotionTier && property.promotionTier !== 'FREE' && property.isPromoted && (
    <span className="al-chip" style={{
      color: property.promotionTier === 'SPOTLIGHT' ? '#0F766E' : property.promotionTier === 'PREMIUM' ? '#7c3aed' : '#d97706',
      background: property.promotionTier === 'SPOTLIGHT' ? '#f0fdf4' : property.promotionTier === 'PREMIUM' ? '#f5f3ff' : '#fffbeb',
      fontWeight: 600,
    }}>
      {property.promotionTier === 'SPOTLIGHT' ? 'Spotlight' : property.promotionTier === 'PREMIUM' ? 'Premium' : 'Featured'} active
    </span>
  )}
  ```

- [ ] **Step 6: Add Promote button in the actions area**

  Find the actions block (`al-card-actions`). After the `<Link to={`/listing/${property._id}`}>View</Link>` and `<Link to={`/properties/update/${property._id}`}>Edit</Link>` lines, add:

  ```jsx
  {(!property.promotionTier || property.promotionTier === 'FREE' || !property.isPromoted) && (
    <button
      className="al-action-btn al-action-btn--promote"
      onClick={() => setPromoteTarget(property)}
    >
      Promote
    </button>
  )}
  ```

- [ ] **Step 7: Add PromoteListingModal and its success toast at the bottom of the return (alongside the existing modals)**

  After the existing `{ovModal && ...}` block and before the closing `</div>`, add:

  ```jsx
  {promoteTarget && (
    <PromoteListingModal
      property={promoteTarget}
      onClose={() => setPromoteTarget(null)}
      onSubmitted={() => {
        success('Promotion request submitted. Admin will review shortly.');
        setPromoteTarget(null);
      }}
    />
  )}
  ```

- [ ] **Step 8: Add `al-action-btn--promote` CSS to `AccountListings.css`**

  Read `client/src/pages/AccountListings.css`. Find the existing `.al-action-btn--verify` style, then append after it:

  ```css
  .al-action-btn--promote {
    background: #fffbeb;
    border-color: #f59e0b;
    color: #d97706;
  }
  .al-action-btn--promote:hover {
    background: #fef3c7;
  }
  ```

- [ ] **Step 9: ESLint check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint src/pages/AccountListings.js --max-warnings=0 2>&1 | tail -5
  ```
  Expected: no output.

- [ ] **Step 10: Commit**

  ```bash
  git add client/src/pages/AccountListings.js client/src/pages/AccountListings.css
  git commit -m "feat(listings): add Promote button, fix verify-ownership link, show active promotion tier chip"
  ```

---

## Task 7: Analytics Instrumentation

**Files:**
- Modify: `client/src/services/analytics.js`
- Modify: `client/src/pages/VerificationApplication.js`

- [ ] **Step 1: Add 5 events to `TRACKED_FOR_STORE` in `analytics.js`**

  Find the `TRACKED_FOR_STORE` Set (around line 230). After the `'featured_listing_viewed',` line and before the closing `]);`, add:

  ```js
  // Revenue & Service Conversion events (Phase 5.5B)
  'photography_page_viewed',
  'virtual_staging_page_viewed',
  'promotion_page_viewed',
  'promotion_plan_selected',
  'verification_page_viewed',
  ```

- [ ] **Step 2: Add `verification_page_viewed` to `VerificationApplication.js`**

  Read `client/src/pages/VerificationApplication.js`. Find the existing `useEffect` that runs on mount (it loads pricing and status). After the `setLoading(true)` / data-fetch effect, add a separate effect for the analytics event:

  Find the imports block at the top. Add `track` import:
  ```jsx
  import { track } from '../services/analytics';
  ```

  Then, after the existing state declarations inside the `VerificationApplication` component, add:

  ```jsx
  useEffect(() => {
    track('verification_page_viewed', {});
  }, []);
  ```

- [ ] **Step 3: ESLint check both files**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint src/services/analytics.js src/pages/VerificationApplication.js --max-warnings=0 2>&1 | tail -5
  ```
  Expected: no output.

- [ ] **Step 4: Commit**

  ```bash
  git add client/src/services/analytics.js client/src/pages/VerificationApplication.js
  git commit -m "feat(analytics): add 5 revenue events to TRACKED_FOR_STORE; instrument verification_page_viewed"
  ```

---

## Task 8: Build Verification

- [ ] **Step 1: React build — must complete with zero errors**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  npm run build 2>&1 | grep -E "^(Compiled|ERROR|Failed)" | head -10
  ```
  Expected: `Compiled successfully.` or `Compiled with warnings.` (warnings are OK, errors are not).

  If errors appear, fix them before proceeding. Common issues: missing imports, JSX syntax, unused vars flagged as errors.

- [ ] **Step 2: Server syntax check — all new modules must load**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\server"
  node -e "
    require('./models/PromotionRequest');
    require('./controllers/promotionRequestController');
    require('./routes/promotionRequestRoutes');
    console.log('All Phase 5.5B server modules OK');
  "
  ```
  Expected: `All Phase 5.5B server modules OK`

- [ ] **Step 3: ESLint sweep on all modified client files**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app\client"
  ESLINT_USE_FLAT_CONFIG=false npx eslint \
    src/pages/BookPhotoshoot.js \
    src/pages/DigitalStaging.js \
    src/pages/AccountListings.js \
    src/pages/VerificationApplication.js \
    src/components/PromoteListingModal.js \
    src/services/api.js \
    src/services/analytics.js \
    --max-warnings=0 2>&1 | tail -10
  ```
  Expected: no output.

- [ ] **Step 4: Final status check**

  ```bash
  cd "c:\Users\eliye\Desktop\Real Estate app\Java Database\realestate-app"
  git log --oneline -8
  git status
  ```
  Expected: clean working tree, 7 new commits visible.

---

## Deliverables Summary

### New files (5)
| File | Purpose |
|---|---|
| `client/src/components/PromoteListingModal.js` | Tier comparison + duration picker + request submission |
| `client/src/components/PromoteListingModal.css` | Modal styles |
| `server/models/PromotionRequest.js` | Promotion request model (pending/approved/rejected) |
| `server/controllers/promotionRequestController.js` | submit, list, approve, reject handlers |
| `server/routes/promotionRequestRoutes.js` | 5 API routes |

### Modified files (8)
| File | Change |
|---|---|
| `client/src/pages/BookPhotoshoot.js` | Full rewrite — process, pricing, deliverables, FAQ, CTA |
| `client/src/pages/DigitalStaging.js` | Full rewrite — replaces "Coming Soon" |
| `client/src/pages/ServicePages.css` | New shared section classes (process, deliverables, FAQ, CTA) |
| `client/src/pages/AccountListings.js` | Promote button, promote modal, fix verify link, full promotion status block (tier + start + expiry + days remaining) |
| `client/src/pages/AccountListings.css` | `.al-action-btn--promote` + `.al-promo-status` block styles |
| `client/src/pages/PropertyDetail.js` | Add promotion status block in owner edit bar (tier + expiry + days remaining) |
| `client/src/pages/VerificationApplication.js` | `verification_page_viewed` on mount |
| `client/src/services/api.js` | 5 promotion request client functions |
| `client/src/services/analytics.js` | 6 events added to `TRACKED_FOR_STORE` (`service_inquiry_submitted` added) |
| `server/server.js` | Mount `/api/promotion-requests` |
