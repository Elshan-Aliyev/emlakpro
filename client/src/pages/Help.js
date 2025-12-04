import React from 'react';
import { Link } from 'react-router-dom';
import './StaticPages.css';

const Help = () => {
  return (
    <div className="static-page-container">
      <div className="static-page-content">
        <h1>Help & Support</h1>
        <p className="subtitle">Find answers to common questions and get assistance</p>
        
        <section>
          <h2>Frequently Asked Questions</h2>
          
          <div className="faq-item">
            <h3>How do I create a listing?</h3>
            <p>Navigate to your <Link to="/account">Dashboard</Link> and click on "Create Listing". Fill in the property details, upload photos, and submit for review.</p>
          </div>

          <div className="faq-item">
            <h3>How do I edit my property listing?</h3>
            <p>Go to <Link to="/account/listings">My Listings</Link>, find your property, and click the edit button to make changes.</p>
          </div>

          <div className="faq-item">
            <h3>How do I contact property owners?</h3>
            <p>On any property detail page, you'll find contact information or a contact form to reach out to the owner or agent.</p>
          </div>

          <div className="faq-item">
            <h3>How do I save properties to my favorites?</h3>
            <p>Click the heart icon on any property card to save it. View all saved properties in <Link to="/account/saved">Saved Properties</Link>.</p>
          </div>

          <div className="faq-item">
            <h3>How do I change my account settings?</h3>
            <p>Visit <Link to="/account/settings">Settings</Link> to update your profile information, password, and notification preferences.</p>
          </div>

          <div className="faq-item">
            <h3>What payment methods are accepted?</h3>
            <p>Payment arrangements are made directly between buyers/renters and property owners. Əmlak Professionalları is a listing platform.</p>
          </div>
        </section>

        <section>
          <h2>Getting Started</h2>
          <ul>
            <li><strong>Buyers/Renters:</strong> <Link to="/signup">Create an account</Link> to save favorite properties and contact owners</li>
            <li><strong>Property Owners:</strong> Sign up and create listings to showcase your properties</li>
            <li><strong>Agents:</strong> <Link to="/agents">Register as an agent</Link> to manage multiple properties</li>
          </ul>
        </section>

        <section>
          <h2>Need More Help?</h2>
          <p>If you can't find the answer you're looking for, please:</p>
          <ul>
            <li>Email us at: support@emlakpro.az</li>
            <li>Call us at: +994 12 XXX XX XX</li>
            <li>Visit our office: Baku, Azerbaijan</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default Help;
