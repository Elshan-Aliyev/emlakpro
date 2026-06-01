import React, { useState, useEffect } from 'react';
import { submitInquiry } from '../services/api';
import ListingConfidencePanel from './ListingConfidencePanel';
import './InquiryModal.css';

const ACCOUNT_TYPE_LABELS = {
  realtor:    'Licensed realtor',
  corporate:  'Corporate account',
  developer:  'Property developer',
  individual: 'Individual seller',
};

const DEFAULT_MESSAGE =
  'Hello, I am interested in this property. Is it still available?';

const InquiryModal = ({ property, currentUser, onClose, onSuccess }) => {
  const owner = property?.ownerId || {};

  const [name,    setName]    = useState(currentUser?.name || '');
  const [phone,   setPhone]   = useState(currentUser?.phone || '');
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState('');
  const [sent,    setSent]    = useState(false);

  useEffect(() => {
    if (!sent) return;
    const timer = setTimeout(() => onSuccess?.(), 1800);
    return () => clearTimeout(timer);
  }, [sent, onSuccess]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Please enter a message.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      await submitInquiry(property._id, { name: name.trim(), phone: phone.trim(), message: message.trim() }, token);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send inquiry. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const getImageUrl = (image) => {
    if (!image) return null;
    if (typeof image === 'string') return image;
    return image.thumbnail || image.medium || image.large;
  };

  const thumb = property?.images?.[0] ? getImageUrl(property.images[0]) : null;

  return (
    <div className="iq-overlay" onClick={onClose}>
      <div className="iq-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Send inquiry">
        {/* Close */}
        <button className="iq-close" onClick={onClose} aria-label="Close">&#10005;</button>

        {/* Header */}
        <div className="iq-header">
          <p className="iq-label">Send Inquiry</p>
          <div className="iq-property-row">
            {thumb && <img src={thumb} alt="" className="iq-thumb" />}
            <div className="iq-property-info">
              <p className="iq-property-title">{property?.title}</p>
              {property?.price && (
                <p className="iq-property-price">
                  {property.currency || 'AZN'} {property.price.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="iq-divider" />

        {sent ? (
          <div className="iq-success">
            <span className="iq-success-icon">&#10003;</span>
            <p className="iq-success-title">Inquiry sent</p>
            <p className="iq-success-sub">The owner will be notified.</p>
          </div>
        ) : (
          <form className="iq-form" onSubmit={handleSubmit} noValidate>
            {/* Name */}
            <div className="iq-field">
              <label className="iq-field-label" htmlFor="iq-name">Your name</label>
              <input
                id="iq-name"
                className="iq-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                disabled={sending}
              />
            </div>

            {/* Phone */}
            <div className="iq-field">
              <label className="iq-field-label" htmlFor="iq-phone">
                Phone <span className="iq-optional">(optional)</span>
              </label>
              <input
                id="iq-phone"
                className="iq-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+994 XX XXX XXXX"
                disabled={sending}
              />
            </div>

            {/* Message */}
            <div className="iq-field">
              <label className="iq-field-label" htmlFor="iq-message">Message</label>
              <textarea
                id="iq-message"
                className="iq-textarea"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={sending}
              />
            </div>

            {error && <p className="iq-error">{error}</p>}

            {/* Trust panel */}
            <ListingConfidencePanel property={property} />

            {/* Owner line */}
            {owner.name && (
              <div className="iq-owner-line">
                <span className="iq-owner-label">Listed by</span>
                <span className="iq-owner-name">{owner.name}{owner.lastName ? ` ${owner.lastName}` : ''}</span>
                {owner.accountType && (
                  <span className="iq-owner-type">
                    · {ACCOUNT_TYPE_LABELS[owner.accountType] || owner.accountType}
                  </span>
                )}
                {owner.verified && (
                  <span className="iq-owner-verified" title="Verified account">&#10003; Verified</span>
                )}
              </div>
            )}

            {/* Safety note */}
            <p className="iq-safety-note">
              Messages go directly to the property owner. Never transfer a deposit before visiting the property in person.
            </p>

            {/* Actions */}
            <div className="iq-actions">
              <button type="button" className="iq-btn-cancel" onClick={onClose} disabled={sending}>
                Cancel
              </button>
              <button type="submit" className="iq-btn-send" disabled={sending || !message.trim()}>
                {sending ? 'Sending…' : 'Send Inquiry'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default InquiryModal;
