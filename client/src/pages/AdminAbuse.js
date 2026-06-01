import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  getAbuseStats,
  getLinkedAccounts,
  getRepeatOffenders,
  getFlaggedListings,
  getUserAbuseHistory,
  adminBulkAction,
} from '../services/api';
import './Admin.css';
import './AdminAbuse.css';

const TABS = [
  { id: 'flagged',    label: 'Flagged Listings' },
  { id: 'linked',     label: 'Linked Accounts'  },
  { id: 'offenders',  label: 'Repeat Offenders' },
];

const ESCALATION_COLORS = { urgent: '#dc2626', elevated: '#d97706', normal: '#6b7280' };
const ESCALATION_BG     = { urgent: '#fef2f2',  elevated: '#fffbeb', normal: '#f9fafb' };

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div className="aab-stat">
      <div className="aab-stat-value" style={{ color: color || '#111827' }}>{value ?? '—'}</div>
      <div className="aab-stat-label">{label}</div>
    </div>
  );
}

// ─── Bulk selection toolbar ───────────────────────────────────────────────────
function BulkToolbar({ selected, targetType, onAction, onClear }) {
  const [reason, setReason] = useState('');

  const handleAction = (action) => {
    onAction(action, selected, targetType, reason);
    setReason('');
  };

  if (selected.length === 0) return null;

  return (
    <div className="aab-bulk-toolbar">
      <span className="aab-bulk-count">{selected.length} selected</span>
      <input
        className="aab-bulk-reason"
        placeholder="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      {targetType === 'property' && (
        <>
          <button className="aab-bulk-btn aab-bulk-btn--archive" onClick={() => handleAction('archive')}>Archive</button>
          <button className="aab-bulk-btn aab-bulk-btn--approve" onClick={() => handleAction('approve')}>Approve</button>
          <button className="aab-bulk-btn aab-bulk-btn--flag"    onClick={() => handleAction('flag')}>Flag</button>
        </>
      )}
      {targetType === 'user' && (
        <>
          <button className="aab-bulk-btn aab-bulk-btn--block"   onClick={() => handleAction('block')}>Block</button>
          <button className="aab-bulk-btn aab-bulk-btn--unblock" onClick={() => handleAction('unblock')}>Unblock</button>
        </>
      )}
      <button className="aab-bulk-btn aab-bulk-btn--clear" onClick={onClear}>Clear</button>
    </div>
  );
}

// ─── Flagged listings tab ────────────────────────────────────────────────────
function FlaggedListingsTab({ token, onBulkAction }) {
  const [listings, setListings]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState([]);
  const [detail, setDetail]       = useState(null);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await getFlaggedListings({ page: p, limit: 20 }, token);
      setListings(res.data.listings || []);
      setTotal(res.data.total || 0);
      setPage(p);
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => { load(1); }, [load]);

  const toggleSelect = (id) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleBulk = async (action, ids, targetType, reason) => {
    await onBulkAction(action, ids, targetType, reason);
    setSelected([]);
    load(page);
  };

  if (loading) return <div className="aab-loading">Loading flagged listings…</div>;

  return (
    <div>
      <BulkToolbar selected={selected} targetType="property" onAction={handleBulk} onClear={() => setSelected([])} />

      <table className="aab-table">
        <thead>
          <tr>
            <th><input type="checkbox" onChange={(e) => setSelected(e.target.checked ? listings.map(l => l._id) : [])} /></th>
            <th>Listing</th>
            <th>Owner</th>
            <th>Flags</th>
            <th>Priority</th>
            <th>Escalation</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((l) => (
            <tr key={l._id} className={selected.includes(l._id) ? 'aab-row--selected' : ''}>
              <td><input type="checkbox" checked={selected.includes(l._id)} onChange={() => toggleSelect(l._id)} /></td>
              <td>
                <div className="aab-listing-title">{l.title || 'Untitled'}</div>
                <div className="aab-listing-meta">{l.city} · {l.status}</div>
                {l.duplicateReasons?.length > 0 && (
                  <div className="aab-signals">
                    {l.duplicateReasons.map((r) => <span key={r} className="aab-signal aab-signal--dup">{r}</span>)}
                  </div>
                )}
                {l.agentSignals?.length > 0 && (
                  <div className="aab-signals">
                    {l.agentSignals.map((s) => <span key={s} className="aab-signal aab-signal--agent">{s}</span>)}
                  </div>
                )}
                {l.moderationReasons?.length > 0 && (
                  <div className="aab-signals">
                    {l.moderationReasons.map((r) => <span key={r} className="aab-signal">{r}</span>)}
                  </div>
                )}
              </td>
              <td>
                {l.ownerId ? (
                  <button className="aab-user-link" onClick={() => setDetail(l.ownerId._id)}>
                    {l.ownerId.name} <span className="aab-user-email">{l.ownerId.email}</span>
                    {l.ownerId.isBlocked && <span className="aab-badge aab-badge--blocked">blocked</span>}
                  </button>
                ) : '—'}
              </td>
              <td className="aab-flags">
                {l.flaggedForReview    && <span className="aab-badge aab-badge--flag">flagged</span>}
                {l.suspectedDuplicate  && <span className="aab-badge aab-badge--dup">dup</span>}
                {l.agentScore >= 3     && <span className="aab-badge aab-badge--agent">agent</span>}
                <span className="aab-reports">{l.reportCount || 0} reports</span>
              </td>
              <td>
                <span className={`aab-priority aab-priority--${l.moderationPriority >= 6 ? 'high' : l.moderationPriority >= 3 ? 'med' : 'low'}`}>
                  {l.moderationPriority || 0}
                </span>
              </td>
              <td>
                <span className="aab-escalation" style={{
                  color:       ESCALATION_COLORS[l.reportEscalationLevel || 'normal'],
                  background:  ESCALATION_BG[l.reportEscalationLevel || 'normal'],
                }}>
                  {l.reportEscalationLevel || 'normal'}
                </span>
              </td>
              <td className="aab-date">{new Date(l.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="aab-pagination">
        <span>{total} total</span>
        <button disabled={page <= 1} onClick={() => load(page - 1)}>← Prev</button>
        <span>Page {page}</span>
        <button disabled={listings.length < 20} onClick={() => load(page + 1)}>Next →</button>
      </div>

      {detail && <UserDetailModal userId={detail} token={token} onClose={() => setDetail(null)} onBulkAction={onBulkAction} />}
    </div>
  );
}

// ─── Linked accounts tab ──────────────────────────────────────────────────────
function LinkedAccountsTab({ token, onBulkAction }) {
  const [groups, setGroups]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLinkedAccounts(token)
      .then((r) => setGroups(r.data.groups || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="aab-loading">Loading linked accounts…</div>;
  if (!groups.length) return <div className="aab-empty">No linked phone groups found.</div>;

  return (
    <div className="aab-groups">
      {groups.map((g) => (
        <div key={g._id} className="aab-group-card">
          <div className="aab-group-header">
            <span className="aab-group-phone">{g._id}</span>
            <span className="aab-badge aab-badge--flag">{g.count} accounts</span>
          </div>
          <table className="aab-table aab-table--compact">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Created</th><th>Status</th></tr>
            </thead>
            <tbody>
              {g.users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name} {u.lastName || ''}</td>
                  <td className="aab-user-email">{u.email}</td>
                  <td className="aab-date">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>{u.isBlocked ? <span className="aab-badge aab-badge--blocked">blocked</span> : <span className="aab-badge aab-badge--ok">active</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="aab-group-actions">
            <button className="aab-bulk-btn aab-bulk-btn--block" onClick={() => onBulkAction('block', g.users.filter(u => !u.isBlocked).map(u => u.id), 'user', `Linked phone group: ${g._id}`)}>
              Block unblocked in group
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Repeat offenders tab ─────────────────────────────────────────────────────
function RepeatOffendersTab({ token, onBulkAction }) {
  const [data, setData]       = useState({ blockedUsers: [], reportedUsers: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRepeatOffenders(token)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="aab-loading">Loading repeat offenders…</div>;

  return (
    <div>
      <h3 className="aab-section-title">Blocked Accounts ({data.blockedUsers.length})</h3>
      {data.blockedUsers.length === 0 ? (
        <div className="aab-empty">No blocked accounts.</div>
      ) : (
        <table className="aab-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {data.blockedUsers.map((u) => (
              <tr key={u._id}>
                <td>{u.name} {u.lastName || ''}</td>
                <td className="aab-user-email">{u.email}</td>
                <td>{u.phone || '—'}</td>
                <td>{u.role}</td>
                <td className="aab-date">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  <button className="aab-bulk-btn aab-bulk-btn--unblock" onClick={() => onBulkAction('unblock', [u._id], 'user', '')}>
                    Unblock
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 className="aab-section-title" style={{ marginTop: '2rem' }}>
        Multiple Upheld Reports ({data.reportedUsers.length})
      </h3>
      {data.reportedUsers.length === 0 ? (
        <div className="aab-empty">No repeat reported users.</div>
      ) : (
        <table className="aab-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Upheld Reports</th><th>Status</th></tr>
          </thead>
          <tbody>
            {data.reportedUsers.map((r) => (
              <tr key={r._id}>
                <td>{r.user?.name} {r.user?.lastName || ''}</td>
                <td className="aab-user-email">{r.user?.email}</td>
                <td><span className="aab-badge aab-badge--flag">{r.resolvedCount}</span></td>
                <td>{r.user?.isBlocked ? <span className="aab-badge aab-badge--blocked">blocked</span> : <span className="aab-badge aab-badge--ok">active</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── User detail modal ────────────────────────────────────────────────────────
function UserDetailModal({ userId, token, onClose, onBulkAction }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserAbuseHistory(userId, token)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, token]);

  return (
    <div className="aab-modal-overlay" onClick={onClose}>
      <div className="aab-modal" onClick={(e) => e.stopPropagation()}>
        <button className="aab-modal-close" onClick={onClose}>✕</button>
        {loading ? (
          <div className="aab-loading">Loading user history…</div>
        ) : !data ? (
          <div className="aab-empty">User not found.</div>
        ) : (
          <>
            <h2 className="aab-modal-title">{data.user.name} {data.user.lastName || ''}</h2>
            <p className="aab-modal-email">{data.user.email} · {data.user.role}</p>

            <div className="aab-modal-stats">
              <StatCard label="Listings"     value={data.summary.totalListings} />
              <StatCard label="Flagged"      value={data.summary.flaggedListings}   color={data.summary.flaggedListings > 0 ? '#dc2626' : undefined} />
              <StatCard label="High Risk"    value={data.summary.highRiskListings}  color={data.summary.highRiskListings > 0 ? '#d97706' : undefined} />
              <StatCard label="Reports Made" value={data.summary.reportsMadeCount} />
              <StatCard label="Reports Against" value={data.summary.reportsAgainstCount} color={data.summary.reportsAgainstCount > 0 ? '#dc2626' : undefined} />
            </div>

            <div className="aab-modal-actions">
              {data.user.isBlocked ? (
                <button className="aab-bulk-btn aab-bulk-btn--unblock" onClick={() => { onBulkAction('unblock', [userId], 'user', ''); onClose(); }}>
                  Unblock user
                </button>
              ) : (
                <button className="aab-bulk-btn aab-bulk-btn--block" onClick={() => { onBulkAction('block', [userId], 'user', ''); onClose(); }}>
                  Block user
                </button>
              )}
            </div>

            {data.listings.length > 0 && (
              <>
                <h3 className="aab-section-title">Listings ({data.listings.length})</h3>
                <table className="aab-table aab-table--compact">
                  <thead><tr><th>Title</th><th>Status</th><th>Reports</th><th>Priority</th></tr></thead>
                  <tbody>
                    {data.listings.map((l) => (
                      <tr key={l._id}>
                        <td>{l.title}</td>
                        <td>{l.status}</td>
                        <td>{l.reportCount || 0}</td>
                        <td>{l.moderationPriority || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {data.reportsAgainst.length > 0 && (
              <>
                <h3 className="aab-section-title">Reports Against This User ({data.reportsAgainst.length})</h3>
                <table className="aab-table aab-table--compact">
                  <thead><tr><th>Category</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {data.reportsAgainst.map((r, i) => (
                      <tr key={i}>
                        <td>{r.category}</td>
                        <td>{r.status}</td>
                        <td className="aab-date">{new Date(r.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
const AdminAbuse = () => {
  const [tab, setTab]         = useState('flagged');
  const [stats, setStats]     = useState(null);
  const [feedback, setFeedback] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    getAbuseStats(token)
      .then((r) => setStats(r.data))
      .catch(() => {});
  }, [token]);

  const handleBulkAction = async (action, ids, targetType, reason) => {
    try {
      await adminBulkAction({ action, targetIds: ids, targetType, reason }, token);
      setFeedback(`Applied "${action}" to ${ids.length} ${targetType}(s).`);
      setTimeout(() => setFeedback(''), 4000);
      // Refresh stats
      getAbuseStats(token).then((r) => setStats(r.data)).catch(() => {});
    } catch (err) {
      setFeedback(err.response?.data?.message || 'Action failed.');
      setTimeout(() => setFeedback(''), 4000);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Marketplace Abuse Center</h1>
            <p className="admin-subtitle">Review flagged listings, linked accounts, and repeat offenders.</p>
          </div>
          <Link to="/admin" className="aab-back-link">← Admin Home</Link>
        </div>

        {feedback && <div className="aab-feedback">{feedback}</div>}

        {/* Stats */}
        {stats && (
          <div className="aab-stats-row">
            <StatCard label="Flagged Listings"    value={stats.flaggedListings}    color={stats.flaggedListings    > 0 ? '#dc2626' : undefined} />
            <StatCard label="Suspected Duplicates" value={stats.suspectedDuplicates} color={stats.suspectedDuplicates > 0 ? '#d97706' : undefined} />
            <StatCard label="Urgent Escalations"  value={stats.urgentEscalations}  color={stats.urgentEscalations  > 0 ? '#dc2626' : undefined} />
            <StatCard label="Agent Flagged"        value={stats.agentFlagged}       color={stats.agentFlagged       > 0 ? '#7c3aed' : undefined} />
            <StatCard label="Blocked Users"        value={stats.blockedUsers}       color={stats.blockedUsers       > 0 ? '#dc2626' : undefined} />
            <StatCard label="Open Reports"         value={stats.openReports}        color={stats.openReports        > 5 ? '#d97706' : undefined} />
          </div>
        )}

        {/* Tabs */}
        <div className="aab-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`aab-tab${tab === t.id ? ' aab-tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="aab-tab-content">
          {tab === 'flagged'   && <FlaggedListingsTab  token={token} onBulkAction={handleBulkAction} />}
          {tab === 'linked'    && <LinkedAccountsTab   token={token} onBulkAction={handleBulkAction} />}
          {tab === 'offenders' && <RepeatOffendersTab  token={token} onBulkAction={handleBulkAction} />}
        </div>
      </div>
    </div>
  );
};

export default AdminAbuse;
