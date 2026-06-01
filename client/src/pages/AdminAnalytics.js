import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { analyticsHealth, getLocalAnalyticsStore, clearLocalAnalyticsStore } from '../services/analytics';
import { getAllFlags, getFlagGroups } from '../services/featureFlags';
import './Admin.css';
import './AdminAnalytics.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtTime = (ts) => {
  const d = new Date(ts);
  return d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
};

const countBy = (events, key) => {
  const map = {};
  for (const e of events) {
    const v = e.props?.[key] || '(none)';
    map[v] = (map[v] || 0) + 1;
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
};

const todayCount = (events, eventName) => {
  const cutoff = Date.now() - 86_400_000;
  return events.filter(e => e.event === eventName && e.ts > cutoff).length;
};

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, accent }) => (
  <div className={`aan-stat ${accent ? `aan-stat--${accent}` : ''}`}>
    <p className="aan-stat-value">{value ?? '—'}</p>
    <p className="aan-stat-label">{label}</p>
    {sub && <p className="aan-stat-sub">{sub}</p>}
  </div>
);

// ─── Status pill ──────────────────────────────────────────────────────────────
const StatusPill = ({ ok, label }) => (
  <span className={`aan-pill ${ok ? 'aan-pill--ok' : 'aan-pill--off'}`}>{label}</span>
);

// ─── Bar row ─────────────────────────────────────────────────────────────────
const BarRow = ({ label, count, max }) => (
  <div className="aan-bar-row">
    <span className="aan-bar-label">{label}</span>
    <div className="aan-bar-track">
      <div className="aan-bar-fill" style={{ width: `${Math.round((count / (max || 1)) * 100)}%` }} />
    </div>
    <span className="aan-bar-count">{count}</span>
  </div>
);

// ─── Section header ───────────────────────────────────────────────────────────
const SectionHead = ({ title, sub }) => (
  <div className="aan-section-head">
    <h2 className="aan-section-title">{title}</h2>
    {sub && <p className="aan-section-sub">{sub}</p>}
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const AdminAnalytics = () => {
  const [health]     = useState(() => analyticsHealth());
  const [flags]      = useState(() => getAllFlags());
  const [flagGroups] = useState(() => getFlagGroups());
  const [store,      setStore]    = useState(() => getLocalAnalyticsStore());
  const [cleared,    setCleared]  = useState(false);

  useEffect(() => {
    const id = setInterval(() => setStore(getLocalAnalyticsStore()), 10_000);
    return () => clearInterval(id);
  }, []);

  const handleClear = () => {
    clearLocalAnalyticsStore();
    setStore([]);
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  };

  // Derived stats from local store
  const stats = useMemo(() => {
    const all = store;
    return {
      searches_today:    todayCount(all, 'search_submitted'),
      no_results_today:  todayCount(all, 'search_no_results'),
      views_today:       todayCount(all, 'property_viewed'),
      phone_today:       todayCount(all, 'phone_revealed'),
      inquiry_today:     todayCount(all, 'inquiry_started'),
      publishes_today:   todayCount(all, 'publish_completed'),
      total_events:      all.length,
      search_queries:    all.filter(e => e.event === 'search_submitted').map(e => e.props?.query).filter(Boolean),
      no_result_queries: all.filter(e => e.event === 'search_no_results').map(e => e.props?.keyword || e.props?.city).filter(Boolean),
      districts:         countBy(all.filter(e => e.event === 'property_viewed'), 'district'),
      listing_types:     countBy(all.filter(e => e.event === 'property_viewed'), 'listing_status'),
      slow_ops:          all.filter(e => e.event === 'performance_slow_operation').slice(-10).reverse(),
    };
  }, [store]);

  const maxDistrict = stats.districts[0]?.[1] || 1;
  const maxType     = stats.listing_types[0]?.[1] || 1;

  // Recent events (last 20)
  const recentEvents = useMemo(() => [...store].reverse().slice(0, 20), [store]);

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Analytics & Observability</h1>
          <p className="admin-subtitle">
            Event telemetry · Feature flags · System health
          </p>
        </div>
        <div className="aan-header-actions">
          <button
            className="aan-clear-btn"
            onClick={handleClear}
            disabled={store.length === 0}
          >
            {cleared ? 'Cleared' : 'Clear local store'}
          </button>
        </div>
      </div>

      {/* ── System health ─────────────────────────────────────────────────── */}
      <section className="aan-section">
        <SectionHead
          title="System health"
          sub="Connection status for analytics and error tracking services."
        />
        <div className="aan-health-grid">
          <div className="aan-health-card">
            <div className="aan-health-row">
              <span className="aan-health-label">PostHog</span>
              <StatusPill ok={health.posthog_active} label={health.posthog_active ? 'Connected' : health.posthog_key_set ? 'Key set, not yet active' : 'No key'} />
            </div>
            {health.posthog_key_set && (
              <p className="aan-health-detail">Host: {health.posthog_host}</p>
            )}
            {!health.posthog_key_set && (
              <p className="aan-health-detail">Set <code>REACT_APP_POSTHOG_KEY</code> to enable</p>
            )}
          </div>
          <div className="aan-health-card">
            <div className="aan-health-row">
              <span className="aan-health-label">Sentry</span>
              <StatusPill ok={health.sentry_active} label={health.sentry_active ? 'Connected' : health.sentry_dsn_set ? 'DSN set, not yet active' : 'No DSN'} />
            </div>
            {!health.sentry_dsn_set && (
              <p className="aan-health-detail">Set <code>REACT_APP_SENTRY_DSN</code> to enable</p>
            )}
          </div>
          <div className="aan-health-card">
            <div className="aan-health-row">
              <span className="aan-health-label">Environment</span>
              <StatusPill ok={health.env === 'production'} label={health.env} />
            </div>
            <p className="aan-health-detail">Version: {health.version}</p>
          </div>
          <div className="aan-health-card">
            <div className="aan-health-row">
              <span className="aan-health-label">Local store</span>
              <StatusPill ok={stats.total_events > 0} label={`${stats.total_events} events`} />
            </div>
            <p className="aan-health-detail">Rolling 7-day window</p>
          </div>
        </div>

        {(health.posthog_key_set || health.sentry_dsn_set) && (
          <div className="aan-dashboard-links">
            {health.posthog_key_set && (
              <a
                className="aan-ext-link"
                href="https://app.posthog.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open PostHog →
              </a>
            )}
            {health.sentry_dsn_set && (
              <a
                className="aan-ext-link"
                href="https://sentry.io"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Sentry →
              </a>
            )}
          </div>
        )}
      </section>

      {/* ── Today's metrics ───────────────────────────────────────────────── */}
      <section className="aan-section">
        <SectionHead
          title="Today's activity"
          sub="From the local 7-day rolling event store — resets per browser session."
        />
        <div className="aan-stat-grid">
          <StatCard label="Searches"       value={stats.searches_today}   accent={stats.searches_today > 0 ? 'teal' : null} />
          <StatCard label="No results"     value={stats.no_results_today} accent={stats.no_results_today > 0 ? 'amber' : null} sub="Zero-result searches" />
          <StatCard label="Property views" value={stats.views_today} />
          <StatCard label="Phone reveals"  value={stats.phone_today}  accent={stats.phone_today > 0 ? 'teal' : null} />
          <StatCard label="Inquiries"      value={stats.inquiry_today} accent={stats.inquiry_today > 0 ? 'teal' : null} />
          <StatCard label="Publishes"      value={stats.publishes_today} />
        </div>
      </section>

      {/* ── Search intelligence ───────────────────────────────────────────── */}
      <section className="aan-section">
        <SectionHead
          title="Search intelligence"
          sub="Queries from recent searches — the product's analytical moat."
        />
        <div className="aan-two-col">
          <div className="aan-col-card">
            <h3 className="aan-col-title">Recent queries</h3>
            {stats.search_queries.length === 0 ? (
              <p className="aan-empty">No searches recorded yet.</p>
            ) : (
              <ul className="aan-query-list">
                {[...new Set(stats.search_queries)].slice(0, 15).map((q, i) => (
                  <li key={i} className="aan-query-item">{q}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="aan-col-card">
            <h3 className="aan-col-title">Zero-result queries</h3>
            {stats.no_result_queries.length === 0 ? (
              <p className="aan-empty">None recorded.</p>
            ) : (
              <ul className="aan-query-list aan-query-list--warn">
                {[...new Set(stats.no_result_queries)].slice(0, 15).map((q, i) => (
                  <li key={i} className="aan-query-item">{q}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* ── Breakdown ────────────────────────────────────────────────────── */}
      {(stats.districts.length > 0 || stats.listing_types.length > 0) && (
        <section className="aan-section">
          <SectionHead title="Property view breakdown" sub="Districts and listing types from property_viewed events." />
          <div className="aan-two-col">
            <div className="aan-col-card">
              <h3 className="aan-col-title">By district</h3>
              {stats.districts.map(([district, count]) => (
                <BarRow key={district} label={district || '—'} count={count} max={maxDistrict} />
              ))}
            </div>
            <div className="aan-col-card">
              <h3 className="aan-col-title">By listing type</h3>
              {stats.listing_types.map(([type, count]) => (
                <BarRow key={type} label={type || '—'} count={count} max={maxType} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Performance alerts ────────────────────────────────────────────── */}
      {stats.slow_ops.length > 0 && (
        <section className="aan-section">
          <SectionHead title="Performance alerts" sub="Operations that exceeded their threshold." />
          <div className="aan-table-wrap">
            <table className="aan-table">
              <thead>
                <tr>
                  <th>Operation</th>
                  <th>Duration</th>
                  <th>Threshold</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {stats.slow_ops.map((e, i) => (
                  <tr key={i}>
                    <td>{e.props?.operation || '—'}</td>
                    <td className="aan-td-warn">{e.props?.duration_ms ? `${e.props.duration_ms}ms` : '—'}</td>
                    <td>{e.props?.threshold_ms ? `${e.props.threshold_ms}ms` : '—'}</td>
                    <td>{fmtTime(e.ts)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Recent event stream ───────────────────────────────────────────── */}
      <section className="aan-section">
        <SectionHead title="Live event stream" sub="Last 20 events captured in this browser session." />
        {recentEvents.length === 0 ? (
          <p className="aan-empty">No events yet — interact with the platform to populate.</p>
        ) : (
          <div className="aan-table-wrap">
            <table className="aan-table">
              <thead>
                <tr><th>Event</th><th>Key property</th><th>Time</th></tr>
              </thead>
              <tbody>
                {recentEvents.map((e, i) => {
                  const keyProp = e.props?.district || e.props?.listing_status || e.props?.property_type || e.props?.query || '';
                  return (
                    <tr key={i}>
                      <td><span className="aan-event-name">{e.event}</span></td>
                      <td className="aan-td-muted">{keyProp}</td>
                      <td className="aan-td-muted">{fmtTime(e.ts)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Feature flags ────────────────────────────────────────────────── */}
      <section className="aan-section">
        <SectionHead
          title="Feature flags"
          sub="Current flag state. Override via REACT_APP_ENABLED_FLAGS / REACT_APP_DISABLED_FLAGS env vars."
        />
        {Object.entries(flagGroups).map(([group, flagKeys]) => (
          <div key={group} className="aan-flag-group">
            <h3 className="aan-flag-group-label">{group}</h3>
            <div className="aan-flag-list">
              {flagKeys.map(flag => (
                <div key={flag} className="aan-flag-row">
                  <span className="aan-flag-name">{flag}</span>
                  <StatusPill ok={flags[flag]} label={flags[flag] ? 'on' : 'off'} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ── Tracked events catalog ────────────────────────────────────────── */}
      <section className="aan-section">
        <SectionHead title="Event catalog" sub="All events instrumented in this build." />
        <div className="aan-catalog-grid">
          {[
            { group: 'Search', events: ['search_submitted', 'search_interpreted', 'filter_applied', 'filter_removed', 'map_search_area_clicked', 'listing_opened_from_map', 'listing_opened_from_list', 'search_no_results'] },
            { group: 'Property', events: ['property_viewed', 'phone_revealed', 'inquiry_started', 'inquiry_sent', 'gallery_opened', 'related_listing_clicked'] },
            { group: 'Seller', events: ['listing_started', 'draft_saved', 'photo_uploaded', 'publish_attempted', 'publish_completed', 'publish_failed'] },
            { group: 'Auth', events: ['login_completed', 'signup_completed', 'auth_expired'] },
            { group: 'Performance', events: ['performance_slow_operation'] },
          ].map(({ group, events }) => (
            <div key={group} className="aan-catalog-card">
              <h3 className="aan-catalog-group">{group}</h3>
              <ul className="aan-catalog-list">
                {events.map(ev => (
                  <li key={ev} className="aan-catalog-item">{ev}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <div className="aan-admin-links">
        <Link to="/admin" className="aan-admin-link">← Admin home</Link>
        <Link to="/admin/operations" className="aan-admin-link">Ops dashboard →</Link>
      </div>
    </div>
  );
};

export default AdminAnalytics;
