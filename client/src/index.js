// client/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider }  from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import reportWebVitals   from './reportWebVitals';
import { initAnalytics, trackSlowOperation } from './services/analytics';
import './styles/globals.css';
import './styles/hardening.css';
import './index.css';

// Disable browser scroll restoration — we manage it manually per-route.
// Without this, back/forward navigation restores browser-cached scroll positions
// that can conflict with our intentional Search scroll continuity logic.
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

// Initialise analytics before the React tree renders
initAnalytics();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Core Web Vitals — forward LCP/FID/CLS to analytics when meaningful
reportWebVitals(({ name, value, rating }) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[web-vital] ${name}: ${Math.round(value)} (${rating})`);
  }
  // Only surface poor/needs-improvement vitals as slow operations
  if (rating !== 'good') {
    trackSlowOperation(`web_vital_${name.toLowerCase()}`, value, 0, { rating });
  }
});
