// ─────────────────────────────────────────────────────────────────────────────
// Əmlak Pro — Central analytics service
// PostHog (events + session replay) + Sentry (errors + performance)
//
// USAGE:  import { track, identify, captureError } from './analytics';
// NEVER:  call posthog / Sentry directly from product code.
// ─────────────────────────────────────────────────────────────────────────────

const IS_PROD = process.env.NODE_ENV === 'production';
const IS_TEST = process.env.NODE_ENV === 'test';
const IS_DEV  = process.env.NODE_ENV === 'development';

const POSTHOG_KEY   = process.env.REACT_APP_POSTHOG_KEY;
const POSTHOG_HOST  = process.env.REACT_APP_POSTHOG_HOST || 'https://us.i.posthog.com';
const SENTRY_DSN    = process.env.REACT_APP_SENTRY_DSN;
const APP_VERSION   = process.env.REACT_APP_VERSION || '1.0.0-beta';

// Session replay: 20% of authenticated prod sessions. Disabled in dev.
const REPLAY_SAMPLE_RATE = IS_PROD ? 0.20 : 0;

let _posthog = null;
let _sentry  = null;

// ── Bootstrap ─────────────────────────────────────────────────────────────────
// Call once from index.js before the React root renders.

export const initAnalytics = async () => {
  if (IS_TEST) return;

  // ── PostHog ────────────────────────────────────────────────────────────────
  if (POSTHOG_KEY) {
    try {
      const { default: posthog } = await import('posthog-js');
      posthog.init(POSTHOG_KEY, {
        api_host:              POSTHOG_HOST,
        autocapture:           false,   // capture only what we explicitly track
        capture_pageview:      false,   // we track pages manually for SPA accuracy
        capture_pageleave:     true,
        respect_dnt:           true,
        persistence:           'localStorage+cookie',
        sanitize_properties:   _sanitizeProps,
        session_recording: {
          // Mask sensitive fields — never record passwords, PII, or messages
          maskTextSelector:      '[data-ph-mask],[type=password],[name=phone],[name=message]',
          maskInputOptions:      { password: true, email: false },
          sampleRate:            REPLAY_SAMPLE_RATE,
          recordCrossOriginIframes: false,
        },
        loaded: (ph) => {
          _posthog = ph;
          if (IS_DEV) console.log('[analytics] PostHog ready');
        },
      });
    } catch (e) {
      console.warn('[analytics] PostHog init failed:', e.message);
    }
  } else if (IS_DEV) {
    console.log('[analytics] No REACT_APP_POSTHOG_KEY — events log to console');
  }

  // ── Sentry ─────────────────────────────────────────────────────────────────
  if (SENTRY_DSN) {
    try {
      const Sentry = await import('@sentry/react');
      Sentry.init({
        dsn:              SENTRY_DSN,
        environment:      process.env.NODE_ENV,
        release:          APP_VERSION,
        tracesSampleRate: IS_PROD ? 0.15 : 1.0,
        replaysSessionSampleRate:     0,
        replaysOnErrorSampleRate:     IS_PROD ? 0.10 : 0,
        ignoreErrors: [
          'ResizeObserver loop limit exceeded',
          'ResizeObserver loop completed',
          'Non-Error exception captured',
          'ChunkLoadError',
          'Loading chunk',
          'NetworkError when attempting to fetch resource',
          'Load failed',
          'Failed to fetch',
          'AbortError',
        ],
        beforeSend(event) {
          // Strip request body — never send user-typed content to Sentry
          if (event.request) delete event.request.data;
          return event;
        },
      });
      _sentry = Sentry;
      if (IS_DEV) console.log('[analytics] Sentry ready');
    } catch (e) {
      console.warn('[analytics] Sentry init failed:', e.message);
    }
  }
};

// ── Privacy sanitiser ─────────────────────────────────────────────────────────
// Applied to every event before it leaves the browser.
// Strips keys that could contain PII or credentials.

const PII_KEYS = new Set([
  'password', 'token', 'secret', 'authorization', 'auth',
  'phone', 'mobile', 'email', 'message', 'body', 'content',
  'card_number', 'cvv', 'ssn', 'national_id', 'passport',
]);

const _sanitizeProps = (props) => {
  if (!props || typeof props !== 'object') return props;
  const out = {};
  for (const [k, v] of Object.entries(props)) {
    if (PII_KEYS.has(k.toLowerCase())) continue;
    out[k] = v;
  }
  return out;
};

// ── Shared context appended to every event ────────────────────────────────────
const _baseProps = () => ({
  app_version:  APP_VERSION,
  device_type:  _deviceType(),
  viewport:     `${window.innerWidth}x${window.innerHeight}`,
});

// ── Core: track an event ──────────────────────────────────────────────────────
export const track = (event, properties = {}) => {
  if (IS_TEST) return;
  const payload = _sanitizeProps({ ..._baseProps(), ...properties });
  if (_posthog) {
    _posthog.capture(event, payload);
  } else if (IS_DEV) {
    console.log(`[track] ${event}`, payload);
  }
  // Mirror high-value events to the local rolling store for the admin dashboard
  _localStore.push(event, properties);
};

// ── Identify an authenticated user ────────────────────────────────────────────
export const identify = (userId, traits = {}) => {
  if (IS_TEST || !userId) return;
  const safe = _sanitizeProps(traits);
  if (_posthog) _posthog.identify(String(userId), safe);
  if (_sentry)  _sentry.setUser({ id: String(userId), role: safe.role });
};

// ── Reset on logout ────────────────────────────────────────────────────────────
export const resetAnalytics = () => {
  if (_posthog) _posthog.reset();
  if (_sentry)  _sentry.setUser(null);
};

// ── Page view ─────────────────────────────────────────────────────────────────
export const trackPage = (path) => {
  if (IS_TEST) return;
  if (_posthog) {
    _posthog.capture('$pageview', { $current_url: window.location.origin + path });
  } else if (IS_DEV) {
    console.log(`[page] ${path}`);
  }
};

// ── Error capture ─────────────────────────────────────────────────────────────
export const captureError = (error, context = {}) => {
  if (IS_TEST) return;
  if (_sentry) {
    _sentry.withScope(scope => {
      Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
      _sentry.captureException(error);
    });
  } else if (IS_DEV) {
    console.error('[captureError]', error?.message ?? error, context);
  }
};

// ── Performance telemetry ─────────────────────────────────────────────────────
// Fires only when the operation exceeds the threshold (no noise for fast ops).

export const trackSlowOperation = (name, durationMs, threshold = 2000, properties = {}) => {
  if (durationMs < threshold) return;
  track('performance_slow_operation', {
    operation:    name,
    duration_ms:  Math.round(durationMs),
    threshold_ms: threshold,
    ...properties,
  });
};

export const measureAsync = async (name, fn, threshold = 2000, properties = {}) => {
  const t0 = performance.now();
  try {
    const result = await fn();
    trackSlowOperation(name, performance.now() - t0, threshold, properties);
    return result;
  } catch (err) {
    const ms = Math.round(performance.now() - t0);
    captureError(err, { operation: name, duration_ms: ms, ...properties });
    throw err;
  }
};

// ── Price bucket — never track raw prices ─────────────────────────────────────
export const priceBucket = (price) => {
  if (!price || price <= 0) return 'unset';
  if (price <    50_000)    return '<50k';
  if (price <   100_000)    return '50–100k';
  if (price <   200_000)    return '100–200k';
  if (price <   500_000)    return '200–500k';
  if (price < 1_000_000)    return '500k–1M';
  return '1M+';
};

// ── Analytics health ──────────────────────────────────────────────────────────
export const analyticsHealth = () => ({
  posthog_active:  !!_posthog,
  sentry_active:   !!_sentry,
  posthog_key_set: !!POSTHOG_KEY,
  sentry_dsn_set:  !!SENTRY_DSN,
  env:             process.env.NODE_ENV,
  version:         APP_VERSION,
  posthog_host:    POSTHOG_KEY ? POSTHOG_HOST : null,
});

// ── Local rolling store (admin analytics dashboard) ───────────────────────────
// Maintains a bounded in-memory + localStorage counter for key events.
// Gives the admin page real data without requiring PostHog API access.

const STORE_KEY     = 'emlak_analytics_store';
const STORE_MAX_AGE = 7 * 86_400_000; // 7 days
const STORE_MAX_LEN = 500;

const TRACKED_FOR_STORE = new Set([
  'search_submitted', 'search_no_results', 'filter_applied',
  'property_viewed', 'phone_revealed', 'inquiry_started', 'inquiry_sent',
  'listing_started', 'publish_completed', 'publish_failed',
  'login_completed', 'signup_completed',
  'gallery_opened', 'related_listing_clicked',
  'performance_slow_operation',
  // Promotion events (Phase 5.2)
  'promotion_viewed',
  'promotion_applied',
  'promotion_removed',
  'spotlight_listing_viewed',
  'featured_listing_viewed',
  // Revenue & Service Conversion events (Phase 5.5B)
  'photography_page_viewed',
  'virtual_staging_page_viewed',
  'promotion_page_viewed',
  'promotion_plan_selected',
  'verification_page_viewed',
  'service_inquiry_submitted',
  // Property Review events (Phase 5.6)
  'review_modal_opened',
  'review_submission_started',
  'review_submitted',
  'review_updated',
  'review_deleted',
  'review_reported',
  'review_sort_changed',
  'owner_response_added',
  'review_helpful_voted',
  'review_hidden',
  'review_restored',
  'review_deleted_by_admin',
]);

const _localStore = {
  push(event, props) {
    if (IS_TEST || !TRACKED_FOR_STORE.has(event)) return;
    try {
      const raw   = localStorage.getItem(STORE_KEY);
      const store = raw ? JSON.parse(raw) : { events: [] };
      const now   = Date.now();
      // Prune old entries
      store.events = store.events
        .filter(e => now - e.ts < STORE_MAX_AGE)
        .slice(-(STORE_MAX_LEN - 1));
      store.events.push({ event, ts: now, props: _sanitizeProps(props) });
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch (_) {}
  },

  read() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return [];
      const store = JSON.parse(raw);
      const cutoff = Date.now() - STORE_MAX_AGE;
      return (store.events || []).filter(e => e.ts > cutoff);
    } catch (_) { return []; }
  },

  clear() {
    try { localStorage.removeItem(STORE_KEY); } catch (_) {}
  },
};

export const getLocalAnalyticsStore = () => _localStore.read();
export const clearLocalAnalyticsStore = () => _localStore.clear();

// ── Device classifier ─────────────────────────────────────────────────────────
const _deviceType = () => {
  const w = window.innerWidth;
  if (w < 640)  return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
};
