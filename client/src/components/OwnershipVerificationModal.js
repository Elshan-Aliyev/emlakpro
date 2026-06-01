import React, { useState } from 'react';
import { uploadOwnershipDocument, submitOwnershipRequest } from '../services/api';
import './OwnershipVerificationModal.css';

const DOCUMENT_SLOTS = [
  {
    type:  'property-extract',
    label: 'Property Extract',
    hint:  'Official document from the State Registry showing property ownership',
  },
  {
    type:  'utility-bill',
    label: 'Utility Bill',
    hint:  'Recent electricity, gas, or water bill in your name for this address',
  },
  {
    type:  'ownership-certificate',
    label: 'Ownership Certificate',
    hint:  'Title deed or other legal document confirming ownership',
  },
];

const OwnershipVerificationModal = ({ property, onClose, onSubmitted }) => {
  const [uploads, setUploads] = useState({}); // { [docType]: { status, url } }
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const existingDocs = (property.ownershipDocuments || []).reduce((acc, d) => {
    acc[d.type] = d.url;
    return acc;
  }, {});

  const handleFileChange = async (docType, file) => {
    if (!file) return;
    setUploads(prev => ({ ...prev, [docType]: { status: 'uploading', url: null } }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', docType);
      const token = localStorage.getItem('token');
      const res = await uploadOwnershipDocument(property._id, formData, token);
      setUploads(prev => ({
        ...prev,
        [docType]: { status: 'done', url: res.data.document.url },
      }));
    } catch (err) {
      const msg = err.response?.data?.message || 'Upload failed.';
      setUploads(prev => ({ ...prev, [docType]: { status: 'error', error: msg, url: null } }));
    }
  };

  // A slot is satisfied if it was uploaded this session OR already existed before opening
  const uploadedTypes = DOCUMENT_SLOTS.filter(
    s => uploads[s.type]?.status === 'done' || existingDocs[s.type]
  ).map(s => s.type);

  const canSubmit = uploadedTypes.length > 0 && !submitting;

  const handleSubmit = async () => {
    setSubmitError('');
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await submitOwnershipRequest(property._id, token);
      if (onSubmitted) onSubmitted();
      onClose();
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ovm-overlay" onClick={onClose}>
      <div className="ovm-dialog" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="ovm-close" onClick={onClose} aria-label="Close">&#10005;</button>

        <div className="ovm-header">
          <h3 className="ovm-title">Request Ownership Verification</h3>
          <p className="ovm-subtitle">
            <strong>{property.title}</strong>
          </p>
          <p className="ovm-desc">
            Upload documents proving you own this property. Our team will manually review
            each submission. You will not be approved automatically.
          </p>
        </div>

        <div className="ovm-slots">
          {DOCUMENT_SLOTS.map((slot) => {
            const up = uploads[slot.type];
            const existing = existingDocs[slot.type];
            const isDone  = up?.status === 'done';
            const isError = up?.status === 'error';
            const isBusy  = up?.status === 'uploading';
            const hasDoc  = isDone || !!existing;

            return (
              <div key={slot.type} className={`ovm-slot ${hasDoc ? 'ovm-slot--done' : ''}`}>
                <div className="ovm-slot-info">
                  <div className="ovm-slot-label">
                    {hasDoc && <span className="ovm-check">&#10003;</span>}
                    {slot.label}
                  </div>
                  <div className="ovm-slot-hint">{slot.hint}</div>
                  {isError && <div className="ovm-slot-error">{up.error}</div>}
                  {existing && !isDone && (
                    <a href={existing} target="_blank" rel="noreferrer" className="ovm-existing-link">
                      View uploaded file ↗
                    </a>
                  )}
                </div>

                <label className={`ovm-upload-btn ${isBusy ? 'ovm-upload-btn--busy' : ''}`}>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    style={{ display: 'none' }}
                    disabled={isBusy}
                    onChange={e => handleFileChange(slot.type, e.target.files[0])}
                  />
                  {isBusy ? 'Uploading…' : hasDoc ? 'Replace' : 'Upload'}
                </label>
              </div>
            );
          })}
        </div>

        <div className="ovm-notice">
          Accepted formats: JPEG, PNG, WebP, PDF. Max 10 MB per file.
          At least one document is required to submit.
        </div>

        {submitError && <p className="ovm-error">{submitError}</p>}

        <div className="ovm-actions">
          <button className="ovm-btn-cancel" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button className="ovm-btn-submit" onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? 'Submitting…' : 'Submit for Review'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OwnershipVerificationModal;
