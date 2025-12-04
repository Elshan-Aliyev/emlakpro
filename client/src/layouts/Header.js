import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import './Header.css';

const Header = () => {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <Link to="/" className="logo">
            <img src="/assets/logo/emlakpro-logo.png" alt="Əmlak Professionalları" className="logo-image" />
            <span className="logo-text">Əmlak Professionalları</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="header-nav hide-mobile">
            <Link to="/buy" className="nav-link">Buy</Link>
            <Link to="/rent" className="nav-link">Rent</Link>
            <Link to="/sold" className="nav-link">Sold</Link>
            {isAuthenticated && (
              <Link to="/account" className="nav-link">Dashboard</Link>
            )}
            {isAdmin() && (
              <Link to="/admin" className="nav-link">Admin</Link>
            )}
          </nav>

          <div className="header-actions hide-mobile">
            {isAuthenticated ? (
              <>
                <Link to="/properties/create">
                  <Button variant="outline" size="sm">
                    + List Property
                  </Button>
                </Link>
                <div className="user-menu">
                  <button className="user-menu-trigger">
                    <span className="user-avatar">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                    <span className="user-name">{user?.name}</span>
                  </button>
                  <div className="user-menu-dropdown">
                    <Link to="/account" className="dropdown-item">My Account</Link>
                    <Link to="/account/listings" className="dropdown-item">My Listings</Link>
                    <Link to="/account/saved" className="dropdown-item">Saved Properties</Link>
                    <Link to="/account/settings" className="dropdown-item">Settings</Link>
                    <hr className="dropdown-divider" />
                    <button onClick={handleLogout} className="dropdown-item">
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">Login</Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="mobile-menu-btn hide-desktop"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="mobile-menu hide-desktop">
            <nav className="mobile-nav">
              <Link to="/buy" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                Buy
              </Link>
              <Link to="/rent" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                Rent
              </Link>
              <Link to="/sold" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                Sold
              </Link>
              {isAuthenticated && (
                <>
                  <Link to="/account" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                    Dashboard
                  </Link>
                  {isAdmin() && (
                    <Link to="/admin" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                      Admin
                    </Link>
                  )}
                </>
              )}
            </nav>
            <div className="mobile-actions">
              {isAuthenticated ? (
                <>
                  <Link to="/properties/create" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" fullWidth>+ List Property</Button>
                  </Link>
                  <Button variant="ghost" fullWidth onClick={handleLogout}>
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" fullWidth>Login</Button>
                  </Link>
                  <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button fullWidth>Sign Up</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
