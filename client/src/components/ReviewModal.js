import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Star } from 'lucide-react';
import { submitPropertyReview, updatePropertyReview } from '../services/api';
import { track } from '../services/analytics';
import './ReviewModal.css';

const REVIEW_TYPES = [
  { value: 'buyer-experience',  label: 'Buyer Experience'          },
  { value: 'rental-experience', label: 'Rental Experience'         },
  { value: 'general-feedback',  label: 'General Property Feedback' },
];

const ReviewModal = ({ propertyId, existingReview, onClose, onSuccess }) => {
  const [rating,      setRating]      = useState(existingReview?.rating     || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewType,  setReviewType]  = useState(existingReview?.reviewType || '');
  const [recommended, setRecommended] = useState(existingReview?.recommended !== false);
  const [title,       setTitle]       = useState(existingReview?.title       || '');
  const [review,      setReview]      = useState(existingReview?.review      || '');
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');
  const hasDraft    = useRef(false);
  const startedFired = useRef(false);
  const isEdit = !!existingReview;

  useEffect(() => {
    track('review_modal_opened', { propertyId });
  }, [propertyId]);

  const handleReviewChange = (e) => {
    setReview(e.target.value);
    hasDraft.current = true;
    if (!startedFired.current && e.target.value.length >= 3) {
      startedFired.current = true;
      track('review_submission_started', { propertyId });
    }
  };

  const handleClose = useCallback(() => {
    if (hasDraft.current && (review.length > 0 || title.length > 0)) {
      if (!window.confirm('Discard your review? Your draft will not be saved.')) return;
    }
    onClose();
  }, [review, title, onClose]);

  const handleSubmit = async () => {
    setError('');
    if (!rating)     { setError('Please select a star rating.');   return; }
    if (!reviewType) { setError('Please select a review type.');   return; }
    if (review.trim().length < 20) { setError('Review must be at least 20 characters.'); return; }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const data  = { propertyId, rating, reviewType, title, review: review.trim(), recommended };

      if (isEdit) {
        await updatePropertyReview(existingReview._id, data, token);
        track('review_updated', { reviewId: existingReview._id, propertyId });
      } else {
        await submitPropertyReview(data, token);
        track('review_submitted', { propertyId, reviewType, rating, recommended });
      }

      hasDraft.current = false;
      onSuccess();
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.message;
      if (status === 409) setError(msg || 'You have already reviewed this property.');
      else if (status === 403) setError(msg || 'You are not allowed to submit this review.');
      else setError(msg || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="rm-backdrop"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Edit your review' : 'Write a review'}
    >
      <div className="rm-panel" onClick={e => e.stopPropagation()}>
        <div className="rm-header">
          <h2 className="rm-title">{isEdit ? 'Edit your review' : 'Write a review'}</h2>
          <button className="rm-close" onClick={handleClose} aria-label="Close">
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {/* Star rating */}
        <div className="rm-field">
          <label className="rm-label">Rating <span className="rm-required">*</span></label>
          <div className="rm-stars" role="radiogroup" aria-label="Star rating">
            {[1,2,3,4,5].map(n => (
              <button
                key={n}
                type="button"
                className={`rm-star${n <= (hoverRating || rating) ? ' rm-star--filled' : ''}`}
                onClick={() => { setRating(n); hasDraft.current = true; }}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`${n} star${n !== 1 ? 's' : ''}`}
              >
                <Star size={22} strokeWidth={1.5} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>

        {/* Review type */}
        <div className="rm-field">
          <label className="rm-label" htmlFor="rm-type">
            Review type <span className="rm-required">*</span>
          </label>
          <select
            id="rm-type"
            className="rm-select"
            value={reviewType}
            onChange={e => { setReviewType(e.target.value); hasDraft.current = true; }}
          >
            <option value="">Select type…</option>
            {REVIEW_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Recommended toggle */}
        <div className="rm-field rm-field--inline">
          <label className="rm-label" htmlFor="rm-recommended">
            Would you recommend this property?
          </label>
          <button
            id="rm-recommended"
            type="button"
            className={`rm-toggle${recommended ? ' rm-toggle--on' : ''}`}
            onClick={() => { setRecommended(r => !r); hasDraft.current = true; }}
            aria-pressed={recommended}
          >
            {recommended ? 'Yes' : 'No'}
          </button>
        </div>

        {/* Title */}
        <div className="rm-field">
          <label className="rm-label" htmlFor="rm-title">
            Title <span className="rm-optional">(optional)</span>
          </label>
          <input
            id="rm-title"
            className="rm-input"
            type="text"
            maxLength={120}
            value={title}
            onChange={e => { setTitle(e.target.value); hasDraft.current = true; }}
            placeholder="Summarise your experience"
          />
        </div>

        {/* Review body */}
        <div className="rm-field">
          <label className="rm-label" htmlFor="rm-review">
            Review <span className="rm-required">*</span>
          </label>
          <textarea
            id="rm-review"
            className="rm-textarea"
            rows={5}
            maxLength={2000}
            value={review}
            onChange={handleReviewChange}
            placeholder="Consider: listing accuracy, property condition, neighbourhood, owner responsiveness"
          />
          <div className="rm-counter" aria-live="polite">
            <span className={review.length < 20 ? 'rm-counter--warn' : ''}>{review.length}</span>
            {' '}/ 2000
          </div>
        </div>

        {error && <p className="rm-error" role="alert">{error}</p>}

        <div className="rm-actions">
          <button
            type="button"
            className="rm-btn rm-btn--cancel"
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rm-btn rm-btn--submit"
            onClick={handleSubmit}
            disabled={submitting || !rating || !reviewType || review.trim().length < 20}
          >
            {submitting ? 'Submitting…' : isEdit ? 'Save changes' : 'Submit review'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
