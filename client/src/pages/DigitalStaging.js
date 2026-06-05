import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Sofa, Eye, Download, Clock, RefreshCcw, ChevronDown, CheckCircle } from 'lucide-react';
import { track } from '../services/analytics';
import './ServicePages.css';

const PRICING_TIERS = [
  {
    id: 'single',
    name: 'Single Room',
    price: 50,
    unit: 'per room',
    features: ['1 room virtually staged', '3 style options to choose from', '48-hour delivery', 'High-resolution output', '2 revisions included'],
  },
  {
    id: 'bundle',
    name: 'Room Bundle',
    price: 180,
    unit: '4 rooms',
    popular: true,
    features: ['4 rooms virtually staged', 'Consistent style across all rooms', '48-hour delivery', 'High-resolution output', 'Unlimited revisions (7 days)', 'Before/After comparison images'],
  },
  {
    id: 'full',
    name: 'Full Property',
    price: 350,
    unit: 'up to 10 rooms',
    features: ['All rooms (up to 10) staged', 'Multiple style themes', '24-hour priority delivery', 'High-resolution + web-optimised output', 'Unlimited revisions (14 days)', 'Before/After images', 'Print-ready files'],
  },
];

const PROCESS_STEPS = [
  { title: 'Send floor photos', desc: 'Submit photos of the empty rooms via the booking form. Any smartphone quality works.' },
  { title: 'Choose your style', desc: 'Select a style: Modern, Scandinavian, Classic, or Minimalist. We match furniture to your target buyer.' },
  { title: 'Staging in 48 hours', desc: 'Our design team digitally places furniture, lighting, and decor into each photo.' },
  { title: 'Review the results', desc: 'Receive your staged images and request revisions. No back-and-forth limit on bundle orders.' },
  { title: 'Download & publish', desc: 'High-resolution files ready to upload directly to your listing.' },
];

const DELIVERABLES = [
  { icon: <Sofa size={20} strokeWidth={1.5} aria-hidden="true" />, title: 'Staged photos', desc: 'Realistic furniture and décor placed in each room.' },
  { icon: <Eye size={20} strokeWidth={1.5} aria-hidden="true" />, title: 'Style options', desc: 'Modern, Scandinavian, Classic, or Minimalist themes.' },
  { icon: <Download size={20} strokeWidth={1.5} aria-hidden="true" />, title: 'High-res + web files', desc: 'Full-resolution and compressed sets for every use.' },
  { icon: <RefreshCcw size={20} strokeWidth={1.5} aria-hidden="true" />, title: 'Revision rounds', desc: '2 revisions (Single), unlimited for Bundle and Full.' },
  { icon: <Clock size={20} strokeWidth={1.5} aria-hidden="true" />, title: '48-hour turnaround', desc: '24-hour priority turnaround available on Full Property.' },
  { icon: <Layers size={20} strokeWidth={1.5} aria-hidden="true" />, title: 'Before/After images', desc: 'Side-by-side comparison images included in Bundle and Full.' },
];

const FAQS = [
  { q: 'Do you need high-quality photos to stage?', a: 'No. Standard smartphone photos work fine as long as the room is well-lit. We clean up minor lens distortion during editing.' },
  { q: 'How realistic does the staging look?', a: 'Very. We use photorealistic 3D assets and match natural lighting in each photo. Buyers regularly comment they thought the staging was real.' },
  { q: 'Can I request a specific furniture style?', a: 'Yes. Beyond the four preset themes you can describe your preference in the order notes and we will match it as closely as possible.' },
  { q: 'Is this allowed on real estate listings?', a: 'Yes, provided the staged images are disclosed as virtually staged. We include a standard disclosure note you can add to your listing.' },
  { q: 'What if I need more than 10 rooms?', a: 'Contact us for a custom quote. Large developments and commercial properties are handled on a per-project basis.' },
];

const FaqItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="sp-faq-item">
      <button className="sp-faq-q" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        {q}
        <ChevronDown size={16} className={`sp-faq-chevron${open ? ' sp-faq-chevron--open' : ''}`} aria-hidden="true" />
      </button>
      {open && <div className="sp-faq-a">{a}</div>}
    </div>
  );
};

const DigitalStaging = () => {
  const navigate = useNavigate();
  const [selectedTier, setSelectedTier] = useState(null);

  useEffect(() => {
    track('virtual_staging_page_viewed', {});
  }, []);

  const handleOrder = (tierId) => {
    track('service_inquiry_submitted', { service: 'virtual_staging', tier: tierId || selectedTier });
    navigate('/contact', { state: { subject: 'Virtual staging order', tier: tierId || selectedTier } });
  };

  return (
    <div className="service-page">
      <div className="service-hero service-hero--staging">
        <div className="service-hero-content">
          <h1>Virtual Staging</h1>
          <p>Transform empty rooms into furnished spaces buyers can picture themselves in</p>
        </div>
      </div>

      <div className="service-container">

        {/* Pricing */}
        <div className="packages-grid">
          {PRICING_TIERS.map(tier => (
            <div
              key={tier.id}
              className={`package-card${selectedTier === tier.id ? ' selected' : ''}${tier.popular ? ' popular' : ''}`}
              onClick={() => setSelectedTier(tier.id)}
            >
              {tier.popular && <div className="popular-badge">Most Popular</div>}
              <h3>{tier.name}</h3>
              <div className="package-price">
                <span className="currency">AZN</span>
                <span className="amount">{tier.price}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginLeft: 4 }}>{tier.unit}</span>
              </div>
              <ul className="package-features">
                {tier.features.map((f, i) => <li key={i}><CheckCircle size={14} strokeWidth={2} aria-hidden="true" /> {f}</li>)}
              </ul>
              <button
                className="btn-select-package"
                onClick={(e) => { e.stopPropagation(); handleOrder(tier.id); }}
              >
                Order {tier.name}
              </button>
            </div>
          ))}
        </div>

        {/* Process */}
        <div className="sp-section">
          <h2 className="sp-section-title">How it works</h2>
          <div className="sp-steps">
            {PROCESS_STEPS.map((s, i) => (
              <div key={i} className="sp-step">
                <div className="sp-step-num">{i + 1}</div>
                <div className="sp-step-body">
                  <h4>{s.title}</h4>
                  <p>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deliverables */}
        <div className="sp-section">
          <h2 className="sp-section-title">What you receive</h2>
          <div className="sp-deliverables-grid">
            {DELIVERABLES.map((d, i) => (
              <div key={i} className="sp-deliverable">
                <span className="sp-deliverable-icon">{d.icon}</span>
                <h4>{d.title}</h4>
                <p>{d.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="sp-section">
          <h2 className="sp-section-title">Frequently asked questions</h2>
          <div className="sp-faq">
            {FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
          </div>
        </div>

        {/* CTA */}
        <div className="sp-cta">
          <div className="sp-cta-text">
            <h3>Ready to stage your listing?</h3>
            <p>Send us your photos and we will stage the first room as a free sample.</p>
          </div>
          <button className="sp-cta-btn" onClick={() => handleOrder(null)}>
            Start Staging
          </button>
        </div>

      </div>
    </div>
  );
};

export default DigitalStaging;
