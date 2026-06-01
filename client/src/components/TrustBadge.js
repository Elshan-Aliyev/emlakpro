import React from 'react';
import { Check } from 'lucide-react';
import './TrustBadge.css';

// Numeric trust level derived from accountType
const LEVEL_FROM_ACCOUNT_TYPE = {
  'unverified-user': 0,
  'verified-user':   1,
  'verified-seller': 3,
  'realtor':         3,
  'corporate':       3,
};

// trustLevel prop (0–4) takes precedence over accountType
const resolveLevel = ({ accountType, trustLevel }) => {
  if (trustLevel != null) return Math.min(Math.max(Number(trustLevel), 0), 4);
  return LEVEL_FROM_ACCOUNT_TYPE[accountType] ?? 0;
};

const TIER_KEY  = ['pending', 'email', 'phone', 'id', 'ownership'];
const CHIP_LABEL = ['Unverified', 'Email Verified', 'Phone Verified', 'ID Verified', 'Ownership Verified'];
const FOOTER_TEXT = [
  'Verification pending',
  'Email verified owner',
  'Phone verified owner',
  'ID verified',
  'Ownership verified',
];

const LADDER_STEPS = [
  { key: 'email',     label: 'Email Verified'     },
  { key: 'phone',     label: 'Phone Verified'     },
  { key: 'id',        label: 'ID Verified'        },
  { key: 'ownership', label: 'Ownership Verified' },
];


/**
 * variants:
 *   chip   — inline badge showing highest achieved tier
 *   footer — single text line for card footer
 *   ladder — full step-by-step verification list (detail page)
 */
const TrustBadge = ({ accountType, trustLevel, variant = 'chip' }) => {
  const level = resolveLevel({ accountType, trustLevel });
  const tier  = TIER_KEY[level];

  if (variant === 'footer') {
    return (
      <div className={`trust-footer trust-footer--${tier}`}>
        {level > 0 && <Check size={11} strokeWidth={1.8} className="trust-footer-icon" aria-hidden="true" />}
        <span>{FOOTER_TEXT[level]}</span>
      </div>
    );
  }

  if (variant === 'ladder') {
    return (
      <div className="trust-ladder">
        <p className="trust-ladder-heading">Verification</p>
        {LADDER_STEPS.map((step, i) => {
          const stepLevel = i + 1;
          const achieved  = level >= stepLevel;
          return (
            <div
              key={step.key}
              className={`trust-ladder-row ${achieved ? 'trust-ladder-row--achieved' : 'trust-ladder-row--pending'} ${step.key === 'ownership' && achieved ? 'trust-ladder-row--ownership' : ''}`}
            >
              <div className={`trust-ladder-dot ${achieved ? 'trust-ladder-dot--achieved' : ''} ${step.key === 'ownership' && achieved ? 'trust-ladder-dot--ownership' : ''}`}>
                {achieved ? <Check size={11} strokeWidth={1.8} className="trust-ladder-check" aria-hidden="true" /> : null}
              </div>
              <span className="trust-ladder-label">{step.label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // chip (default)
  return (
    <span className={`trust-chip trust-chip--${tier}`}>
      {level > 0 && <Check size={11} strokeWidth={1.8} className="trust-chip-icon" aria-hidden="true" />}
      <span>{CHIP_LABEL[level]}</span>
    </span>
  );
};

export default TrustBadge;
