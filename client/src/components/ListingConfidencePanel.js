import React from 'react';
import './ListingConfidencePanel.css';

// ─── Signal derivation ────────────────────────────────────────────────────────
// Translates internal fields to plain-language indicators.
// Never surfaces raw scores, thresholds, or moderation metadata.

function deriveSignals(property) {
  const owner       = property.ownerId || {};
  const imageCount  = property.images?.length || 0;
  const descLength  = property.description?.length || 0;
  const daysOld     = (Date.now() - new Date(property.createdAt).getTime()) / 86_400_000;

  const indicators = [];
  const notes      = [];

  // ── Positive signals ──────────────────────────────────────────────────────

  if (owner.phoneVerified === true) {
    indicators.push('Phone verified owner');
  }

  if (property.ownershipVerificationStatus === 'approved') {
    indicators.push('Ownership documents reviewed');
  }

  if (property.isApproved === true) {
    indicators.push('Listing reviewed by our team');
  }

  // Detailed information: meaningful description + photos + key specs
  const hasSpecs = property.bedrooms > 0 && property.builtUpArea > 0;
  if (imageCount >= 5 && descLength > 150 && hasSpecs) {
    indicators.push('Detailed property information provided');
  }

  if (owner.verified === true) {
    indicators.push('Verified account');
  }

  // ── Notes (warnings) ─────────────────────────────────────────────────────

  if (
    !property.ownershipVerificationStatus ||
    property.ownershipVerificationStatus === 'none'
  ) {
    notes.push('Ownership not verified');
  }

  if (property.suspectedDuplicate === true) {
    notes.push('Similar listing detected — verify details before contacting');
  }

  if (daysOld < 3) {
    notes.push('Recently listed — allow time for details to be confirmed');
  }

  if (imageCount < 3 || descLength < 50) {
    notes.push('Limited listing information provided');
  }

  return { indicators, notes };
}

// ─── Component ────────────────────────────────────────────────────────────────

const ListingConfidencePanel = ({ property }) => {
  if (!property) return null;

  const { indicators, notes } = deriveSignals(property);
  if (!indicators.length && !notes.length) return null;

  return (
    <div className="lcp-panel">
      <p className="lcp-heading">Listing Confidence</p>

      {indicators.length > 0 && (
        <ul className="lcp-list" aria-label="Trust indicators">
          {indicators.map((text, i) => (
            <li key={i} className="lcp-item lcp-item--positive">
              <span className="lcp-icon" aria-hidden="true">✓</span>
              <span className="lcp-text">{text}</span>
            </li>
          ))}
        </ul>
      )}

      {notes.length > 0 && (
        <>
          {indicators.length > 0 && <div className="lcp-divider" />}
          <ul className="lcp-list" aria-label="Things to note">
            {notes.map((text, i) => (
              <li key={i} className="lcp-item lcp-item--note">
                <span className="lcp-icon" aria-hidden="true">⚠</span>
                <span className="lcp-text">{text}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default ListingConfidencePanel;
