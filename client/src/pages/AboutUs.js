import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../layouts/Footer';
import './StaticPages.css';

const AboutUs = () => {
  return (
    <div className="static-page-container">
      <Navbar />
      <div className="static-page-content">
        <h1>About Us</h1>
        <p className="subtitle">Learn more about Real Estate App and our mission</p>

        <section>
          <h2>Our Story</h2>
          <p>
            Real Estate App was founded in 2024 with a simple mission: to make buying, selling,
            and renting properties in Azerbaijan as easy and transparent as possible. We believe
            that everyone deserves access to quality housing and commercial spaces without the
            traditional hassles of real estate transactions.
          </p>
        </section>

        <section>
          <h2>Our Mission</h2>
          <p>
            To revolutionize the real estate industry in Azerbaijan by providing a modern,
            user-friendly platform that connects property owners, buyers, renters, and real estate
            professionals in a transparent and efficient marketplace.
          </p>
        </section>

        <section>
          <h2>What We Offer</h2>
          <ul style={{ paddingLeft: '1.5rem' }}>
            <li><strong>For Buyers:</strong> Comprehensive property search with advanced filters</li>
            <li><strong>For Sellers:</strong> Free property listing with professional photography services</li>
            <li><strong>For Renters:</strong> Short-term and long-term rental options</li>
            <li><strong>For Realtors:</strong> Professional dashboard and client management tools</li>
            <li><strong>For Investors:</strong> Commercial property marketplace</li>
          </ul>
        </section>

        <section>
          <h2>Our Values</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
            <div>
              <h3>Transparency</h3>
              <p>Clear pricing, honest communication, and no hidden fees.</p>
            </div>
            <div>
              <h3>Innovation</h3>
              <p>Leveraging technology to improve the real estate experience.</p>
            </div>
            <div>
              <h3>Trust</h3>
              <p>Building lasting relationships through verified listings and users.</p>
            </div>
            <div>
              <h3>Accessibility</h3>
              <p>Making real estate accessible to everyone in Azerbaijan.</p>
            </div>
          </div>
        </section>

        <section>
          <h2>Our Team</h2>
          <p>
            Our diverse team brings together real estate expertise, technology innovation,
            and local market knowledge to deliver the best possible experience for our users.
          </p>
        </section>

        <section>
          <h2>Contact Information</h2>
          <p>
            Have questions about our platform or services? We'd love to hear from you.
          </p>
          <div style={{ marginTop: '1rem' }}>
            <p><strong>Email:</strong> info@realestateapp.com</p>
            <p><strong>Phone:</strong> +994 12 345 67 89</p>
            <p><strong>Address:</strong> 123 Nizami Street, Baku, Azerbaijan</p>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default AboutUs;