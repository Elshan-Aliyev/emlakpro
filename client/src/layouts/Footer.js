import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3 className="footer-title">
              <span className="footer-logo-icon">🏠</span>
              Əmlak Pro
            </h3>
            <p className="footer-description">
              Your trusted partner in finding the perfect property in Azerbaijan.
            </p>
            <div className="footer-social">
              <a href="#" className="social-link" aria-label="Facebook">📘</a>
              <a href="#" className="social-link" aria-label="Instagram">📷</a>
              <a href="#" className="social-link" aria-label="Twitter">🐦</a>
              <a href="#" className="social-link" aria-label="LinkedIn">💼</a>
            </div>
          </div>

          <div className="footer-section">
            <h4 className="footer-section-title">For Buyers</h4>
            <ul className="footer-links">
              <li><Link to="/search?listingStatus=for-sale&purpose=residential">Buy Residential</Link></li>
              <li><Link to="/search?listingStatus=for-rent&purpose=residential&subCategory=short-term">Rent Vacation</Link></li>
              <li><Link to="/search?listingStatus=for-sale&purpose=commercial">Buy Commercial</Link></li>
              <li><Link to="/search?listingStatus=for-rent&purpose=commercial">Rent Commercial</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-section-title">For Sellers</h4>
            <ul className="footer-links">
              <li><Link to="/account/listings/new">List Your Property</Link></li>
              <li><Link to="/account">Dashboard</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-section-title">Company</h4>
            <ul className="footer-links">
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/contact">Contact</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-section-title">Contact</h4>
            <ul className="footer-contact">
              <li>📧 info@emlakpro.az</li>
              <li>📞 +994 12 345 67 89</li>
              <li>📍 Baku, Azerbaijan</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            © {currentYear} Əmlak Pro. All rights reserved.
          </p>
          <p className="footer-credits">
            Built with ❤️ for Azerbaijan
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
