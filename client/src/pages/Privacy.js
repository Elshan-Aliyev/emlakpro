import React from 'react';
import './StaticPages.css';

const Privacy = () => {
  return (
    <div className="static-page-container">
      <div className="static-page-content">
        <h1>Privacy Statement</h1>
        <p className="last-updated">Last updated: November 28, 2025</p>
        
        <section>
          <h2>1. Information We Collect</h2>
          <p>We collect information you provide directly to us, including name, email address, phone number, and property preferences when you create an account or use our services.</p>
        </section>

        <section>
          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve our services</li>
            <li>Process transactions and send related information</li>
            <li>Send you technical notices and support messages</li>
            <li>Respond to your comments and questions</li>
            <li>Communicate with you about properties, services, and events</li>
          </ul>
        </section>

        <section>
          <h2>3. Information Sharing</h2>
          <p>We do not share your personal information with third parties except as described in this policy or with your consent.</p>
        </section>

        <section>
          <h2>4. Data Security</h2>
          <p>We take reasonable measures to help protect your personal information from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction.</p>
        </section>

        <section>
          <h2>5. Your Rights</h2>
          <p>You have the right to access, update, or delete your personal information at any time through your account settings.</p>
        </section>

        <section>
          <h2>6. Contact Us</h2>
          <p>If you have any questions about this Privacy Statement, please contact us through our support channels.</p>
        </section>
      </div>
    </div>
  );
};

export default Privacy;
