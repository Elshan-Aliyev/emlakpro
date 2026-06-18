import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const SocialFacebook = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

const SocialInstagram = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

const SocialX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const SocialLinkedIn = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-inner">

        <div className="footer-top">
          <div className="footer-brand">
            <Link to="/" className="footer-wordmark" aria-label="Əmlak Pro home">
              Əmlak Pro
            </Link>
            <p className="footer-tagline">
              The premium property marketplace for Azerbaijan.
            </p>
          </div>

          <nav className="footer-nav" aria-label="Footer navigation">
            <div className="footer-col">
              <h4 className="footer-col-title">Platform</h4>
              <ul>
                <li><Link to="/search?listingStatus=for-sale">Buy</Link></li>
                <li><Link to="/search?listingStatus=for-rent">Rent</Link></li>
                <li><Link to="/search?listingStatus=new-project">New Projects</Link></li>
                <li><Link to="/search?purpose=commercial">Commercial</Link></li>
                <li><Link to="/properties/create">List Property</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4 className="footer-col-title">Company</h4>
              <ul>
                <li><Link to="/about">About</Link></li>
                <li><Link to="/agents">Agents</Link></li>
                <li><Link to="/trust">Marketplace Trust</Link></li>
                <li><Link to="/advertise">Advertise</Link></li>
                <li><Link to="/contact">Contact</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4 className="footer-col-title">Legal</h4>
              <ul>
                <li><Link to="/privacy">Privacy Policy</Link></li>
                <li><Link to="/terms">Terms of Service</Link></li>
                <li><Link to="/cookies">Cookie Policy</Link></li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="footer-bottom">
          <p className="footer-copy">
            © {currentYear} Əmlak Pro. All rights reserved.
          </p>
          <div className="footer-socials">
            <a href="https://facebook.com" className="footer-social-btn" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
              <SocialFacebook />
            </a>
            <a href="https://instagram.com" className="footer-social-btn" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
              <SocialInstagram />
            </a>
            <a href="https://x.com" className="footer-social-btn" aria-label="X (Twitter)" target="_blank" rel="noopener noreferrer">
              <SocialX />
            </a>
            <a href="https://linkedin.com" className="footer-social-btn" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
              <SocialLinkedIn />
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
