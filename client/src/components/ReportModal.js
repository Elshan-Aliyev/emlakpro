import React, { useState } from 'react';
import { submitReport } from '../services/api';
import './ReportModal.css';

const PROPERTY_CATEGORIES = [
  { value: 'fake-listing',        label: 'Fake listing' },
  { value: 'wrong-price',         label: 'Wrong price' },
  { value: 'duplicate-listing',   label: 'Duplicate listing' },
  { value: 'scam-fraud',          label: 'Scam / fraud' },
  { value: 'already-sold-rented', label: 'Already sold or rented' },
  { value: 'offensive-content',   label: 'Offensive content' },
];

const USER_CATEGORIES = [
  { value: 'suspicious-behavior', label: 'Suspicious behavior' },
  { value: 'scam-attempt',        label: 'Scam attempt' },
  { value: 'harassment',          label: 'Harassment' },
];

const ReportModal = ({ targetType, targetId, targetLabel, onClose }) => {
  const categories = targetType === 'property' ? PROPERTY_CATEGORIES : USER_CATEGORIES;

  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | done | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category) {
      setErrorMsg('Please select a reason.');
      return;
    }
    setStatus('submitting');
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setErrorMsg('You must be logged in to report.');
        setStatus('idle');
        return;
      }
      await submitReport({ targetType, targetId, category, description }, token);
      setStatus('done');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit report.';
      setErrorMsg(msg);
      setStatus('idle');
    }
  };

  return (
    <div className="rm-overlay" onClick={onClose}>
      <div className="rm-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="rm-close" onClick={onClose} aria-label="Close">&#10005;</button>

        {status === 'done' ? (
          <div className="rm-done">
            <div className="rm-done-icon">&#10003;</div>
            <h3>Report submitted</h3>
            <p>Thank you for helping keep the platform safe. Our team will review this report.</p>
            <button className="rm-btn-primary" onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            <h3 className="rm-title">Report {targetType === 'property' ? 'Listing' : 'User'}</h3>
            {targetLabel && <p className="rm-target">{targetLabel}</p>}
            <p className="rm-process-note">
              Reports are reviewed by our team. Your identity is not shared with the reported party.
            </p>

            <form onSubmit={handleSubmit}>
              <fieldset className="rm-fieldset">
                <legend className="rm-legend">Reason for report</legend>
                <div className="rm-options">
                  {categories.map((c) => (
                    <label key={c.value} className={`rm-option ${category === c.value ? 'rm-option--selected' : ''}`}>
                      <input
                        type="radio"
                        name="category"
                        value={c.value}
                        checked={category === c.value}
                        onChange={() => setCategory(c.value)}
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="rm-field">
                <label className="rm-label" htmlFor="rm-desc">
                  Additional details <span className="rm-optional">(optional)</span>
                </label>
                <textarea
                  id="rm-desc"
                  className="rm-textarea"
                  rows={3}
                  maxLength={1000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue in more detail…"
                  disabled={status === 'submitting'}
                />
              </div>

              {errorMsg && <p className="rm-error">{errorMsg}</p>}

              <div className="rm-actions">
                <button type="button" className="rm-btn-secondary" onClick={onClose} disabled={status === 'submitting'}>
                  Cancel
                </button>
                <button type="submit" className="rm-btn-primary" disabled={status === 'submitting' || !category}>
                  {status === 'submitting' ? 'Submitting…' : 'Submit Report'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportModal;
