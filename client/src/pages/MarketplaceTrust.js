import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, Copy, Clock, AlertTriangle, Eye, Star } from 'lucide-react';
import './StaticPages.css';
import './MarketplaceTrust.css';

const SECTIONS = [
  {
    id: 'listing-review',
    icon: <ShieldCheck size={28} strokeWidth={1.6} aria-hidden="true" />,
    heading: 'Listing Review',
    body: 'Every listing submitted to Əmlak Pro is reviewed by our team before it appears publicly. We check for completeness, accuracy, and signs of fraud. Listings that pass review are marked as reviewed. This typically completes within 24 hours of submission.',
    items: [
      'Listings with missing critical information are returned to the owner.',
      'Listings that fail review are not shown to buyers.',
      'Owners are notified of the reason when a listing is rejected.',
      'Re-submitted listings go through the same review process.',
    ],
  },
  {
    id: 'ownership-verification',
    icon: <Lock size={28} strokeWidth={1.6} aria-hidden="true" />,
    heading: 'Ownership Verification',
    body: 'Sellers can apply to have their ownership of a listed property verified. Verified ownership means we have reviewed documentation from the owner confirming they hold rights to the property. Verified owners are shown a badge on their listings.',
    items: [
      'Ownership verification is voluntary but strongly encouraged.',
      'Documents are reviewed confidentially and not shown to buyers.',
      'Verified ownership does not guarantee the property is free of legal disputes.',
      'Verification can be revoked if fraudulent documents are detected.',
    ],
  },
  {
    id: 'duplicate-detection',
    icon: <Copy size={28} strokeWidth={1.6} aria-hidden="true" />,
    heading: 'Duplicate Detection',
    body: 'Our platform automatically flags listings that appear to duplicate an existing active listing — same property advertised by multiple accounts, or the same content re-listed after removal. Flagged duplicates are placed in review before they are shown publicly.',
    items: [
      'Duplicate detection considers address, price, photos, and description similarity.',
      'Legitimate re-listings after a genuine status change are allowed.',
      'Duplicate flags can be appealed through the dashboard.',
    ],
  },
  {
    id: 'stale-listings',
    icon: <Clock size={28} strokeWidth={1.6} aria-hidden="true" />,
    heading: 'Freshness and Stale Listing Management',
    body: 'Listings that have not been updated or confirmed by their owner for an extended period are considered stale. Stale listings receive progressively lower placement in search results and may be archived to keep the marketplace accurate.',
    items: [
      'Listings inactive for 30 days are flagged as aging.',
      'Listings inactive for 60 days are marked stale.',
      'After 90 days without activity, listings are marked critical and may be archived.',
      'Owners are prompted to confirm availability at the 45-day mark.',
      'Confirming availability resets the freshness clock.',
    ],
  },
  {
    id: 'reports',
    icon: <AlertTriangle size={28} strokeWidth={1.6} aria-hidden="true" />,
    heading: 'Reporting Suspicious Listings or Users',
    body: 'Any registered user can report a listing or user they believe is suspicious, misleading, or fraudulent. Reports are reviewed by our team. Your identity is not shared with the reported party under any circumstances.',
    items: [
      'Reports are confidential. The reported party is not told who reported them.',
      'Each report is assessed on its own merits — the listing is not immediately removed.',
      'If a report is upheld, the listing may be removed or the account suspended.',
      'False reports made in bad faith may result in account restrictions.',
      'You can report directly from any listing page using the "Report" link.',
    ],
  },
  {
    id: 'visibility',
    icon: <Eye size={28} strokeWidth={1.6} aria-hidden="true" />,
    heading: 'Search Visibility and Fair Access',
    body: 'Search results on Əmlak Pro are ranked by relevance, freshness, and listing quality — not by who pays more. Promoted listings are clearly labeled. Organic results are never suppressed to favour paid placements.',
    items: [
      'Sponsored placements appear at the top and are labeled "Sponsored".',
      'Organic results are ranked by quality, freshness, and match to your search.',
      'Listings with verified ownership may rank slightly higher as a quality signal.',
      'Stale listings are ranked lower to keep results accurate.',
    ],
  },
  {
    id: 'featured',
    icon: <Star size={28} strokeWidth={1.6} aria-hidden="true" />,
    heading: 'Featured and Sponsored Placements',
    body: 'Sellers can pay to feature their listings in highlighted positions. Featured placements improve visibility but do not bypass the listing review process. Every featured listing has already passed the same review as organic listings.',
    items: [
      'Featured listings must meet all standard review requirements.',
      'Sponsorship does not affect the integrity score or trust signals shown to buyers.',
      'Featured placement does not indicate endorsement by Əmlak Pro.',
    ],
  },
];

const MarketplaceTrust = () => (
  <div className="static-page-container">
    <div className="static-page-content mkt-trust-content">

      <div className="mkt-trust-header">
        <div className="mkt-trust-header-icon" aria-hidden="true">
          <ShieldCheck size={36} strokeWidth={1.5} />
        </div>
        <h1>How Marketplace Trust Works</h1>
        <p className="subtitle">
          Əmlak Pro is a reviewed marketplace — not an open classifieds board. This page explains
          exactly how we verify listings, handle reports, and keep search results accurate.
        </p>
      </div>

      <nav className="mkt-trust-toc" aria-label="On this page">
        <p className="mkt-trust-toc-label">On this page</p>
        <ol className="mkt-trust-toc-list">
          {SECTIONS.map(s => (
            <li key={s.id}>
              <a href={`#${s.id}`}>{s.heading}</a>
            </li>
          ))}
        </ol>
      </nav>

      {SECTIONS.map((s, i) => (
        <section key={s.id} id={s.id} className="mkt-trust-section">
          <div className="mkt-trust-section-header">
            <div className="mkt-trust-section-icon">{s.icon}</div>
            <h2>{s.heading}</h2>
          </div>
          <p>{s.body}</p>
          {s.items.length > 0 && (
            <ul className="mkt-trust-list">
              {s.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <section className="mkt-trust-footer-cta">
        <h2>Questions or concerns?</h2>
        <p>
          If you believe a listing is fraudulent or have questions about how we operate,
          please <Link to="/contact">contact our team</Link>. You can also{' '}
          <Link to="/about">read more about us</Link>.
        </p>
      </section>

    </div>
  </div>
);

export default MarketplaceTrust;
