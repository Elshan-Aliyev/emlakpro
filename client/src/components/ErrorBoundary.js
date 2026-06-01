import React from 'react';
import { AlertCircle } from 'lucide-react';
import { captureError } from '../services/analytics';

const styles = {
  wrap: {
    minHeight: '55vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: '#FAFAF9',
  },
  inner: {
    maxWidth: 480,
    textAlign: 'center',
    fontFamily: "'Inter Tight', Inter, -apple-system, sans-serif",
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    background: '#f5f5f4',
    border: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    color: '#9ca3af',
  },
  heading: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#0F172A',
    margin: '0 0 8px',
    letterSpacing: '-0.01em',
  },
  body: {
    fontSize: '0.9375rem',
    color: '#6b7280',
    margin: '0 0 24px',
    lineHeight: 1.55,
  },
  actions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  btnPrimary: {
    padding: '10px 20px',
    background: '#0F766E',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: '10px 20px',
    background: 'transparent',
    color: '#374151',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    captureError(error, {
      component_stack: errorInfo?.componentStack?.split('\n').slice(0, 4).join('\n'),
      route: window.location.pathname,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={styles.wrap}>
          <div style={styles.inner}>
            <div style={styles.icon}>
              <AlertCircle size={24} strokeWidth={1.5} aria-hidden="true" />
            </div>
            <h2 style={styles.heading}>Something went wrong</h2>
            <p style={styles.body}>
              An unexpected error occurred. Refreshing the page usually resolves this.
            </p>
            <div style={styles.actions}>
              <button style={styles.btnPrimary} onClick={() => window.location.reload()}>
                Refresh page
              </button>
              <button style={styles.btnSecondary} onClick={() => { window.location.href = '/'; }}>
                Go home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
