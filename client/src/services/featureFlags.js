// ─────────────────────────────────────────────────────────────────────────────
// Əmlak Pro — Feature flag system
//
// Flags default to the values below.
// Override at build time via env vars:
//   REACT_APP_ENABLED_FLAGS=flag-a,flag-b   (force-enable)
//   REACT_APP_DISABLED_FLAGS=flag-c         (force-disable)
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULTS = {
  // ── Search intelligence ──────────────────────────────────────────────────
  'ai-search-chips':       true,   // Live NLP interpretation chips
  'explore-strip':         true,   // Adjacent search suggestions
  'area-insight':          true,   // Map/list area context label
  'search-save':           true,   // Save search button

  // ── Property detail ──────────────────────────────────────────────────────
  'related-listings':      true,   // Similar listings section
  'market-insights':       true,   // Deterministic market signals
  'listing-confidence':    true,   // Trust/confidence panel

  // ── Seller flow ──────────────────────────────────────────────────────────
  'listing-quality-score': true,   // Quality score on publish step
  'description-hints':     true,   // Writing prompt list
  'title-suggestion':      true,   // Auto-derived title suggestion

  // ── Observability ────────────────────────────────────────────────────────
  'session-replay':        false,  // PostHog session replay — beta only
  'analytics-debug':       false,  // Show debug overlay for admin testing

  // ── Experimental ────────────────────────────────────────────────────────
  'beta-features':         false,  // Gates for unreleased features
  'map-clustering':        true,   // Property map cluster markers
};

const _envEnabled  = new Set(
  (process.env.REACT_APP_ENABLED_FLAGS  || '').split(',').map(s => s.trim()).filter(Boolean)
);
const _envDisabled = new Set(
  (process.env.REACT_APP_DISABLED_FLAGS || '').split(',').map(s => s.trim()).filter(Boolean)
);

// ── API ───────────────────────────────────────────────────────────────────────

export const isEnabled = (flag) => {
  if (_envDisabled.has(flag)) return false;
  if (_envEnabled.has(flag))  return true;
  return DEFAULTS[flag] ?? false;
};

export const getAllFlags = () => {
  const out = {};
  for (const flag of Object.keys(DEFAULTS)) {
    out[flag] = isEnabled(flag);
  }
  return out;
};

export const getFlagGroups = () => ({
  'Search intelligence': ['ai-search-chips', 'explore-strip', 'area-insight', 'search-save'],
  'Property detail':     ['related-listings', 'market-insights', 'listing-confidence'],
  'Seller flow':         ['listing-quality-score', 'description-hints', 'title-suggestion'],
  'Observability':       ['session-replay', 'analytics-debug'],
  'Experimental':        ['beta-features', 'map-clustering'],
});
