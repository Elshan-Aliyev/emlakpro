import React, { useEffect, useState, useCallback, memo } from 'react';
import { getProperty, getProperties, getSavedProperties, toggleSaveProperty, revealPhone } from '../services/api';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Camera, Check, Sparkles, X, ChevronLeft, ChevronRight, Phone, Mail, Heart,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import TrustBadge from '../components/TrustBadge';
import PropertyMap from '../components/PropertyMap';
import FavoriteButton from '../components/FavoriteButton';
import ReportModal from '../components/ReportModal';
import ListingConfidencePanel from '../components/ListingConfidencePanel';
import InquiryModal from '../components/InquiryModal';
import { generatePropertySummary, generateMarketInsights } from '../utils/propertyAI';
import { track, priceBucket, captureError } from '../services/analytics';
import PropertyReputation from '../components/PropertyReputation';
import { Helmet } from 'react-helmet-async';
import './PropertyDetail.css';

const MemoizedPropertyMap = memo(PropertyMap);

// ─── Icon aliases (preserve call-sites without touching the rest of the file) ──
const IconCamera       = () => <Camera        size={14} strokeWidth={2}   aria-hidden="true" />;
const IconCheck        = ({ size = 13 }) => <Check size={size} strokeWidth={2.5} aria-hidden="true" />;
const IconSparkle      = () => <Sparkles      size={13} strokeWidth={2}   aria-hidden="true" />;
const IconClose        = () => <X             size={18} strokeWidth={2.5} aria-hidden="true" />;
const IconChevronLeft  = () => <ChevronLeft   size={20} strokeWidth={2.5} aria-hidden="true" />;
const IconChevronRight = () => <ChevronRight  size={20} strokeWidth={2.5} aria-hidden="true" />;
const IconPhone        = () => <Phone         size={18} strokeWidth={2}   aria-hidden="true" />;
const IconMessage      = () => <Mail          size={18} strokeWidth={2}   aria-hidden="true" />;
const IconHeart        = ({ filled }) => (
  <Heart size={20} strokeWidth={2} style={filled ? { fill: 'currentColor' } : undefined} aria-hidden="true" />
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const PropertyDetailSkeleton = () => (
  <div className="pd-container">
    <div className="pd-sk pd-sk--gallery" />
    <div className="pd-body">
      <div className="pd-main">
        <div className="pd-identity">
          <div className="pd-sk pd-sk--price" />
          <div className="pd-sk pd-sk--address" />
          <div className="pd-sk pd-sk--meta" />
        </div>
        <div className="pd-section" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[90, 70, 55, 80, 65].map((w, i) => (
            <div key={i} className="pd-sk pd-sk--line" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
      <div className="pd-sidebar">
        <div className="pd-sk pd-sk--card" />
      </div>
    </div>
  </div>
);

// ─── Static lookup tables ─────────────────────────────────────────────────────
const PROPERTY_TYPE_LABELS = {
  apartment: 'Apartment', 'old-building': 'Older Building', 'new-building': 'New Building',
  house: 'House', villa: 'Villa', townhouse: 'Townhouse', penthouse: 'Penthouse',
  studio: 'Studio', duplex: 'Duplex', 'commercial-retail': 'Commercial Retail',
  'commercial-unit': 'Commercial Unit', office: 'Office', shop: 'Shop',
  restaurant: 'Restaurant', warehouse: 'Warehouse', industrial: 'Industrial',
  land: 'Land / Plot', farm: 'Farm', cabin: 'Cabin', cottage: 'Cottage',
  bungalow: 'Bungalow', chalet: 'Chalet', loft: 'Loft', 'tiny-house': 'Tiny House',
  'mobile-home': 'Mobile Home', room: 'Private Room', 'shared-room': 'Shared Room',
};

const LISTING_STATUS_LABELS = {
  'for-sale': 'For Sale',
  'for-rent': 'For Rent',
  'new-project': 'New Project',
};

const DESC_THRESHOLD = 500;

// ─── Component ────────────────────────────────────────────────────────────────
const PropertyDetail = ({ property: propProperty, isModal = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();

  const [property, setProperty]             = useState(propProperty || null);
  const [error, setError]                   = useState('');
  const [showInquiryModal, setShowInquiry]  = useState(false);
  const [phoneRevealed, setPhoneRevealed]   = useState(false);
  const [revealedPhone, setRevealedPhone]   = useState(null);
  const [selectedImageIndex, setImgIdx]     = useState(0);
  const [showLightbox, setShowLightbox]     = useState(false);
  const [isFavorite, setIsFavorite]         = useState(false);
  const [showReportModal, setShowReport]    = useState(false);
  const [descExpanded, setDescExpanded]     = useState(false);
  const [copied, setCopied]                 = useState(false);
  const [relatedProperties, setRelated]     = useState([]);

  const getLocation = (p) => {
    if (typeof p.location === 'string') return p.location;
    if (typeof p.city === 'string') return p.city;
    if (p.location?.city) return p.location.city;
    if (p.address?.city) return p.address.city;
    return '—';
  };

  useEffect(() => {
    const checkFavorites = (propId, token) => {
      getSavedProperties(token)
        .then((res) => {
          if (Array.isArray(res.data)) setIsFavorite(res.data.some((p) => p._id === propId));
        })
        .catch(() => {});
    };

    if (propProperty) {
      setProperty(propProperty);
      const token = localStorage.getItem('token');
      if (token) checkFavorites(propProperty._id, token);
      return;
    }
    if (!id) return;

    getProperty(id)
      .then((res) => {
        setProperty(res.data);
        const token = localStorage.getItem('token');
        if (token) checkFavorites(id, token);
        const p = res.data;
        track('property_viewed', {
          property_id:    p._id,
          listing_status: p.listingStatus,
          property_type:  p.propertyType,
          district:       p.district || '',
          price_bucket:   priceBucket(p.price),
          seller_type:    p.ownerId?.accountType || 'unknown',
          traffic_source: document.referrer ? new URL(document.referrer).hostname : 'direct',
        });
      })
      .catch((err) => {
        captureError(err, { context: 'property_detail_fetch', id });
        setError(err.response?.data?.message || 'This listing is temporarily unavailable.');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!property?._id || isModal) return;
    const params = { limit: 4, propertyType: property.propertyType };
    const loc = typeof property.location === 'string'
      ? property.location
      : property.city || property.location?.city || '';
    if (loc) params.city = loc;
    if (property.price) {
      params.priceMin = Math.floor(property.price * 0.65);
      params.priceMax = Math.ceil(property.price * 1.38);
    }
    getProperties(params)
      .then(res => {
        const props = (res.data?.properties || []).filter(p => p._id !== property._id).slice(0, 4);
        setRelated(props);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property?._id, isModal]);

  const openInquiry = useCallback(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login', { state: { from: location.pathname, intent: 'inquiry' } });
      return;
    }
    track('inquiry_started', {
      property_id:    property?._id,
      listing_status: property?.listingStatus,
      district:       property?.district || '',
      price_bucket:   priceBucket(property?.price),
    });
    setShowInquiry(true);
  }, [navigate, location.pathname, property?._id, property?.listingStatus, property?.district, property?.price]);

  const handleRevealPhone = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { state: { from: location.pathname, intent: 'phone' } });
      return;
    }
    track('phone_revealed', {
      property_id:    property?._id,
      listing_status: property?.listingStatus,
      district:       property?.district || '',
      price_bucket:   priceBucket(property?.price),
    });
    setPhoneRevealed(true);
    revealPhone(property._id, token)
      .then((res) => setRevealedPhone(res.data.phone))
      .catch(() => setRevealedPhone(null));
  }, [navigate, location.pathname, property?._id, property?.listingStatus, property?.district, property?.price]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getImageUrl = (image, size = 'large') => {
    if (!image) return null;
    if (typeof image === 'string') return image.startsWith('http') ? image : null;
    if (typeof image === 'object') return image[size] || image.large || image.medium || image.thumbnail;
    return null;
  };

  const openLightbox = (i) => {
    if (i === 0) track('gallery_opened', { property_id: property?._id });
    setImgIdx(i);
    setShowLightbox(true);
  };;
  const nextImage    = () => setImgIdx((p) => (p + 1) % property.images.length);
  const prevImage    = () => setImgIdx((p) => (p - 1 + property.images.length) % property.images.length);

  if (error) return <p style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>{error}</p>;
  if (!property) return <PropertyDetailSkeleton />;

  // Decode role from token
  let role = null, currentUserId = null;
  try {
    const t = localStorage.getItem('token');
    if (t) { const p = JSON.parse(atob(t.split('.')[1])); role = p.role; currentUserId = p.id; }
  } catch (_) {}

  const isOwner = property.ownerId && (
    property.ownerId._id ? property.ownerId._id === currentUserId : property.ownerId === currentUserId
  );
  const isAdmin = role === 'admin' || role === 'superadmin';
  const hasImages = Array.isArray(property.images) && property.images.length > 0;

  // AI insight — calm, data-driven, single signal
  const aiInsight = (() => {
    const now       = Date.now();
    const created   = property.createdAt ? new Date(property.createdAt).getTime() : null;
    const confirmed = property.lastConfirmedAvailableAt ? new Date(property.lastConfirmedAvailableAt).getTime() : null;
    const responseH = property.ownerId?.averageResponseTimeHours;
    const respRate  = property.ownerId?.responseRate;
    const quality   = property.qualityScore || 0;
    const agent     = property.agentScore   || 0;

    if (confirmed && (now - confirmed) < 7  * 86_400_000) return 'Availability confirmed this week';
    if (created   && (now - created)   < 3  * 86_400_000) return 'New to the market';
    if (responseH != null && responseH < 4 && respRate != null && respRate >= 70) return 'Owner typically responds within a few hours';
    if (quality >= 85 || agent >= 85) return 'Strong value relative to nearby listings';
    if (quality >= 70)                return 'Popular among buyers this week';
    if (respRate != null && respRate >= 80) return 'High owner engagement rate';
    return null;
  })();

  // AI-generated descriptions — deterministic, no hallucination
  const propertySummary  = generatePropertySummary(property);
  const marketInsights   = generateMarketInsights(property, []);

  // Description collapse
  const desc = property.description || '';
  const isLongDesc = desc.length > DESC_THRESHOLD;
  const displayedDesc = isLongDesc && !descExpanded ? desc.slice(0, DESC_THRESHOLD).trimEnd() + '…' : desc;

  // Trust strip — only confirmed signals, contextually ordered and capped at 3
  const freshnessDaysAgo = (() => {
    const ref = property.lastConfirmedAvailableAt || property.lastOwnerActivityAt || property.updatedAt;
    if (!ref) return null;
    return Math.floor((Date.now() - new Date(ref)) / 86400000);
  })();

  const isRental = property.listingStatus === 'for-rent';

  const trustSignals = [
    property.isApproved                                  && { w: 2,                    text: 'Listing reviewed' },
    property.ownershipVerificationStatus === 'approved'  && { w: isRental ? 3 : 1,    text: 'Ownership verified' },
    property.ownerId?.phoneVerified                      && { w: isRental ? 4 : 3,    text: 'Phone verified' },
    freshnessDaysAgo !== null && freshnessDaysAgo <= 7   && { w: isRental ? 1 : 4,    text: 'Updated this week' },
    freshnessDaysAgo !== null && freshnessDaysAgo > 7 && freshnessDaysAgo <= 30 && { w: isRental ? 1 : 5, text: 'Recently active' },
  ].filter(Boolean).sort((a, b) => a.w - b.w).slice(0, 3).map(s => s.text);

  // Feature lists
  const interiorFeats = [
    property.flooringType && `Flooring: ${property.flooringType}`,
    property.heating && 'Heating', property.cooling && 'Air conditioning',
    property.kitchenAppliances && 'Kitchen appliances', property.waterHeater && 'Water heater',
    property.smartHome && 'Smart home', property.internetAvailable && 'Internet',
    property.builtInWardrobes && 'Built-in wardrobes', property.walkInCloset && 'Walk-in closet',
    property.maidsRoom && "Maid's room", property.storageRoom && 'Storage room',
    property.laundryRoom && 'Laundry room', property.openLayoutKitchen && 'Open layout kitchen',
  ].filter(Boolean);

  const exteriorFeats = [
    property.garage && 'Garage', property.garden && 'Garden',
    property.swimmingPool && 'Swimming pool',
    property.viewType && `${property.viewType.charAt(0).toUpperCase() + property.viewType.slice(1)} view`,
    property.roofAccess && 'Roof access', property.fenced && 'Fenced',
  ].filter(Boolean);

  const buildingFeats = [
    property.elevator && 'Elevator', property.security && 'Security / concierge',
    property.cctv && 'CCTV', property.gym && 'Gym', property.sharedPool && 'Shared pool',
    property.visitorParking && 'Visitor parking', property.wheelchairAccessible && 'Wheelchair accessible',
    property.petsAllowed && 'Pets allowed', property.gasAvailable && 'Gas available',
    property.totalFloorsInBuilding && `${property.totalFloorsInBuilding} floors total`,
  ].filter(Boolean);

  const nearbyFeats = property.nearby ? [
    property.nearby.schools && 'Schools', property.nearby.hospital && 'Hospital',
    property.nearby.metro && 'Metro', property.nearby.shoppingMall && 'Shopping centre',
    property.nearby.park && 'Park', property.nearby.airport && 'Airport',
  ].filter(Boolean) : [];

  const hasFeatures = interiorFeats.length || exteriorFeats.length || buildingFeats.length || nearbyFeats.length;
  const hasLegal = property.ownershipType || property.titleDeedAvailable || property.mortgageAllowed != null || property.developerName || property.hoaFees;

  const h = property.ownerId?.averageResponseTimeHours;
  const rr = property.ownerId?.responseRate;
  const responseNote =
    h != null && h < 4    ? 'Usually responds within a few hours' :
    h != null && h < 24 && rr != null && rr >= 60 ? 'Usually responds within a day' : null;

  // ── JSON-LD structured data for rich search results ─────────────────────────
  const jsonLd = !isModal ? {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: property.title,
    description: property.description || `${property.title} in ${getLocation(property)}`,
    url: `https://emlakpro.az/listing/${property._id}`,
    image: property.images?.map(img => {
      if (typeof img === 'string') return img;
      return img.large || img.medium || img.thumbnail;
    }).filter(Boolean) || [],
    offers: {
      '@type': 'Offer',
      price: property.price,
      priceCurrency: property.currency || 'AZN',
      availability: 'https://schema.org/InStock',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: getLocation(property),
      addressCountry: 'AZ',
    },
    numberOfRooms: property.bedrooms || undefined,
    floorSize: (property.builtUpArea || property.area)
      ? { '@type': 'QuantitativeValue', value: property.builtUpArea || property.area, unitCode: 'MTK' }
      : undefined,
  } : null;

  return (
    <div className={`pd-container${isModal ? ' modal-mode' : ''}`}>

      {property && (
        <Helmet>
          <title>{property.title} — Əmlak Pro</title>
          <meta name="description" content={`${property.propertyType || 'Property'} in ${property.city || 'Azerbaijan'}. ${(property.price || 0).toLocaleString()} ${property.currency || 'AZN'}.`} />
          <meta property="og:title" content={property.title} />
          <meta property="og:description" content={`${property.propertyType || 'Property'} in ${property.city || 'Azerbaijan'} — ${(property.price || 0).toLocaleString()} ${property.currency || 'AZN'}`} />
          <meta property="og:type" content="website" />
          <meta property="og:url" content={`https://emlakpro.az/properties/${property._id}`} />
          {property.images?.[0] && (
            <meta property="og:image" content={getImageUrl(property.images[0], 'large') || ''} />
          )}
          <link rel="canonical" href={`https://emlakpro.az/properties/${property._id}`} />
        </Helmet>
      )}

      {/* ── Structured data for rich Google results ─────────────────── */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd)
            .replace(/</g, '\\u003c')
            .replace(/>/g, '\\u003e')
            .replace(/&/g, '\\u0026') }}
        />
      )}

      {/* ── Cinematic Gallery ───────────────────────────────────────── */}
      {hasImages && (
        <div className={`pd-gallery${isModal ? ' pd-gallery--modal' : ''}`}>
          <div className="pd-gallery-main" onClick={() => openLightbox(0)}>
            <img
              src={getImageUrl(property.images[0], 'large')}
              alt={property.title}
              style={{ opacity: 0, transition: 'opacity 480ms cubic-bezier(0.22,1,0.36,1)' }}
              onLoad={(e) => { e.currentTarget.style.opacity = '1'; }}
              onError={(e) => { e.currentTarget.style.opacity = '0.3'; }}
            />
            <div className="pd-gallery-count">
              <IconCamera />
              <span>{property.images.length}</span>
            </div>
          </div>
          {property.images.length > 1 && (
            <div className="pd-gallery-thumbs">
              {property.images.slice(1, 5).map((img, i) => (
                <div key={i} className="pd-gallery-thumb" onClick={() => openLightbox(i + 1)}>
                  <img
                    src={getImageUrl(img, 'medium')}
                    alt={`View ${i + 2}`}
                    loading="lazy"
                    style={{ opacity: 0, transition: `opacity ${280 + i * 60}ms cubic-bezier(0.22,1,0.36,1)` }}
                    onLoad={(e) => { e.currentTarget.style.opacity = '1'; }}
                    onError={(e) => { e.currentTarget.style.opacity = '0'; }}
                  />
                  {i === 3 && property.images.length > 5 && (
                    <div className="pd-gallery-more">+{property.images.length - 5}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Body: two-column ────────────────────────────────────────── */}
      <div className="pd-body">

        {/* Left column */}
        <div className="pd-main">

          {/* Identity: price / address / facts / trust / AI */}
          <div className="pd-identity">
            <div className="pd-price-row">
              <span className="pd-price">
                {property.currency || 'AZN'} {property.price?.toLocaleString() ?? '—'}
              </span>
              {property.pricePerSqm && (
                <span className="pd-price-sqm">{property.pricePerSqm} / m²</span>
              )}
            </div>
            <h1 className="pd-address">{getLocation(property)}</h1>
            <div className="pd-fact-row">
              {property.bedrooms  > 0 && <span className="pd-fact">{property.bedrooms} bed</span>}
              {property.bathrooms > 0 && <span className="pd-fact">{property.bathrooms} bath</span>}
              {property.builtUpArea > 0 && <span className="pd-fact">{property.builtUpArea} m²</span>}
              {property.floorNumber && <span className="pd-fact">Floor {property.floorNumber}</span>}
              <span className="pd-fact pd-fact--type">
                {PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType}
              </span>
              <span className="pd-fact pd-fact--status">
                {LISTING_STATUS_LABELS[property.listingStatus] || property.listingStatus}
              </span>
              {property.negotiable && <span className="pd-fact pd-fact--green">Negotiable</span>}
            </div>

            {/* Institutional trust strip */}
            {trustSignals.length > 0 && (
              <div className="pd-trust-strip">
                {trustSignals.map((s, i) => (
                  <span key={i} className="pd-ts">
                    <IconCheck />
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* AI insight bar */}
            {aiInsight && (
              <div className="pd-ai-insight">
                <IconSparkle />
                <span>{aiInsight}</span>
              </div>
            )}

            {/* AI-generated property summary */}
            {propertySummary && (
              <p className="pd-ai-summary">{propertySummary}</p>
            )}
          </div>

          {/* Overview numbers */}
          {(property.bedrooms || property.bathrooms || property.builtUpArea || property.landArea ||
            property.parkingSpaces || property.yearBuilt || property.balconies) ? (
            <section className="pd-section">
              <h2 className="pd-section-label">Property overview</h2>
              <div className="pd-overview-grid">
                {property.bedrooms   > 0 && <div className="pd-ov-item"><span className="pd-ov-val">{property.bedrooms}</span><span className="pd-ov-key">Bedrooms</span></div>}
                {property.bathrooms  > 0 && <div className="pd-ov-item"><span className="pd-ov-val">{property.bathrooms}</span><span className="pd-ov-key">Bathrooms</span></div>}
                {property.balconies  > 0 && <div className="pd-ov-item"><span className="pd-ov-val">{property.balconies}</span><span className="pd-ov-key">Balconies</span></div>}
                {property.parkingSpaces > 0 && <div className="pd-ov-item"><span className="pd-ov-val">{property.parkingSpaces}</span><span className="pd-ov-key">Parking</span></div>}
                {property.builtUpArea > 0 && <div className="pd-ov-item"><span className="pd-ov-val">{property.builtUpArea} m²</span><span className="pd-ov-key">Built-up</span></div>}
                {property.landArea   > 0 && <div className="pd-ov-item"><span className="pd-ov-val">{property.landArea} m²</span><span className="pd-ov-key">Land area</span></div>}
                {property.yearBuilt      && <div className="pd-ov-item"><span className="pd-ov-val">{property.yearBuilt}</span><span className="pd-ov-key">Year built</span></div>}
              </div>
            </section>
          ) : null}

          {/* Description */}
          {desc && (
            <section className="pd-section">
              <h2 className="pd-section-label">About this property</h2>
              <div className="pd-desc-wrap">
                <p className="pd-desc">{displayedDesc}</p>
                {isLongDesc && (
                  <button className="pd-desc-toggle" onClick={() => setDescExpanded(!descExpanded)}>
                    {descExpanded ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Listing details */}
          <section className="pd-section">
            <h2 className="pd-section-label">Listing details</h2>
            <div className="pd-info-rows">
              <div className="pd-info-row">
                <span className="pd-info-key">Property type</span>
                <span className="pd-info-val">{PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType || '—'}</span>
              </div>
              {property.occupancy && (
                <div className="pd-info-row"><span className="pd-info-key">Occupancy</span><span className="pd-info-val">{property.occupancy}</span></div>
              )}
              {property.furnishing && (
                <div className="pd-info-row"><span className="pd-info-key">Furnishing</span><span className="pd-info-val">{property.furnishing}</span></div>
              )}
              {property.constructionStatus && (
                <div className="pd-info-row"><span className="pd-info-key">Construction</span><span className="pd-info-val">{property.constructionStatus}</span></div>
              )}
              {property.yearBuilt && (
                <div className="pd-info-row">
                  <span className="pd-info-key">Year built</span>
                  <span className="pd-info-val">{property.yearBuilt}{property.ageOfProperty ? ` · ${property.ageOfProperty} years` : ''}</span>
                </div>
              )}
              {property.floorNumber && (
                <div className="pd-info-row">
                  <span className="pd-info-key">Floor</span>
                  <span className="pd-info-val">{property.floorNumber}{property.totalFloorsInBuilding ? ` of ${property.totalFloorsInBuilding}` : ''}</span>
                </div>
              )}
            </div>
          </section>

          {/* Location + map */}
          <section className="pd-section">
            <h2 className="pd-section-label">Location</h2>
            <div className="pd-info-rows">
              <div className="pd-info-row"><span className="pd-info-key">Address</span><span className="pd-info-val">{getLocation(property)}</span></div>
              {property.city && (
                <div className="pd-info-row"><span className="pd-info-key">City</span><span className="pd-info-val" style={{ textTransform: 'capitalize' }}>{property.city}</span></div>
              )}
              {property.district && (
                <div className="pd-info-row"><span className="pd-info-key">District</span><span className="pd-info-val">{property.district}</span></div>
              )}
              {property.nearestMetro && (
                <div className="pd-info-row"><span className="pd-info-key">Nearest metro</span><span className="pd-info-val">{property.nearestMetro}</span></div>
              )}
              {property.buildingName && (
                <div className="pd-info-row"><span className="pd-info-key">Building</span><span className="pd-info-val">{property.buildingName}</span></div>
              )}
            </div>
            {property.coordinates && (property.coordinates.lat || property.coordinates.latitude) && (
              <div className="pd-map-wrap">
                <MemoizedPropertyMap
                  singleProperty={{
                    ...property,
                    coordinates: {
                      lat: property.coordinates.lat || property.coordinates.latitude,
                      lng: property.coordinates.lng || property.coordinates.longitude,
                    },
                  }}
                  height="320px"
                  showPopups={false}
                />
              </div>
            )}
          </section>

          {/* Rental terms */}
          {property.listingStatus === 'for-rent' && (
            <section className="pd-section">
              <h2 className="pd-section-label">Rental terms</h2>
              <div className="pd-info-rows">
                {property.monthlyRent && (
                  <div className="pd-info-row"><span className="pd-info-key">Monthly rent</span><span className="pd-info-val">{property.currency} {property.monthlyRent.toLocaleString()}</span></div>
                )}
                {property.depositAmount && (
                  <div className="pd-info-row"><span className="pd-info-key">Deposit</span><span className="pd-info-val">{property.currency} {property.depositAmount.toLocaleString()}</span></div>
                )}
                {property.paymentFrequency && (
                  <div className="pd-info-row"><span className="pd-info-key">Payment</span><span className="pd-info-val">{property.paymentFrequency}</span></div>
                )}
                {property.minContractPeriod && (
                  <div className="pd-info-row"><span className="pd-info-key">Min contract</span><span className="pd-info-val">{property.minContractPeriod} months</span></div>
                )}
                {property.utilitiesIncluded != null && (
                  <div className="pd-info-row"><span className="pd-info-key">Utilities</span><span className="pd-info-val">{property.utilitiesIncluded ? 'Included' : 'Not included'}</span></div>
                )}
              </div>
            </section>
          )}

          {/* Features & amenities */}
          {hasFeatures ? (
            <section className="pd-section">
              <h2 className="pd-section-label">Features & amenities</h2>
              {interiorFeats.length > 0 && (
                <div className="pd-feat-group">
                  <h3 className="pd-feat-group-label">Interior</h3>
                  <div className="pd-feat-tags">
                    {interiorFeats.map((f, i) => <span key={i} className="pd-feat-tag">{f}</span>)}
                  </div>
                </div>
              )}
              {exteriorFeats.length > 0 && (
                <div className="pd-feat-group">
                  <h3 className="pd-feat-group-label">Exterior</h3>
                  <div className="pd-feat-tags">
                    {exteriorFeats.map((f, i) => <span key={i} className="pd-feat-tag">{f}</span>)}
                  </div>
                </div>
              )}
              {buildingFeats.length > 0 && (
                <div className="pd-feat-group">
                  <h3 className="pd-feat-group-label">Building</h3>
                  <div className="pd-feat-tags">
                    {buildingFeats.map((f, i) => <span key={i} className="pd-feat-tag">{f}</span>)}
                  </div>
                </div>
              )}
              {nearbyFeats.length > 0 && (
                <div className="pd-feat-group">
                  <h3 className="pd-feat-group-label">Nearby</h3>
                  <div className="pd-feat-tags">
                    {nearbyFeats.map((f, i) => <span key={i} className="pd-feat-tag">{f}</span>)}
                  </div>
                </div>
              )}
            </section>
          ) : null}

          {/* Legal & financial */}
          {hasLegal ? (
            <section className="pd-section">
              <h2 className="pd-section-label">Legal & financial</h2>
              <div className="pd-info-rows">
                {property.ownershipType && (
                  <div className="pd-info-row"><span className="pd-info-key">Ownership</span><span className="pd-info-val">{property.ownershipType}</span></div>
                )}
                {property.titleDeedAvailable && (
                  <div className="pd-info-row"><span className="pd-info-key">Title deed</span><span className="pd-info-val">Available</span></div>
                )}
                {property.mortgageAllowed != null && (
                  <div className="pd-info-row"><span className="pd-info-key">Mortgage</span><span className="pd-info-val">{property.mortgageAllowed ? 'Allowed' : 'Not allowed'}</span></div>
                )}
                {property.developerName && (
                  <div className="pd-info-row"><span className="pd-info-key">Developer</span><span className="pd-info-val">{property.developerName}</span></div>
                )}
                {property.projectName && (
                  <div className="pd-info-row"><span className="pd-info-key">Project</span><span className="pd-info-val">{property.projectName}</span></div>
                )}
                {property.hoaFees && (
                  <div className="pd-info-row"><span className="pd-info-key">HOA / service fees</span><span className="pd-info-val">{property.currency || 'AZN'} {property.hoaFees.toLocaleString()}</span></div>
                )}
              </div>
            </section>
          ) : null}

          {/* Listing meta footer */}
          <div className="pd-listing-meta">
            {property.listingId && <span>Ref: {property.listingId}</span>}
            {property.createdAt && (
              <span>Listed {new Date(property.createdAt).toLocaleDateString('en', { month: 'short', year: 'numeric' })}</span>
            )}
            {property.viewsCount > 0 && <span>{property.viewsCount} total views</span>}
          </div>
        </div>

        {/* Right column: confidence center */}
        <div className="pd-sidebar">
          <div className="pd-contact-sticky">
            <div className="pd-contact-card">

              {/* Sticky summary — price + trust badges, desktop only */}
              <div className="pd-sticky-summary">
                <div className="pd-sticky-price">
                  {property.currency || 'AZN'} {property.price?.toLocaleString() || '—'}
                </div>
                <div className="pd-sticky-badges">
                  {property.ownershipVerificationStatus === 'approved' && (
                    <span className="pd-sticky-badge pd-sticky-badge--verified">
                      <IconCheck size={11} />
                      Verified Owner
                    </span>
                  )}
                  {property.isPromoted && property.promotionTier && property.promotionTier !== 'FREE' && (
                    <span className={`pd-sticky-badge pd-sticky-badge--promo pd-sticky-badge--${property.promotionTier.toLowerCase()}`}>
                      {property.promotionTier === 'SPOTLIGHT' ? 'Spotlight' : property.promotionTier === 'PREMIUM' ? 'Premium' : 'Featured'}
                    </span>
                  )}
                  {property.propertyIdentityId?.avgRating > 0 && property.propertyIdentityId?.reviewCount > 0 && (
                    <span className="pd-sticky-badge pd-sticky-badge--rating">
                      ★ {property.propertyIdentityId.avgRating.toFixed(1)} ({property.propertyIdentityId.reviewCount})
                    </span>
                  )}
                </div>
              </div>

              {/* Seller identity */}
              {property.ownerId && (
                <div className="pd-seller-row">
                  {property.ownerId.profileImage || property.ownerId.avatar ? (
                    <img
                      src={property.ownerId.profileImage || property.ownerId.avatar}
                      alt={property.ownerId.name}
                      className="pd-seller-avatar"
                    />
                  ) : (
                    <div className="pd-seller-avatar-ph">
                      {(property.ownerId.name || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="pd-seller-info">
                    <span className="pd-seller-name">{property.ownerId.name}</span>
                    {property.ownerId.companyName && (
                      <span className="pd-seller-company">{property.ownerId.companyName}</span>
                    )}
                    {property.ownerId.accountType && (
                      <div style={{ marginTop: 6 }}>
                        <TrustBadge accountType={property.ownerId.accountType} variant="chip" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Ownership reviewed notice — institutional */}
              {property.ownershipVerificationStatus === 'approved' && (
                <div className="pd-ov-notice">
                  <IconCheck size={13} />
                  Ownership documents reviewed
                </div>
              )}

              {/* Confidence panel */}
              <ListingConfidencePanel property={property} />

              {/* Market intelligence */}
              {marketInsights.length > 0 && (
                <div className="pd-market-insights">
                  {marketInsights.map((ins, i) => (
                    <div key={i} className={`pd-mi-item pd-mi-item--${ins.type}`}>
                      <Sparkles size={12} strokeWidth={2} aria-hidden="true" />
                      <span>{ins.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Contact actions */}
              {!isOwner && (
                <div className="pd-contact-actions">
                  <button className="pd-inquiry-btn" onClick={openInquiry}>
                    Send a message
                  </button>

                  <div className="pd-phone-wrap">
                    {!phoneRevealed ? (
                      <button className="pd-phone-reveal-btn" onClick={handleRevealPhone}>
                        Show phone number
                      </button>
                    ) : revealedPhone ? (
                      <div className="pd-phone-revealed">
                        <a href={`tel:${revealedPhone}`} className="pd-phone-link">
                          {revealedPhone}
                        </a>
                        <p className="pd-phone-safety">
                          Never transfer a deposit before visiting in person.
                        </p>
                      </div>
                    ) : (
                      <p className="pd-phone-safety">Phone number not available.</p>
                    )}
                  </div>

                  {responseNote && <p className="pd-response-note">{responseNote}</p>}
                </div>
              )}

              {/* Secondary actions */}
              <div className="pd-secondary-actions">
                <FavoriteButton
                  propertyId={property._id}
                  initialIsFavorite={isFavorite}
                  onToggle={(pid, confirmed) => setIsFavorite(confirmed)}
                />
                <div className="pd-text-actions">
                  <button className="pd-text-btn" onClick={() => window.print()}>Print</button>
                  <span className="pd-text-sep">·</span>
                  <button className="pd-text-btn" onClick={handleShare}>
                    {copied ? 'Copied!' : 'Share'}
                  </button>
                  {!isOwner && !isAdmin && (
                    <>
                      <span className="pd-text-sep">·</span>
                      <button className="pd-text-btn pd-text-btn--report" onClick={() => setShowReport(true)}>
                        Report
                      </button>
                    </>
                  )}
                </div>
              </div>

              {property.createdAt && (
                <div className="pd-listed-date">
                  Listed {new Date(property.createdAt).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Similar listings nearby */}
      {relatedProperties.length > 0 && !isModal && (
        <section className="pd-related">
          <p className="pd-related-label">
            Similar {PROPERTY_TYPE_LABELS[property.propertyType]?.toLowerCase() || 'listings'} nearby
          </p>
          <div className="pd-related-grid">
            {relatedProperties.map(p => {
              const img = Array.isArray(p.images) && p.images[0]
                ? (typeof p.images[0] === 'string' ? p.images[0] : p.images[0].medium || p.images[0].thumbnail)
                : null;
              const loc = typeof p.location === 'string'
                ? p.location
                : p.city || p.location?.city || '';
              return (
                <Link
                  key={p._id}
                  to={`/properties/${p._id}`}
                  className="pd-related-card"
                  onClick={() => track('related_listing_clicked', {
                    source_property_id: property?._id,
                    target_property_id: p._id,
                    property_type:      p.propertyType,
                  })}
                >
                  <div className="pd-related-img">
                    {img
                      ? <img src={img} alt={p.title} loading="lazy" />
                      : <div className="pd-related-img-ph" />}
                  </div>
                  <div className="pd-related-body">
                    <span className="pd-related-price">
                      {p.currency || 'AZN'} {p.price?.toLocaleString() ?? '—'}
                    </span>
                    <span className="pd-related-title">{p.title || PROPERTY_TYPE_LABELS[p.propertyType] || 'Property'}</span>
                    {loc && <span className="pd-related-loc">{loc}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
          <button
            className="pd-related-explore"
            onClick={() => navigate(`/search?propertyType=${property.propertyType}&listingStatus=${property.listingStatus || ''}`)}
          >
            More {PROPERTY_TYPE_LABELS[property.propertyType]?.toLowerCase() || 'listings'} →
          </button>
        </section>
      )}

      {/* Property Reputation — reviews that survive relisting */}
      <PropertyReputation
        propertyId={property._id}
        isOwner={isOwner}
      />

      {/* Owner/admin edit link */}
      {(isAdmin || isOwner) && !isModal && (
        <div className="pd-edit-bar">
          <button className="pd-edit-btn" onClick={() => navigate(`/properties/update/${property._id}`)}>
            Edit listing
          </button>
          {isOwner && property.promotionTier && property.promotionTier !== 'FREE' && property.isPromoted && (
            <div className="pd-promo-status">
              <span
                className="pd-promo-badge"
                style={{
                  color: property.promotionTier === 'SPOTLIGHT' ? '#0F766E'
                    : property.promotionTier === 'PREMIUM' ? '#7c3aed'
                    : '#d97706',
                  background: property.promotionTier === 'SPOTLIGHT' ? '#f0fdf4'
                    : property.promotionTier === 'PREMIUM' ? '#f5f3ff'
                    : '#fffbeb',
                }}
              >
                {property.promotionTier === 'SPOTLIGHT' ? 'Spotlight'
                  : property.promotionTier === 'PREMIUM' ? 'Premium'
                  : 'Featured'} active
              </span>
              {property.promotionEndDate && (() => {
                const end      = new Date(property.promotionEndDate);
                const now      = new Date();
                const daysLeft = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
                return (
                  <span className="pd-promo-meta">
                    {property.promotionStartDate && (
                      <span>
                        Started{' '}
                        {new Date(property.promotionStartDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    <span>
                      Expires{' '}
                      {end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className={daysLeft <= 3 ? 'pd-promo-expiring' : ''}>
                      {daysLeft}d remaining
                    </span>
                  </span>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showReportModal && (
        <ReportModal
          targetType="property"
          targetId={property._id}
          targetLabel={property.title}
          onClose={() => setShowReport(false)}
        />
      )}

      {showInquiryModal && (
        <InquiryModal
          property={property}
          currentUser={currentUser}
          onClose={() => setShowInquiry(false)}
          onSuccess={() => setShowInquiry(false)}
        />
      )}

      {/* Lightbox */}
      {showLightbox && hasImages && (
        <div className="lightbox-overlay" onClick={() => setShowLightbox(false)}>
          <button className="lightbox-close" onClick={() => setShowLightbox(false)}>
            <IconClose />
          </button>
          <button className="lightbox-prev" onClick={(e) => { e.stopPropagation(); prevImage(); }}>
            <IconChevronLeft />
          </button>
          <button className="lightbox-next" onClick={(e) => { e.stopPropagation(); nextImage(); }}>
            <IconChevronRight />
          </button>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img
              key={selectedImageIndex}
              src={getImageUrl(property.images[selectedImageIndex], 'full')}
              alt={property.title}
              style={{ opacity: 0, transition: 'opacity 240ms cubic-bezier(0.22,1,0.36,1)' }}
              onLoad={(e) => { e.currentTarget.style.opacity = '1'; }}
            />
            <div className="lightbox-counter">{selectedImageIndex + 1} / {property.images.length}</div>
          </div>
        </div>
      )}

      {/* Mobile sticky bar */}
      {!isOwner && !isModal && (
        <div className="mobile-contact-bar">
          {property.ownerId?.phone ? (
            <a href={`tel:${property.ownerId.phone}`} className="mobile-contact-btn mobile-contact-btn-secondary">
              <IconPhone />
              <span className="btn-text">Call</span>
            </a>
          ) : (
            <button className="mobile-contact-btn mobile-contact-btn-secondary" disabled>
              <IconPhone />
              <span className="btn-text">Call</span>
            </button>
          )}
          <button onClick={openInquiry} className="mobile-contact-btn mobile-contact-btn-primary">
            <IconMessage />
            <span className="btn-text">Message</span>
          </button>
          <button
            onClick={async () => {
              const token = localStorage.getItem('token');
              if (!token) { navigate('/login'); return; }
              try {
                const res = await toggleSaveProperty(property._id, token);
                setIsFavorite(res.data.saved);
              } catch (_) {}
            }}
            className={`mobile-contact-btn mobile-contact-btn-icon${isFavorite ? ' is-favorite' : ''}`}
            aria-label={isFavorite ? 'Remove from saved' : 'Save'}
          >
            <IconHeart filled={isFavorite} />
          </button>
        </div>
      )}
    </div>
  );
};

export default PropertyDetail;
