import React, { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar       from '../components/Navbar';
import Footer       from './Footer';
import ErrorBoundary from '../components/ErrorBoundary';
import '../styles/main-content.css';

const MainLayout = ({ children }) => {
  const location = useLocation();

  // Scroll to top before first paint on every route mount.
  // Search is excluded — it owns its scroll (spatial continuity on return from property detail).
  // useLayoutEffect fires synchronously after DOM update but before browser paint,
  // so the user never sees the wrong scroll position flash.
  useLayoutEffect(() => {
    if (location.pathname.startsWith('/search')) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // [] = run once on mount; MainLayout remounts on each route change

  return (
    <div className="main-layout">
      <Navbar />
      {/* Route-level error boundary — catches errors in page components
          without taking down the entire shell (navbar + footer stay visible) */}
      <main className="main-content">
        <ErrorBoundary>
          {/* key=pathname gives each route its own mount cycle, triggering the
              fade-in animation on navigation without touching Search's internal state */}
          <div key={location.pathname} className="route-transition">
            {children}
          </div>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
