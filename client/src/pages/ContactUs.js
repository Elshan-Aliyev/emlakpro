import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../layouts/Footer';
import './StaticPages.css';

const ContactUs = () => {
  return (
    <div className="static-page-container">
      <Navbar />
      <div className="static-page-content">
        <h1>Contact Us</h1>
        <p className="subtitle">Get in touch with our team</p>

        <section>
          <h2>Customer Support</h2>
          <p>
            Need help with your account or have questions about our services?
            Our support team is here to assist you.
          </p>
          <div style={{ marginTop: '1rem' }}>
            <p><strong>Email:</strong> support@realestateapp.com</p>
            <p><strong>Phone:</strong> +994 12 345 67 89</p>
            <p><strong>Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM (GMT+4)</p>
          </div>
        </section>

        <section>
          <h2>Business Inquiries</h2>
          <p>
            Interested in partnering with us or have business-related questions?
          </p>
          <div style={{ marginTop: '1rem' }}>
            <p><strong>Email:</strong> business@realestateapp.com</p>
            <p><strong>Phone:</strong> +994 12 345 67 90</p>
          </div>
        </section>

        <section>
          <h2>Office Address</h2>
          <p>
            Visit our office in Baku, Azerbaijan:
          </p>
          <div style={{ marginTop: '1rem' }}>
            <p><strong>Address:</strong> 123 Nizami Street, Baku, Azerbaijan</p>
            <p><strong>Postal Code:</strong> AZ1000</p>
          </div>
        </section>

        <section>
          <h2>Follow Us</h2>
          <p>
            Stay connected and get the latest updates:
          </p>
          <div style={{ marginTop: '1rem' }}>
            <p><strong>Facebook:</strong> @RealEstateApp</p>
            <p><strong>Instagram:</strong> @realestateapp_az</p>
            <p><strong>LinkedIn:</strong> Real Estate App Azerbaijan</p>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default ContactUs;