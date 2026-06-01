import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search, X, ChevronDown, ArrowRight, Heart, LayoutGrid, Star,
  AlignLeft, Home, MessageSquare, Plus, Settings, LogOut,
  Clock, ArrowUpRight,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getUnreadMessageCount } from '../services/api';
import './Navbar.css';
import { parseNLQuery, formatPrice } from '../utils/nlpSearch';

const PALETTE_INTENTS = [
  '2-bedroom apartment under 250k',
  'Verified homes in Yasamal',
  'New projects near metro',
  'Villa with sea view in Baku',
  'Short-term rental under 1000 AZN',
];

const navParamsToChips = (params) => {
  const chips = [];
  if (params.listingStatus === 'for-rent') chips.push('For Rent');
  else if (params.listingStatus === 'for-sale') chips.push('For Sale');
  if (params.propertyType) chips.push(params.propertyType.charAt(0).toUpperCase() + params.propertyType.slice(1));
  if (params.bedrooms) chips.push(`${params.bedrooms}+ bed`);
  if (params.maxPrice) chips.push(`Under ${formatPrice(params.maxPrice)}`);
  else if (params.minPrice) chips.push(`Over ${formatPrice(params.minPrice)}`);
  if (params.city) chips.push(params.city);
  if (params.district) chips.push(params.district);
  return chips;
};

const Navbar = () => {
  const [showAccountMenu,    setShowAccountMenu]    = useState(false);
  const [showMobileMenu,     setShowMobileMenu]     = useState(false);
  const [scrolled,           setScrolled]           = useState(false);
  const [unreadMessages,     setUnreadMessages]     = useState(0);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [paletteQuery,       setPaletteQuery]       = useState('');
  const [paletteChips,       setPaletteChips]       = useState([]);
  const [recentSearches,     setRecentSearches]     = useState([]);
  const accountRef      = useRef(null);
  const paletteInputRef = useRef(null);
  const cpRef           = useRef(null);
  const navigate        = useNavigate();
  const location   = useLocation();
  const { switchTheme, isBuyMode } = useTheme();
  const { logout: authLogout }     = useAuth();

  // Parse auth token
  const token = localStorage.getItem('token');
  let role     = null;
  let userName = null;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      role     = payload.role;
      userName = payload.name;
    } catch (_) {}
  }

  // Scroll — only visual state, layout height never changes
  useEffect(() => {
    const onScroll = () => {
      const isSearch   = location.pathname === '/search';
      const isScrolled = isSearch || window.scrollY > 10;
      setScrolled(isScrolled);
      document.body.classList.toggle('scrolled', isScrolled);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.body.classList.remove('scrolled');
    };
  }, [location.pathname]);

  // Close account menu on outside click
  useEffect(() => {
    const onOutside = (e) => {
      if (showAccountMenu && accountRef.current && !accountRef.current.contains(e.target)) {
        setShowAccountMenu(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [showAccountMenu]);

  // Close menus on route change
  useEffect(() => {
    setShowAccountMenu(false);
    setShowMobileMenu(false);
  }, [location.pathname]);

  // Escape key
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { setShowAccountMenu(false); setShowMobileMenu(false); setShowCommandPalette(false); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Lock body scroll when mobile menu is open.
  // iOS Safari needs position:fixed + saved scroll offset to prevent rubber-band scroll.
  useEffect(() => {
    if (showMobileMenu) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top      = `-${scrollY}px`;
      document.body.style.width    = '100%';
    } else {
      const top = parseFloat(document.body.style.top || '0') * -1;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top      = '';
      document.body.style.width    = '';
      if (top) window.scrollTo(0, top);
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top      = '';
      document.body.style.width    = '';
    };
  }, [showMobileMenu]);

  // Unread message count
  useEffect(() => {
    if (!token) return;
    const fetch = async () => {
      try {
        const res = await getUnreadMessageCount(token);
        setUnreadMessages(res.data.count || 0);
      } catch { setUnreadMessages(0); }
    };
    fetch();
    const id = setInterval(fetch, 30000);
    return () => clearInterval(id);
  }, [token]);

  // Command palette: focus input + load recents on open; reset on close
  useEffect(() => {
    if (showCommandPalette) {
      setTimeout(() => paletteInputRef.current?.focus(), 50);
      try {
        const stored = JSON.parse(localStorage.getItem('cp_recent_searches') || '[]');
        setRecentSearches(stored.slice(0, 4));
      } catch { setRecentSearches([]); }
      document.body.style.overflow = 'hidden';
    } else {
      setPaletteQuery('');
      setPaletteChips([]);
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showCommandPalette]);

  // Command palette: live NLP chip interpretation
  useEffect(() => {
    if (!paletteQuery.trim()) { setPaletteChips([]); return; }
    const { params } = parseNLQuery(paletteQuery);
    setPaletteChips(navParamsToChips(params));
  }, [paletteQuery]);

  // Command palette: close on outside click
  useEffect(() => {
    if (!showCommandPalette) return;
    const onOutside = (e) => {
      if (cpRef.current && !cpRef.current.contains(e.target)) setShowCommandPalette(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [showCommandPalette]);

  const handleSignOut = () => {
    authLogout();
    navigate('/');
  };

  const handleLogoClick = (e) => {
    e.preventDefault();
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    }
  };

  const handleBuyClick = () => {
    switchTheme('buy');
    if (location.pathname !== '/' && location.pathname !== '/home') {
      navigate('/search?listingStatus=for-sale');
    }
  };

  const handleRentClick = () => {
    switchTheme('rent');
    if (location.pathname !== '/' && location.pathname !== '/home') {
      navigate('/search?listingStatus=for-rent');
    }
  };

  const navigateToPaletteSearch = (query) => {
    const q = (query !== undefined ? query : paletteQuery).trim();
    if (!q) { navigate('/search'); setShowCommandPalette(false); return; }
    try {
      const existing = JSON.parse(localStorage.getItem('cp_recent_searches') || '[]');
      localStorage.setItem('cp_recent_searches', JSON.stringify([q, ...existing.filter(s => s !== q)].slice(0, 6)));
    } catch {}
    const { params, remainingKeyword } = parseNLQuery(q);
    const sp = new URLSearchParams();
    if (params.listingStatus) sp.set('listingStatus', params.listingStatus);
    if (params.propertyType)  sp.set('propertyType', params.propertyType);
    if (params.bedrooms)      sp.set('bedrooms', String(params.bedrooms));
    if (params.minPrice)      sp.set('minPrice', String(params.minPrice));
    if (params.maxPrice)      sp.set('maxPrice', String(params.maxPrice));
    if (params.city)          sp.set('city', params.city);
    if (params.district)      sp.set('district', params.district);
    if (remainingKeyword)     sp.set('keyword', remainingKeyword);
    setShowCommandPalette(false);
    navigate(`/search?${sp.toString()}`);
  };

  const handlePaletteKey = (e) => {
    if (e.key === 'Enter') navigateToPaletteSearch();
    if (e.key === 'Escape') setShowCommandPalette(false);
  };

  const isNewProjectsActive = location.pathname === '/search' && location.search.includes('new-project');

  return (
    <>
      {/* ── Navbar — fixed, always var(--nav-height) tall ── */}
      <header className={`nav-bar${scrolled ? ' nav-bar--scrolled' : ''}`} role="banner">
        <div className="nav-inner">

          {/* LEFT — Logo */}
          <div className="nav-left">
            <Link to="/" className="nav-logo" onClick={handleLogoClick} aria-label="Əmlak Pro — home">
              <img
                src="/assets/logo/emlakpro-logo.png"
                alt="Əmlak Pro"
                className="nav-logo-img"
              />
            </Link>
          </div>

          {/* CENTER — Primary links (desktop) + AI Search pill (mobile) */}
          <div className="nav-center-wrapper">

            {/* Desktop nav */}
            <nav className="nav-center" aria-label="Main navigation">

              {/* Buy */}
              <div className="nav-item">
                <button
                  className={`nav-link${isBuyMode && !isNewProjectsActive ? ' nav-link--active' : ''}`}
                  onClick={handleBuyClick}
                >
                  Buy
                  <ChevronDown className="nav-chevron" size={10} strokeWidth={1.75} aria-hidden="true" />
                </button>
                <div className="nav-dropdown-panel" role="menu">
                  <div className="nav-dropdown-body">
                    <button role="menuitem" className="nav-dropdown-item" onClick={() => navigate('/search?listingStatus=for-sale&purpose=residential&propertyType=apartment')}>Apartments for Sale</button>
                    <button role="menuitem" className="nav-dropdown-item" onClick={() => navigate('/search?listingStatus=for-sale&purpose=residential&propertyType=house')}>Houses for Sale</button>
                    <button role="menuitem" className="nav-dropdown-item" onClick={() => navigate('/search?listingStatus=for-sale&purpose=residential&propertyType=villa')}>Villas for Sale</button>
                    <button role="menuitem" className="nav-dropdown-item" onClick={() => navigate('/search?listingStatus=for-sale&purpose=residential&propertyType=penthouse')}>Penthouses</button>
                    <button role="menuitem" className="nav-dropdown-item" onClick={() => navigate('/search?listingStatus=for-sale&purpose=residential&bedrooms=3')}>3+ Bedrooms</button>
                  </div>
                  <div className="nav-dropdown-footer">
                    <button role="menuitem" className="nav-dropdown-all" onClick={() => navigate('/search?listingStatus=for-sale')}>
                      View all properties for sale
                      <ArrowRight size={11} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Rent */}
              <div className="nav-item">
                <button
                  className={`nav-link${!isBuyMode && !isNewProjectsActive ? ' nav-link--active' : ''}`}
                  onClick={handleRentClick}
                >
                  Rent
                  <ChevronDown className="nav-chevron" size={10} strokeWidth={1.75} aria-hidden="true" />
                </button>
                <div className="nav-dropdown-panel" role="menu">
                  <div className="nav-dropdown-body">
                    <button role="menuitem" className="nav-dropdown-item" onClick={() => navigate('/search?listingStatus=for-rent&purpose=residential&subCategory=long-term&propertyType=apartment')}>Long-term Apartments</button>
                    <button role="menuitem" className="nav-dropdown-item" onClick={() => navigate('/search?listingStatus=for-rent&purpose=residential&propertyType=house')}>Houses for Rent</button>
                    <button role="menuitem" className="nav-dropdown-item" onClick={() => navigate('/search?listingStatus=for-rent&purpose=residential&propertyType=villa')}>Villas for Rent</button>
                    <button role="menuitem" className="nav-dropdown-item" onClick={() => navigate('/search?listingStatus=for-rent&purpose=residential&subCategory=short-term')}>Vacation &amp; Short-term</button>
                    <button role="menuitem" className="nav-dropdown-item" onClick={() => navigate('/search?listingStatus=for-rent&purpose=residential&subCategory=short-term&paymentFrequency=daily')}>Daily Rentals</button>
                  </div>
                  <div className="nav-dropdown-footer">
                    <button role="menuitem" className="nav-dropdown-all" onClick={() => navigate('/search?listingStatus=for-rent')}>
                      View all rentals
                      <ArrowRight size={11} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>

              {/* New Projects */}
              <Link
                to="/search?listingStatus=new-project"
                className={`nav-link${isNewProjectsActive ? ' nav-link--active' : ''}`}
              >
                New Projects
              </Link>

            </nav>

            {/* Mobile AI Search pill — shown only on mobile */}
            <button
              className="nav-mobile-search-btn"
              onClick={() => setShowCommandPalette(true)}
              aria-label="Search properties"
            >
              <Search size={15} strokeWidth={1.75} aria-hidden="true" />
              <span>Search</span>
            </button>

          </div>

          {/* RIGHT — Actions */}
          <div className="nav-right">

            {/* AI Search — signature element, desktop */}
            <button
              className="nav-ai-btn"
              onClick={() => setShowCommandPalette(true)}
              aria-label="AI-powered property search"
            >
              <span className="nav-ai-dot" aria-hidden="true" />
              <Search className="nav-ai-icon" size={14} strokeWidth={1.75} aria-hidden="true" />
              <span>AI Search</span>
            </button>

            {token ? (
              <>
                {/* Saved / Favorites */}
                <Link to="/favorites" className="nav-icon-btn" title="Saved properties" aria-label="Saved properties">
                  <Heart size={17} strokeWidth={1.75} aria-hidden="true" />
                </Link>

                {/* Account menu */}
                <div className="nav-account" ref={accountRef}>
                  <button
                    className={`nav-account-btn${showAccountMenu ? ' nav-account-btn--open' : ''}`}
                    onClick={() => setShowAccountMenu(v => !v)}
                    aria-expanded={showAccountMenu}
                    aria-haspopup="true"
                    aria-label="Account menu"
                  >
                    <div className="nav-hamburger" aria-hidden="true">
                      <span /><span /><span />
                    </div>
                    {unreadMessages > 0 && (
                      <span className="nav-unread-dot" aria-label={`${unreadMessages} unread`} />
                    )}
                  </button>

                  {showAccountMenu && (
                    <div className="nav-account-menu" role="menu">
                      <div className="nav-account-header">
                        <span className="nav-account-name">{userName || 'User'}</span>
                        <span className="nav-account-role">{role}</span>
                      </div>
                      <div className="nav-account-body">
                        <Link role="menuitem" to="/account" className="nav-menu-item" onClick={() => setShowAccountMenu(false)}>
                          <LayoutGrid size={14} strokeWidth={1.75} aria-hidden="true" />
                          Dashboard
                        </Link>
                        {(role === 'admin' || role === 'superadmin') && (
                          <Link role="menuitem" to="/admin" className="nav-menu-item nav-menu-item--admin" onClick={() => setShowAccountMenu(false)}>
                            <Star size={14} strokeWidth={1.75} aria-hidden="true" />
                            Admin Panel
                          </Link>
                        )}
                        {(role === 'admin' || role === 'superadmin') && (
                          <Link role="menuitem" to="/admin/articles" className="nav-menu-item nav-menu-item--admin" onClick={() => setShowAccountMenu(false)}>
                            <AlignLeft size={14} strokeWidth={1.75} aria-hidden="true" />
                            Manage Resources
                          </Link>
                        )}
                        <div className="nav-menu-sep" />
                        {(role !== 'admin' && role !== 'superadmin') && (
                          <Link role="menuitem" to="/account/listings" className="nav-menu-item" onClick={() => setShowAccountMenu(false)}>
                            <Home size={14} strokeWidth={1.75} aria-hidden="true" />
                            My Properties
                          </Link>
                        )}
                        <Link role="menuitem" to="/account/saved" className="nav-menu-item" onClick={() => setShowAccountMenu(false)}>
                          <Heart size={14} strokeWidth={1.75} aria-hidden="true" />
                          Saved Properties
                        </Link>
                        <Link role="menuitem" to="/messages" className="nav-menu-item" onClick={() => setShowAccountMenu(false)}>
                          <MessageSquare size={14} strokeWidth={1.75} aria-hidden="true" />
                          Messages
                          {unreadMessages > 0 && <span className="nav-menu-badge">{unreadMessages}</span>}
                        </Link>
                        {(role === 'realtor' || role === 'corporate' || role === 'admin' || role === 'superadmin') && (
                          <>
                            <div className="nav-menu-sep" />
                            <Link role="menuitem" to="/properties/create" className="nav-menu-item" onClick={() => setShowAccountMenu(false)}>
                              <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
                              Create Listing
                            </Link>
                          </>
                        )}
                        <div className="nav-menu-sep" />
                        <Link role="menuitem" to="/account/settings" className="nav-menu-item" onClick={() => setShowAccountMenu(false)}>
                          <Settings size={14} strokeWidth={1.75} aria-hidden="true" />
                          Settings
                        </Link>
                        <div className="nav-menu-sep" />
                        <button role="menuitem" onClick={handleSignOut} className="nav-menu-item nav-menu-item--danger">
                          <LogOut size={14} strokeWidth={1.75} aria-hidden="true" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login"  className="nav-auth-ghost">Log In</Link>
                <Link to="/signup" className="nav-auth-solid">Sign Up</Link>
              </>
            )}

            {/* Mobile menu toggle */}
            <button
              className={`nav-mobile-toggle${showMobileMenu ? ' nav-mobile-toggle--open' : ''}`}
              onClick={() => setShowMobileMenu(v => !v)}
              aria-label={showMobileMenu ? 'Close menu' : 'Open menu'}
              aria-expanded={showMobileMenu}
            >
              <span /><span /><span />
            </button>

          </div>
        </div>
      </header>

      {/* ── Command Palette ── */}
      {showCommandPalette && (
        <div className="nav-cp-backdrop" role="dialog" aria-modal="true" aria-label="Property search">
          <div className="nav-cp-panel" ref={cpRef}>

            <div className="nav-cp-search-row">
              <Search className="nav-cp-icon" size={16} strokeWidth={1.75} aria-hidden="true" />
              <input
                ref={paletteInputRef}
                className="nav-cp-input"
                placeholder="Search properties, areas, or describe what you want..."
                value={paletteQuery}
                onChange={e => setPaletteQuery(e.target.value)}
                onKeyDown={handlePaletteKey}
                autoComplete="off"
                spellCheck="false"
              />
              <button className="nav-cp-close" onClick={() => setShowCommandPalette(false)} aria-label="Close search">
                <X size={11} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>

            {paletteChips.length > 0 && (
              <div className="nav-cp-chips">
                {paletteChips.map((chip, i) => (
                  <span key={i} className="nav-cp-chip">{chip}</span>
                ))}
              </div>
            )}

            {recentSearches.length > 0 && !paletteQuery && (
              <div className="nav-cp-section">
                <span className="nav-cp-section-label">Recent</span>
                {recentSearches.map((s, i) => (
                  <button key={i} className="nav-cp-item" onClick={() => navigateToPaletteSearch(s)}>
                    <Clock size={13} strokeWidth={1.75} aria-hidden="true" />
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="nav-cp-section">
              <span className="nav-cp-section-label">{paletteQuery ? 'Try' : 'Suggested'}</span>
              {PALETTE_INTENTS.map((intent, i) => (
                <button key={i} className="nav-cp-item" onClick={() => navigateToPaletteSearch(intent)}>
                  <ArrowUpRight size={13} strokeWidth={1.75} aria-hidden="true" />
                  <span>{intent}</span>
                  <ArrowRight className="nav-cp-arrow" size={11} strokeWidth={1.75} aria-hidden="true" />
                </button>
              ))}
            </div>

            <div className="nav-cp-footer">
              <span>Press <kbd>Enter</kbd> to search · <kbd>Esc</kbd> to close</span>
            </div>

          </div>
        </div>
      )}

      {/* ── Mobile Menu ── */}
      {showMobileMenu && (
        <div
          className="nav-mobile-overlay"
          onClick={() => setShowMobileMenu(false)}
          aria-modal="true"
          role="dialog"
          aria-label="Navigation menu"
        >
          <div className="nav-mobile-panel" onClick={e => e.stopPropagation()}>

            <div className="nav-mobile-head">
              <img src="/assets/logo/emlakpro-logo.png" alt="Əmlak Pro" className="nav-mobile-logo" />
              <button className="nav-mobile-close" onClick={() => setShowMobileMenu(false)} aria-label="Close menu">
                <X size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>

            <nav className="nav-mobile-nav" aria-label="Mobile navigation">
              <button className="nav-mobile-link" onClick={() => { handleBuyClick(); setShowMobileMenu(false); }}>Buy</button>
              <button className="nav-mobile-link" onClick={() => { handleRentClick(); setShowMobileMenu(false); }}>Rent</button>
              <Link to="/search?listingStatus=new-project" className="nav-mobile-link" onClick={() => setShowMobileMenu(false)}>New Projects</Link>
              <Link to="/agents"   className="nav-mobile-link" onClick={() => setShowMobileMenu(false)}>Agents</Link>
              <Link to="/services" className="nav-mobile-link" onClick={() => setShowMobileMenu(false)}>Services</Link>
            </nav>

            {token ? (
              <div className="nav-mobile-user">
                <div className="nav-mobile-user-card">
                  <span className="nav-mobile-user-name">{userName || 'User'}</span>
                  <span className="nav-mobile-user-role">{role}</span>
                </div>
                <div className="nav-mobile-user-links">
                  <Link to="/account"         className="nav-mobile-link" onClick={() => setShowMobileMenu(false)}>Dashboard</Link>
                  {(role !== 'admin' && role !== 'superadmin') && (
                    <Link to="/account/listings" className="nav-mobile-link" onClick={() => setShowMobileMenu(false)}>My Properties</Link>
                  )}
                  <Link to="/messages" className="nav-mobile-link" onClick={() => setShowMobileMenu(false)}>
                    Messages {unreadMessages > 0 && <span className="nav-mobile-badge">{unreadMessages}</span>}
                  </Link>
                  <Link to="/favorites" className="nav-mobile-link" onClick={() => setShowMobileMenu(false)}>Saved</Link>
                  <Link to="/account/settings" className="nav-mobile-link" onClick={() => setShowMobileMenu(false)}>Settings</Link>
                  <button className="nav-mobile-link nav-mobile-link--danger" onClick={handleSignOut}>Sign Out</button>
                </div>
              </div>
            ) : (
              <div className="nav-mobile-auth">
                <Link to="/login"  className="nav-mobile-auth-ghost" onClick={() => setShowMobileMenu(false)}>Log In</Link>
                <Link to="/signup" className="nav-mobile-auth-solid" onClick={() => setShowMobileMenu(false)}>Sign Up</Link>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
