import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import './Navbar.css';

const Navbar = () => {
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showBuyResidentialMenu, setShowBuyResidentialMenu] = useState(false);
  const [showRentVacationMenu, setShowRentVacationMenu] = useState(false);
  const [showBuyCommercialMenu, setShowBuyCommercialMenu] = useState(false);
  const [showRentCommercialMenu, setShowRentCommercialMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { switchTheme, isBuyMode } = useTheme();

  const token = localStorage.getItem('token');
  let role = null;
  let userName = null;
  
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      role = payload.role;
      userName = payload.name;
    } catch (e) {
      // ignore
    }
  }

  // Handle scroll for navbar collapse
  useEffect(() => {
    const handleScroll = () => {
      // Always collapsed on search page, otherwise collapse on scroll
      const isSearchPage = location.pathname === '/search';
      const isScrolled = isSearchPage || window.scrollY > 50;
      setScrolled(isScrolled);
      
      // Add/remove class to body for FilterBar positioning
      if (isScrolled) {
        document.body.classList.add('scrolled');
      } else {
        document.body.classList.remove('scrolled');
      }
    };
    
    handleScroll(); // Call immediately for search page
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.body.classList.remove('scrolled');
    };
  }, [location.pathname]);

  const handleSignOut = () => {
    localStorage.removeItem('token');
    navigate('/');
    window.location.reload();
  };

  const handleLogoClick = (e) => {
    e.preventDefault();
    if (location.pathname === '/') {
      // Already on homepage, just scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Navigate to homepage and scroll to top
      navigate('/');
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    }
  };

  const handleMenuItemClick = (path) => {
    // Close all dropdowns
    setShowBuyResidentialMenu(false);
    setShowRentVacationMenu(false);
    setShowBuyCommercialMenu(false);
    setShowRentCommercialMenu(false);
    setShowAccountMenu(false);
    navigate(path);
  };

  const handleBuyModeClick = () => {
    switchTheme('buy');
    setShowBuyResidentialMenu(false);
    setShowRentVacationMenu(false);
    setShowBuyCommercialMenu(false);
    setShowRentCommercialMenu(false);
    // Navigate to buy search only if not on home page
    if (location.pathname !== '/' && location.pathname !== '/home') {
      navigate('/search?listingStatus=for-sale');
    }
  };

  const handleRentModeClick = () => {
    switchTheme('rent');
    setShowBuyResidentialMenu(false);
    setShowRentVacationMenu(false);
    setShowBuyCommercialMenu(false);
    setShowRentCommercialMenu(false);
    // Navigate to rent search only if not on home page
    if (location.pathname !== '/' && location.pathname !== '/home') {
      navigate('/search?listingStatus=for-rent');
    }
  };

  return (
    <nav className={`modern-navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Left Side - Logo & Menu */}
        <div className="navbar-left">
          <Link to="/" className="navbar-logo" onClick={handleLogoClick}>
            <div className="logo-wrapper">
              <img src="/assets/logo/emlakpro-logo.png" alt="Əmlak Professionalları" className="logo-image" />
              {!scrolled && <span className="logo-text">Əmlak Professionalları</span>}
            </div>
          </Link>
          
          <div className="navbar-menu">
            {/* Buy/Rent Mode Switch */}
            <div className="theme-switch">
              <button 
                className={`theme-toggle ${isBuyMode ? 'active' : ''}`}
                onClick={handleBuyModeClick}
              >
                Buy
              </button>
              <button 
                className={`theme-toggle ${!isBuyMode ? 'active' : ''}`}
                onClick={handleRentModeClick}
              >
                Rent
              </button>
            </div>

            {/* Buy Residential Dropdown */}
            <div 
              className="nav-dropdown"
              onMouseEnter={() => setShowBuyResidentialMenu(true)}
              onMouseLeave={() => setShowBuyResidentialMenu(false)}
            >
              <button className="nav-link nav-dropdown-btn">
                Buy Residential <span className="dropdown-arrow">▾</span>
              </button>
              {showBuyResidentialMenu && (
                <div className="nav-dropdown-menu">
                  <button onClick={() => handleMenuItemClick('/search?listingStatus=for-sale&purpose=residential&propertyType=apartment')} className="nav-dropdown-item">
                    Apartments for Sale
                  </button>
                  <button onClick={() => handleMenuItemClick('/search?listingStatus=for-sale&purpose=residential&propertyType=house')} className="nav-dropdown-item">
                    Houses for Sale
                  </button>
                  <button onClick={() => handleMenuItemClick('/search?listingStatus=for-sale&purpose=residential&propertyType=villa')} className="nav-dropdown-item">
                    Villas for Sale
                  </button>
                  <button onClick={() => handleMenuItemClick('/search?listingStatus=for-sale&purpose=residential&propertyType=penthouse')} className="nav-dropdown-item">
                    Penthouses for Sale
                  </button>
                  <button onClick={() => handleMenuItemClick('/search?listingStatus=for-sale&purpose=residential&bedrooms=3')} className="nav-dropdown-item">
                    3+ Bedrooms
                  </button>
                  <div className="nav-dropdown-divider"></div>
                  <button onClick={() => handleMenuItemClick('/search?listingStatus=for-sale&purpose=residential')} className="nav-dropdown-item nav-dropdown-all">
                    View All Residential Sales
                  </button>
                </div>
              )}
            </div>

            {/* Rent Vacation Dropdown */}
            <div 
              className="nav-dropdown"
              onMouseEnter={() => setShowRentVacationMenu(true)}
              onMouseLeave={() => setShowRentVacationMenu(false)}
            >
              <button className="nav-link nav-dropdown-btn">
                Rent Vacation <span className="dropdown-arrow">▾</span>
              </button>
              {showRentVacationMenu && (
                <div className="nav-dropdown-menu">
                  <button onClick={() => handleMenuItemClick('/search?listingStatus=for-rent&purpose=residential&subCategory=short-term&propertyType=apartment')} className="nav-dropdown-item">
                    Vacation Apartments
                  </button>
                  <button onClick={() => handleMenuItemClick('/search?listingStatus=for-rent&purpose=residential&subCategory=short-term&propertyType=villa')} className="nav-dropdown-item">
                    Vacation Villas
                  </button>
                  <button onClick={() => handleMenuItemClick('/search?listingStatus=for-rent&purpose=residential&subCategory=short-term&propertyType=cabin')} className="nav-dropdown-item">
                    Cabins & Cottages
                  </button>
                  <button onClick={() => handleMenuItemClick('/search?listingStatus=for-rent&purpose=residential&subCategory=short-term&bedrooms=2')} className="nav-dropdown-item">
                    2+ Bedrooms
                  </button>
                  <button onClick={() => handleMenuItemClick('/search?listingStatus=for-rent&purpose=residential&subCategory=short-term&paymentFrequency=daily')} className="nav-dropdown-item">
                    Daily Rentals
                  </button>
                  <div className="nav-dropdown-divider"></div>
                  <button onClick={() => handleMenuItemClick('/search?listingStatus=for-rent&purpose=residential&subCategory=short-term')} className="nav-dropdown-item nav-dropdown-all">
                    View All Vacation Rentals
                  </button>
                </div>
              )}
            </div>

            {/* Buy Commercial Dropdown */}
            <div 
              className="nav-dropdown"
              onMouseEnter={() => setShowBuyCommercialMenu(true)}
              onMouseLeave={() => setShowBuyCommercialMenu(false)}
            >
              <button className="nav-link nav-dropdown-btn">
                Buy Commercial <span className="dropdown-arrow">▾</span>
              </button>
              {showBuyCommercialMenu && (
                <div className="nav-dropdown-menu">
                  <button onClick={() => handleMenuItemClick('/search?listingStatus=for-sale&purpose=commercial&propertyType=office')} className="nav-dropdown-item">
                    Office Spaces for Sale
                  </button>
                  <button onClick={() => handleMenuItemClick('/search?listingStatus=for-sale&purpose=commercial&propertyType=retail')} className="nav-dropdown-item">
                    Retail Spaces for Sale
                  </button>
                  <button onClick={() => handleMenuItemClick('/search?listingStatus=for-sale&purpose=commercial&propertyType=warehouse')} className="nav-dropdown-item">
                    Warehouses for Sale
                  </button>
                  <button onClick={() => handleMenuItemClick('/search?listingStatus=for-sale&purpose=commercial&propertyType=industrial')} className="nav-dropdown-item">
                    Industrial Properties
                  </button>
                  <div className="nav-dropdown-divider"></div>
                  <button onClick={() => handleMenuItemClick('/search?listingStatus=for-sale&purpose=commercial')} className="nav-dropdown-item nav-dropdown-all">
                    View All Commercial Sales
                  </button>
                </div>
              )}
            </div>

            {/* Rent Commercial Dropdown */}
            <div 
              className="nav-dropdown"
              onMouseEnter={() => setShowRentCommercialMenu(true)}
              onMouseLeave={() => setShowRentCommercialMenu(false)}
            >
              <button className="nav-link nav-dropdown-btn">
                Rent Commercial <span className="dropdown-arrow">▾</span>
              </button>
              {showRentCommercialMenu && (
                <div className="nav-dropdown-menu">
                  <button onClick={() => handleMenuItemClick('/search?listingStatus=for-rent&purpose=commercial&propertyType=office')} className="nav-dropdown-item">
                    Office Spaces for Rent
                  </button>
                  <button onClick={() => handleMenuItemClick('/search?listingStatus=for-rent&purpose=commercial&propertyType=retail')} className="nav-dropdown-item">
                    Retail Spaces for Rent
                  </button>
                  <button onClick={() => handleMenuItemClick('/search?listingStatus=for-rent&purpose=commercial&propertyType=warehouse')} className="nav-dropdown-item">
                    Warehouses for Rent
                  </button>
                  <button onClick={() => handleMenuItemClick('/search?listingStatus=for-rent&purpose=commercial&propertyType=restaurant')} className="nav-dropdown-item">
                    Restaurant Spaces
                  </button>
                  <div className="nav-dropdown-divider"></div>
                  <button onClick={() => handleMenuItemClick('/search?listingStatus=for-rent&purpose=commercial')} className="nav-dropdown-item nav-dropdown-all">
                    View All Commercial Rentals
                  </button>
                </div>
              )}
            </div>

            {/* New Project */}
            <Link to="/search?listingStatus=new-project" className="nav-link">New Projects</Link>
            
            {/* Agents */}
            <Link to="/agents" className="nav-link">Agents</Link>
          </div>
        </div>

        {/* Right Side - Actions */}
        <div className="navbar-right">
          {token ? (
            <>
              <Link to="/favorites" className="nav-icon-btn" title="Saved">
                ❤️
              </Link>
              
              <div className="account-dropdown">
                <button 
                  className="nav-icon-btn account-btn"
                  onClick={() => setShowAccountMenu(!showAccountMenu)}
                  title="My Account"
                >
                  👤
                </button>
                
                {showAccountMenu && (
                  <div className="dropdown-menu">
                    <div className="dropdown-header">
                      <span className="user-name">{userName || 'User'}</span>
                      <span className="user-role">{role}</span>
                    </div>
                    <Link to="/account" className="dropdown-item" onClick={() => setShowAccountMenu(false)}>
                      <span>📊</span> Dashboard
                    </Link>
                    {(role === 'admin' || role === 'superadmin') && (
                      <Link to="/admin" className="dropdown-item admin-link" onClick={() => setShowAccountMenu(false)}>
                        <span>👑</span> Admin Panel
                      </Link>
                    )}
                    <div className="dropdown-divider"></div>
                    <Link to="/account/profile" className="dropdown-item" onClick={() => setShowAccountMenu(false)}>
                      <span>👤</span> My Account
                    </Link>
                    <Link to="/account/listings" className="dropdown-item" onClick={() => setShowAccountMenu(false)}>
                      <span>🏠</span> My Properties
                    </Link>
                    <Link to="/account/saved" className="dropdown-item" onClick={() => setShowAccountMenu(false)}>
                      <span>❤️</span> Saved Properties
                    </Link>
                    <Link to="/messages" className="dropdown-item" onClick={() => setShowAccountMenu(false)}>
                      <span>💬</span> Messages
                    </Link>
                    {(role === 'realtor' || role === 'corporate' || role === 'admin' || role === 'superadmin') && (
                      <>
                        <div className="dropdown-divider"></div>
                        <Link to="/properties/create" className="dropdown-item" onClick={() => setShowAccountMenu(false)}>
                          <span>➕</span> Create Listing
                        </Link>
                      </>
                    )}
                    <div className="dropdown-divider"></div>
                    <Link to="/account/settings" className="dropdown-item" onClick={() => setShowAccountMenu(false)}>
                      <span>⚙️</span> Settings
                    </Link>
                    <Link to="/privacy" className="dropdown-item" onClick={() => setShowAccountMenu(false)}>
                      <span>🔒</span> Privacy Statement
                    </Link>
                    <Link to="/terms" className="dropdown-item" onClick={() => setShowAccountMenu(false)}>
                      <span>📄</span> Terms of Service
                    </Link>
                    <Link to="/help" className="dropdown-item" onClick={() => setShowAccountMenu(false)}>
                      <span>❓</span> Help & Support
                    </Link>
                    <div className="dropdown-divider"></div>
                    <button onClick={handleSignOut} className="dropdown-item logout">
                      <span>🚪</span> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-btn">Log In</Link>
              <Link to="/signup" className="nav-btn nav-btn-primary">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
