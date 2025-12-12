import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../layouts/Footer';
import Button from '../components/Button';
import './StaticPages.css';

const Services = () => {
  return (
    <div className="static-page-container">
      <Navbar />
      <div className="static-page-content">
        <h1>Our Services</h1>
        <p className="subtitle">Professional real estate services to help you succeed</p>

        <section>
          <h2>Property Listing Services</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            <div style={{ padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <h3>📸 Professional Photography</h3>
              <p>High-quality photos that showcase your property in the best light.</p>
              <p style={{ fontWeight: '600', color: '#059669', marginTop: '0.5rem' }}>₼150 - ₼300</p>
              <Link to="/services/photography">
                <Button variant="outline" size="sm" style={{ marginTop: '1rem' }}>Learn More</Button>
              </Link>
            </div>
            <div style={{ padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <h3>🎨 Virtual Staging</h3>
              <p>Enhance your property with professional virtual furniture staging.</p>
              <p style={{ fontWeight: '600', color: '#059669', marginTop: '0.5rem' }}>₼100 - ₼200</p>
              <Link to="/services/staging">
                <Button variant="outline" size="sm" style={{ marginTop: '1rem' }}>Learn More</Button>
              </Link>
            </div>
            <div style={{ padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <h3>📋 Property Valuation</h3>
              <p>Get an accurate market valuation for your property.</p>
              <p style={{ fontWeight: '600', color: '#059669', marginTop: '0.5rem' }}>₼50 - ₼150</p>
              <Link to="/services/valuation">
                <Button variant="outline" size="sm" style={{ marginTop: '1rem' }}>Learn More</Button>
              </Link>
            </div>
          </div>
        </section>

        <section>
          <h2>Advertising & Promotion</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            <div style={{ padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <h3>🚀 Property Boost</h3>
              <p>Increase visibility with featured placement and priority search results.</p>
              <ul style={{ margin: '1rem 0', paddingLeft: '1.5rem' }}>
                <li>Featured listing for 7 days</li>
                <li>Priority in search results</li>
                <li>Highlight badge</li>
                <li>Analytics dashboard</li>
              </ul>
              <p style={{ fontWeight: '600', fontSize: '1.25rem', marginTop: '0.5rem' }}>₼25</p>
              <Button variant="secondary" size="sm" style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}>Boost Now</Button>
            </div>
            <div style={{ padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <h3>📢 Social Media Promotion</h3>
              <p>Promote your property across social media platforms.</p>
              <p style={{ fontWeight: '600', color: '#059669', marginTop: '0.5rem' }}>₼75 - ₼150</p>
              <Link to="/services/social">
                <Button variant="outline" size="sm" style={{ marginTop: '1rem' }}>Learn More</Button>
              </Link>
            </div>
            <div style={{ padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <h3>🎯 Targeted Advertising</h3>
              <p>Reach specific audiences interested in your property type.</p>
              <p style={{ fontWeight: '600', color: '#059669', marginTop: '0.5rem' }}>₼100 - ₼300</p>
              <Link to="/services/advertising">
                <Button variant="outline" size="sm" style={{ marginTop: '1rem' }}>Learn More</Button>
              </Link>
            </div>
          </div>
        </section>

        <section>
          <h2>Legal & Documentation</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            <div style={{ padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <h3>📄 Contract Preparation</h3>
              <p>Professional contract drafting for property transactions.</p>
              <p style={{ fontWeight: '600', color: '#059669', marginTop: '0.5rem' }}>₼200 - ₼500</p>
              <Link to="/services/contracts">
                <Button variant="outline" size="sm" style={{ marginTop: '1rem' }}>Learn More</Button>
              </Link>
            </div>
            <div style={{ padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <h3>🏠 Property Inspection</h3>
              <p>Comprehensive property inspection and condition report.</p>
              <p style={{ fontWeight: '600', color: '#059669', marginTop: '0.5rem' }}>₼150 - ₼300</p>
              <Link to="/services/inspection">
                <Button variant="outline" size="sm" style={{ marginTop: '1rem' }}>Learn More</Button>
              </Link>
            </div>
            <div style={{ padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <h3>⚖️ Legal Consultation</h3>
              <p>Expert legal advice for property transactions.</p>
              <p style={{ fontWeight: '600', color: '#059669', marginTop: '0.5rem' }}>₼100/hour</p>
              <Link to="/services/legal">
                <Button variant="outline" size="sm" style={{ marginTop: '1rem' }}>Learn More</Button>
              </Link>
            </div>
          </div>
        </section>

        <section>
          <h2>Why Choose Our Services?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            <div>
              <h3>✅ Verified Professionals</h3>
              <p>All our service providers are licensed and verified.</p>
            </div>
            <div>
              <h3>💰 Competitive Pricing</h3>
              <p>Transparent pricing with no hidden fees.</p>
            </div>
            <div>
              <h3>⚡ Fast Turnaround</h3>
              <p>Quick service delivery to meet your timeline.</p>
            </div>
            <div>
              <h3>🛡️ Quality Guarantee</h3>
              <p>Satisfaction guaranteed or your money back.</p>
            </div>
          </div>
        </section>

        <section style={{ textAlign: 'center', marginTop: '3rem' }}>
          <h2>Ready to Get Started?</h2>
          <p>Contact our team to discuss your specific needs and get a personalized quote.</p>
          <div style={{ marginTop: '2rem' }}>
            <Link to="/contact">
              <Button size="lg">Contact Us Today</Button>
            </Link>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default Services;