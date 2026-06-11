import React, { useEffect, useState, useCallback } from 'react';
import { Star, ThumbsUp, Flag, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { getPropertyReviews, reportPropertyReview, markPropertyReviewHelpful, addOwnerResponseToReview } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { track } from '../services/analytics';
import ReviewModal from './ReviewModal';
import './PropertyReputation.css';

const SORT_OPTIONS = [
  { value: 'recent',  label: 'Most Recent'   },
  { value: 'helpful', label: 'Most Helpful'  },
  { value: 'highest', label: 'Highest Rated' },
  { value: 'lowest',  label: 'Lowest Rated'  },
];

const REVIEW_TYPE_LABELS = {
  'buyer-experience':  'Buyer Experience',
  'rental-experience': 'Rental Experience',
  'general-feedback':  'General Feedback',
};

const REPORT_REASONS = [
  { value: 'spam',       label: 'Spam or fake review'          },
  { value: 'offensive',  label: 'Offensive content'            },
  { value: 'irrelevant', label: 'Irrelevant to this property'  },
  { value: 'other',      label: 'Other'                        },
];

function StarRow({ rating, size = 14 }) {
  return (
    <span className="prr-star-row" aria-label={`${rating} out of 5 stars`}>
      {[1,2,3,4,5].map(n => (
        <Star
          key={n}
          size={size}
          strokeWidth={1.5}
          className={n <= rating ? 'prr-star--filled' : 'prr-star--empty'}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function DistributionBars({ distribution }) {
  if (!distribution || distribution.length === 0) return null;
  const max = Math.max(...distribution.map(d => d.count), 1);
  return (
    <div className="prr-dist">
      {[...distribution].sort((a, b) => b.star - a.star).map(({ star, count }) => (
        <div key={star} className="prr-dist-row">
          <span className="prr-dist-label">{star}★</span>
          <div className="prr-dist-track">
            <div
              className="prr-dist-fill"
              style={{ width: `${(count / max) * 100}%` }}
              aria-hidden="true"
            />
          </div>
          <span className="prr-dist-count">{count}</span>
        </div>
      ))}
    </div>
  );
}

function ReviewCard({ review, currentUserId, isOwner, onReport, onHelpful, onOwnerResponse }) {
  const [expanded,        setExpanded]        = useState(false);
  const [responseOpen,    setResponseOpen]    = useState(false);
  const [respondingOpen,  setRespondingOpen]  = useState(false);
  const [responseText,    setResponseText]    = useState(review.ownerResponse?.text || '');
  const [savingResponse,  setSavingResponse]  = useState(false);

  const reviewer = review.reviewerId;
  const name = reviewer
    ? `${reviewer.name || ''}${reviewer.lastName?.[0] ? ' ' + reviewer.lastName[0] + '.' : ''}`.trim()
    : 'Anonymous';

  const handleSaveResponse = async () => {
    if (!responseText.trim()) return;
    setSavingResponse(true);
    try {
      await onOwnerResponse(review._id, responseText.trim());
      setRespondingOpen(false);
      track('owner_response_added', { reviewId: review._id });
    } finally {
      setSavingResponse(false);
    }
  };

  return (
    <div className="prr-card">
      <div className="prr-card-top">
        <div className="prr-card-meta">
          <span className="prr-reviewer">{name}</span>
          <StarRow rating={review.rating} size={13} />
          <span className={`prr-type-chip prr-type-chip--${review.reviewType}`}>
            {REVIEW_TYPE_LABELS[review.reviewType] || review.reviewType}
          </span>
          {review.recommended && (
            <span className="prr-recommend-badge">✓ Recommends</span>
          )}
        </div>
        <span className="prr-date">
          {new Date(review.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
        </span>
      </div>

      {review.title && <p className="prr-card-title">{review.title}</p>}

      <div className={`prr-card-body${expanded ? '' : ' prr-card-body--clamped'}`}>
        {review.review}
      </div>
      {review.review.length > 180 && (
        <button className="prr-expand-btn" onClick={() => setExpanded(e => !e)}>
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      {review.reviewHelpfulCount > 0 && (
        <p className="prr-helpful-count">
          <ThumbsUp size={11} strokeWidth={2} aria-hidden="true" />
          {review.reviewHelpfulCount} {review.reviewHelpfulCount === 1 ? 'person' : 'people'} found this helpful
        </p>
      )}

      <div className="prr-card-actions">
        <button
          className="prr-helpful-btn"
          onClick={() => onHelpful(review._id)}
          aria-label="Mark as helpful"
        >
          <ThumbsUp size={12} strokeWidth={2} aria-hidden="true" />
          Helpful{review.reviewHelpfulCount > 0 ? ` (${review.reviewHelpfulCount})` : ''}
        </button>

        {/* Report: visible only to authenticated non-owners (unauthenticated users cannot submit reports) */}
        {currentUserId && currentUserId !== String(reviewer?._id) && !isOwner && (
          <button
            className="prr-report-btn"
            onClick={() => onReport(review._id)}
            aria-label="Report review"
          >
            <Flag size={12} strokeWidth={2} aria-hidden="true" />
            Report
          </button>
        )}

        {isOwner && !review.ownerResponse?.text && (
          <button
            className="prr-respond-btn"
            onClick={() => setRespondingOpen(o => !o)}
          >
            <MessageSquare size={12} strokeWidth={2} aria-hidden="true" />
            Respond
          </button>
        )}
      </div>

      {/* Inline response form for owner */}
      {isOwner && respondingOpen && (
        <div className="prr-respond-form">
          <textarea
            className="prr-respond-input"
            rows={3}
            maxLength={1000}
            value={responseText}
            onChange={e => setResponseText(e.target.value)}
            placeholder="Write your response…"
          />
          <div className="prr-respond-actions">
            <button onClick={() => setRespondingOpen(false)}>Cancel</button>
            <button
              className="prr-respond-submit"
              onClick={handleSaveResponse}
              disabled={savingResponse || !responseText.trim()}
            >
              {savingResponse ? 'Saving…' : 'Post response'}
            </button>
          </div>
        </div>
      )}

      {/* Existing owner response */}
      {review.ownerResponse?.text && (
        <div className="prr-response-wrap">
          <button
            className="prr-response-toggle"
            onClick={() => setResponseOpen(o => !o)}
          >
            Owner responded ·{' '}
            {new Date(review.ownerResponse.respondedAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
            {responseOpen
              ? <ChevronUp size={14} aria-hidden="true" />
              : <ChevronDown size={14} aria-hidden="true" />}
          </button>
          {responseOpen && (
            <div className="prr-response-body">
              {review.ownerResponse.text}
              {isOwner && (
                <button
                  className="prr-respond-edit-btn"
                  onClick={() => { setResponseText(review.ownerResponse.text); setRespondingOpen(true); setResponseOpen(false); }}
                >
                  Edit
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const PropertyReputation = ({ propertyId, isOwner }) => {
  const { user } = useAuth();
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [sort,          setSort]          = useState('recent');
  const [page,          setPage]          = useState(1);
  const [reviewModal,   setReviewModal]   = useState(false);
  const [editTarget,    setEditTarget]    = useState(null);
  const [reportTarget,  setReportTarget]  = useState(null);
  const [reportReason,  setReportReason]  = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPropertyReviews(propertyId, { sort, page });
      setData(res.data);
    } catch (err) {
      console.error('PropertyReputation fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [propertyId, sort, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSortChange = (e) => {
    const newSort = e.target.value;
    setSort(newSort);
    setPage(1);
    track('review_sort_changed', { sort: newSort, propertyId });
  };

  const handleReport = (reviewId) => {
    setReportTarget(reviewId);
    setReportReason('');
  };

  const submitReport = async () => {
    if (!reportReason) return;
    setReportSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await reportPropertyReview(reportTarget, reportReason, token);
      track('review_reported', { reviewId: reportTarget, reason: reportReason });
      setReportTarget(null);
      fetchData();
    } catch (err) {
      console.error('Report error:', err);
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleHelpful = async (reviewId) => {
    if (!user) return;
    try {
      const token = localStorage.getItem('token');
      await markPropertyReviewHelpful(reviewId, token);
      track('review_helpful_voted', { reviewId, propertyId });
      fetchData();
    } catch (err) {
      console.error('Helpful error:', err);
    }
  };

  const handleOwnerResponse = async (reviewId, text) => {
    const token = localStorage.getItem('token');
    await addOwnerResponseToReview(reviewId, text, token);
    fetchData();
  };

  const identity  = data?.identity;
  const reviews   = data?.reviews || [];
  const pages     = data?.pages   || 1;
  const noReviews = !loading && (!identity || identity.reviewCount === 0);
  const canReview = !!user && !isOwner;

  return (
    <section className="prr-section" aria-labelledby="prr-heading">
      <h2 id="prr-heading" className="prr-heading">Property Reviews</h2>

      {/* Empty state */}
      {noReviews && (
        <div className="prr-empty">
          <p className="prr-empty-text">No reviews yet.</p>
          {canReview && (
            <button className="prr-write-btn" onClick={() => setReviewModal(true)}>
              Be the first to review this property
            </button>
          )}
        </div>
      )}

      {/* Aggregate + distribution */}
      {identity && identity.reviewCount > 0 && (
        <>
          <div className="prr-aggregate">
            <div className="prr-agg-score">
              <span className="prr-agg-number">{(identity.avgRating || 0).toFixed(1)}</span>
              <StarRow rating={Math.round(identity.avgRating || 0)} size={18} />
              <span className="prr-agg-count">
                {identity.reviewCount} review{identity.reviewCount !== 1 ? 's' : ''}
              </span>
              {identity.recommendPercentage > 0 && (
                <span className="prr-agg-recommend">
                  {identity.recommendPercentage}% recommend
                </span>
              )}
            </div>
            <DistributionBars distribution={data?.ratingDistribution} />
          </div>

          {/* Controls */}
          <div className="prr-controls">
            <select
              className="prr-sort-select"
              value={sort}
              onChange={handleSortChange}
              aria-label="Sort reviews"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {canReview && (
              <button
                className="prr-write-btn prr-write-btn--outline"
                onClick={() => setReviewModal(true)}
              >
                Write a Review
              </button>
            )}
          </div>

          {/* Review list */}
          {loading ? (
            <p className="prr-loading">Loading reviews…</p>
          ) : (
            <div className="prr-list">
              {reviews.map(r => (
                <ReviewCard
                  key={r._id}
                  review={r}
                  currentUserId={user?._id || user?.id}
                  isOwner={isOwner}
                  onReport={handleReport}
                  onHelpful={handleHelpful}
                  onOwnerResponse={handleOwnerResponse}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="prr-pagination">
              <button
                className="prr-page-btn"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              <span className="prr-page-info">Page {page} of {pages}</span>
              <button
                className="prr-page-btn"
                disabled={page >= pages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Review modal (write/edit) */}
      {reviewModal && (
        <ReviewModal
          propertyId={propertyId}
          onClose={() => setReviewModal(false)}
          onSuccess={() => { setReviewModal(false); setPage(1); fetchData(); }}
        />
      )}
      {editTarget && (
        <ReviewModal
          propertyId={propertyId}
          existingReview={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => { setEditTarget(null); fetchData(); }}
        />
      )}

      {/* Report modal */}
      {reportTarget && (
        <div
          className="prr-report-backdrop"
          onClick={() => !reportSubmitting && setReportTarget(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Report review"
        >
          <div className="prr-report-modal" onClick={e => e.stopPropagation()}>
            <h3>Report Review</h3>
            <select
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              className="prr-sort-select"
            >
              <option value="">Select reason…</option>
              {REPORT_REASONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <div className="prr-report-actions">
              <button
                onClick={() => setReportTarget(null)}
                disabled={reportSubmitting}
              >
                Cancel
              </button>
              <button
                className="prr-report-submit"
                onClick={submitReport}
                disabled={!reportReason || reportSubmitting}
              >
                {reportSubmitting ? 'Submitting…' : 'Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PropertyReputation;
