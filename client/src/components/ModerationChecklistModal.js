import React, { useState } from 'react';
import { adminApproveProperty, adminRejectProperty } from '../services/api';
import './ModerationChecklistModal.css';

const CHECKLIST = [
  'Photos are clear and usable',
  'Price appears realistic for the market',
  'Description contains meaningful details',
  'No obvious duplicate indicators',
  'Contact information is consistent',
  'Address and location are believable',
  'Property category is correctly set',
  'No misleading claims identified',
];

const REJECTION_REASONS = [
  'Poor image quality',
  'Suspected duplicate',
  'Suspicious pricing',
  'Incomplete information',
  'Misleading description',
  'Ownership concern',
  'Other',
];

const ModerationChecklistModal = ({ property, onClose, onApproved, onRejected }) => {
  const [checks,       setChecks]       = useState(new Array(CHECKLIST.length).fill(false));
  const [note,         setNote]         = useState('');
  const [mode,         setMode]         = useState('review'); // 'review' | 'reject'
  const [rejectReason, setRejectReason] = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState('');

  const checkedCount = checks.filter(Boolean).length;
  const allChecked   = checkedCount === CHECKLIST.length;

  const toggleCheck = (i) =>
    setChecks(prev => prev.map((v, idx) => (idx === i ? !v : v)));

  const handleApprove = async () => {
    if (!allChecked || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      await adminApproveProperty(property._id, { note: note.trim() || undefined }, token);
      onApproved?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve listing.');
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      await adminRejectProperty(property._id, {
        reason: rejectReason,
        note:   note.trim() || undefined,
      }, token);
      onRejected?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject listing.');
      setSubmitting(false);
    }
  };

  const owner    = property?.ownerId || {};
  const rawThumb = property?.images?.[0];
  const thumbUrl = rawThumb
    ? typeof rawThumb === 'string' ? rawThumb : (rawThumb.thumbnail || rawThumb.medium)
    : null;

  return (
    <div className="mcm-overlay" onClick={onClose}>
      <div
        className="mcm-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Review listing"
      >
        <button className="mcm-close" onClick={onClose} aria-label="Close">&#10005;</button>

        {/* ── Property header ──────────────────────────────────────── */}
        <div className="mcm-header">
          <p className="mcm-header-label">Review Listing</p>
          <div className="mcm-property-row">
            {thumbUrl && <img src={thumbUrl} alt="" className="mcm-thumb" />}
            <div className="mcm-property-info">
              <p className="mcm-property-title">{property?.title}</p>
              <p className="mcm-property-meta">
                {property?.currency || 'AZN'} {property?.price?.toLocaleString()}
                {property?.city ? ` · ${property.city}` : ''}
              </p>
              {owner.name && (
                <p className="mcm-owner">
                  Listed by {owner.name}{owner.lastName ? ` ${owner.lastName}` : ''}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mcm-divider" />

        {/* ── Review mode ───────────────────────────────────────────── */}
        {mode === 'review' && (
          <>
            <div className="mcm-section">
              <p className="mcm-section-label">
                Moderation Checklist
                <span className="mcm-progress">{checkedCount} / {CHECKLIST.length}</span>
              </p>
              <ul className="mcm-checklist">
                {CHECKLIST.map((item, i) => (
                  <li
                    key={i}
                    className={`mcm-check-row ${checks[i] ? 'mcm-check-row--checked' : ''}`}
                  >
                    <label className="mcm-check-label">
                      <input
                        type="checkbox"
                        className="mcm-checkbox"
                        checked={checks[i]}
                        onChange={() => toggleCheck(i)}
                        disabled={submitting}
                      />
                      <span className="mcm-check-box" aria-hidden="true" />
                      <span className="mcm-check-text">{item}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mcm-divider" />

            <div className="mcm-section">
              <label className="mcm-section-label" htmlFor="mcm-note">
                Internal note
                <span className="mcm-optional">optional</span>
              </label>
              <textarea
                id="mcm-note"
                className="mcm-textarea"
                rows={3}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Add a note for internal records…"
                disabled={submitting}
                maxLength={1000}
              />
            </div>

            {error && <p className="mcm-error">{error}</p>}

            <div className="mcm-divider" />

            <div className="mcm-actions">
              <button
                className="mcm-btn-reject"
                onClick={() => { setMode('reject'); setError(''); }}
                disabled={submitting}
              >
                Reject Listing
              </button>
              <button
                className="mcm-btn-approve"
                onClick={handleApprove}
                disabled={!allChecked || submitting}
                title={!allChecked ? 'Complete all checklist items to enable approval' : undefined}
              >
                {submitting ? 'Approving…' : '✓ Approve Listing'}
              </button>
            </div>
          </>
        )}

        {/* ── Reject mode ───────────────────────────────────────────── */}
        {mode === 'reject' && (
          <>
            <div className="mcm-section">
              <p className="mcm-section-label">Reason for rejection</p>
              <ul className="mcm-reason-list">
                {REJECTION_REASONS.map(r => (
                  <li
                    key={r}
                    className={`mcm-reason-row ${rejectReason === r ? 'mcm-reason-row--selected' : ''}`}
                  >
                    <label className="mcm-reason-label">
                      <input
                        type="radio"
                        name="reject-reason"
                        value={r}
                        checked={rejectReason === r}
                        onChange={() => setRejectReason(r)}
                        disabled={submitting}
                      />
                      <span className="mcm-reason-text">{r}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mcm-divider" />

            <div className="mcm-section">
              <label className="mcm-section-label" htmlFor="mcm-reject-note">
                Additional note
                <span className="mcm-optional">optional</span>
              </label>
              <textarea
                id="mcm-reject-note"
                className="mcm-textarea"
                rows={3}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Describe the issue for internal records…"
                disabled={submitting}
                maxLength={1000}
              />
            </div>

            {error && <p className="mcm-error">{error}</p>}

            <div className="mcm-divider" />

            <div className="mcm-actions">
              <button
                className="mcm-btn-cancel"
                onClick={() => { setMode('review'); setError(''); }}
                disabled={submitting}
              >
                Back to Review
              </button>
              <button
                className="mcm-btn-confirm-reject"
                onClick={handleReject}
                disabled={!rejectReason || submitting}
              >
                {submitting ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ModerationChecklistModal;
