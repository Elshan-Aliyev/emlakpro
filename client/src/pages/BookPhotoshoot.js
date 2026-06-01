import React, { useState } from 'react';
import { Camera, Clock, Star, Layers } from 'lucide-react';
import './ServicePages.css';

const INFO_ITEMS = [
  { icon: <Camera size={24} strokeWidth={1.75} aria-hidden="true" />, title: 'Professional Equipment', desc: 'High-end cameras and lighting for the best results' },
  { icon: <Clock  size={24} strokeWidth={1.75} aria-hidden="true" />, title: 'Fast Turnaround',        desc: 'Edited photos delivered within 24 hours'           },
  { icon: <Star   size={24} strokeWidth={1.75} aria-hidden="true" />, title: 'Expert Editing',         desc: 'Color correction, HDR, and enhancement'             },
  { icon: <Layers size={24} strokeWidth={1.75} aria-hidden="true" />, title: 'Drone Available',        desc: 'Aerial shots to showcase property location'         },
];

const PACKAGES = [
  {
    id: 'basic',
    name: 'Basic Package',
    price: 149,
    features: ['15-20 photos', 'Basic editing', '24-hour delivery', 'High-resolution images'],
  },
  {
    id: 'standard',
    name: 'Standard Package',
    price: 299,
    popular: true,
    features: ['25-30 photos', 'Professional editing', 'Same-day delivery', 'Drone shots (if applicable)', 'Twilight photos (1-2)'],
  },
  {
    id: 'premium',
    name: 'Premium Package',
    price: 499,
    features: ['40+ photos', 'Advanced editing', 'Immediate delivery', 'Drone footage + photos', 'Twilight photography', '3D virtual tour', 'Video walkthrough'],
  },
];

const BookPhotoshoot = () => {
  const [selectedPackage, setSelectedPackage] = useState(null);

  return (
    <div className="service-page">
      <div className="service-hero">
        <div className="service-hero-content">
          <h1>Professional Property Photography</h1>
          <p>High-quality photos that sell properties faster</p>
        </div>
      </div>

      <div className="service-container">
        <div className="packages-grid">
          {PACKAGES.map(pkg => (
            <div
              key={pkg.id}
              className={`package-card ${selectedPackage === pkg.id ? 'selected' : ''} ${pkg.popular ? 'popular' : ''}`}
              onClick={() => setSelectedPackage(pkg.id)}
            >
              {pkg.popular && <div className="popular-badge">Most Popular</div>}
              <h3>{pkg.name}</h3>
              <div className="package-price">
                <span className="currency">AZN</span>
                <span className="amount">{pkg.price}</span>
              </div>
              <ul className="package-features">
                {pkg.features.map((feature, idx) => (
                  <li key={idx}>✓ {feature}</li>
                ))}
              </ul>
              <button className="btn-select-package">
                Select Package
              </button>
            </div>
          ))}
        </div>

        <div className="service-info">
          <h2>What's Included</h2>
          <div className="info-grid">
            {INFO_ITEMS.map((item, i) => (
              <div key={i} className="info-item">
                <span className="info-icon">{item.icon}</span>
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookPhotoshoot;
