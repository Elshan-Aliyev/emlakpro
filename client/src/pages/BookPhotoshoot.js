import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Star, Layers, CheckCircle, Image, FileImage } from 'lucide-react';
import { track } from '../services/analytics';
import FaqItem from '../components/FaqItem';
import './ServicePages.css';

const PACKAGES = [
  {
    id: 'basic',
    name: 'Basic',
    price: 149,
    features: ['15–20 edited photos', 'Standard colour correction', '24-hour delivery', 'High-resolution JPEGs'],
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 299,
    popular: true,
    features: ['25–30 edited photos', 'HDR processing', 'Same-day delivery', 'Drone exterior shot (if permitted)', 'Twilight photo (1)'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 499,
    features: ['40+ edited photos', 'Full HDR + advanced retouching', 'Priority same-day delivery', 'Drone footage & photos', 'Twilight photography (3)', '3D virtual tour', 'Video walkthrough (2 min)'],
  },
];

const PROCESS_STEPS = [
  { title: 'Book a slot', desc: 'Choose a date and time that suits you. We confirm within 2 hours.' },
  { title: 'On-site shoot', desc: 'Our photographer arrives, stages the space, and captures every room.' },
  { title: 'Editing', desc: 'Colour-correction, HDR processing, and sky replacement applied overnight.' },
  { title: 'Review & approve', desc: 'You receive a private gallery link and can request up to 3 retouches.' },
  { title: 'Download & publish', desc: 'High-resolution files delivered via download link, ready to upload.' },
];

const DELIVERABLES = [
  { icon: <Image size={20} strokeWidth={1.5} aria-hidden="true" />, title: 'High-res JPEGs', desc: 'Full-resolution files suitable for print and web.' },
  { icon: <FileImage size={20} strokeWidth={1.5} aria-hidden="true" />, title: 'Web-optimised set', desc: 'Compressed versions pre-sized for listing platforms.' },
  { icon: <Layers size={20} strokeWidth={1.5} aria-hidden="true" />, title: 'Drone shots', desc: 'Aerial exterior and neighbourhood shots (Standard & Premium).' },
  { icon: <Star size={20} strokeWidth={1.5} aria-hidden="true" />, title: 'Virtual tour', desc: '3D walkthrough embedded in your listing page (Premium).' },
  { icon: <Clock size={20} strokeWidth={1.5} aria-hidden="true" />, title: 'Fast turnaround', desc: '24-hour standard, same-day for Standard & Premium.' },
  { icon: <CheckCircle size={20} strokeWidth={1.5} aria-hidden="true" />, title: '3 free retouches', desc: 'Request changes within 7 days of delivery at no cost.' },
];

const FAQS = [
  { q: 'How far in advance should I book?', a: 'We recommend 2–3 days in advance, but same-week slots are often available. Contact us to check availability.' },
  { q: 'What should I do to prepare the property?', a: 'Declutter surfaces, open blinds for natural light, and remove personal items from countertops. We can advise further during booking.' },
  { q: 'Do you work in all districts of Baku?', a: 'Yes. We cover all districts and also travel to other cities for Premium bookings (travel fee may apply).' },
  { q: 'Can I request additional photos after the shoot?', a: 'Yes, additional photos can be ordered at AZN 5 each within 30 days of the shoot.' },
  { q: 'Is drone photography always included?', a: 'Drone shots are included in Standard and Premium packages where permitted. Some high-density areas have airspace restrictions — we notify you in advance.' },
];

const BookPhotoshoot = () => {
  const navigate = useNavigate();
  const [selectedPackage, setSelectedPackage] = useState(null);

  useEffect(() => {
    track('photography_page_viewed', {});
  }, []);

  const handleBook = (pkgId) => {
    track('service_inquiry_submitted', { service: 'photography', package: pkgId || selectedPackage });
    navigate('/contact', { state: { subject: 'Photography booking', package: pkgId || selectedPackage } });
  };

  return (
    <div className="service-page">
      <div className="service-hero service-hero--photography">
        <div className="service-hero-content">
          <h1>Professional Property Photography</h1>
          <p>High-quality photos that sell properties faster and for more</p>
        </div>
      </div>

      <div className="service-container">

        {/* Packages */}
        <div className="packages-grid">
          {PACKAGES.map(pkg => (
            <div
              key={pkg.id}
              className={`package-card${selectedPackage === pkg.id ? ' selected' : ''}${pkg.popular ? ' popular' : ''}`}
              onClick={() => setSelectedPackage(pkg.id)}
            >
              {pkg.popular && <div className="popular-badge">Most Popular</div>}
              <h3>{pkg.name}</h3>
              <div className="package-price">
                <span className="currency">AZN</span>
                <span className="amount">{pkg.price}</span>
              </div>
              <ul className="package-features">
                {pkg.features.map((f, i) => <li key={i}><CheckCircle size={14} strokeWidth={2} aria-hidden="true" /> {f}</li>)}
              </ul>
              <button
                className="btn-select-package"
                onClick={(e) => { e.stopPropagation(); handleBook(pkg.id); }}
              >
                Book {pkg.name}
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
            <h3>Ready to book a shoot?</h3>
            <p>We'll confirm your slot within 2 hours and send a preparation checklist.</p>
          </div>
          <button className="sp-cta-btn" onClick={() => handleBook(null)}>
            Book a Photoshoot
          </button>
        </div>

      </div>
    </div>
  );
};

export default BookPhotoshoot;
