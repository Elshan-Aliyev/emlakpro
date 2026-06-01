import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ChevronLeft, AlertCircle } from 'lucide-react';
import { useToast } from '../components/Toast';
import Button from '../components/Button';
import Input from '../components/Input';
import api from '../services/api';
import './Auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      setError('Email is required');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('Password reset link sent to your email!');
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to send reset link. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 56, height: 56, borderRadius: 16,
                background: 'rgba(15,118,110,0.08)',
                color: 'var(--color-primary, #0F766E)',
              }}>
                <Mail size={24} strokeWidth={1.75} aria-hidden="true" />
              </span>
            </div>
            <h1 className="auth-title">Check your email</h1>
            <p className="auth-subtitle">
              We sent a reset link to <strong>{email}</strong>
            </p>
          </div>

          <div style={{ textAlign: 'center', marginTop: 20, marginBottom: 8 }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted, #6b7280)', marginBottom: 16 }}>
              Didn't receive it? Check your spam folder or try again.
            </p>
            <Button variant="outline" onClick={() => setSent(false)}>
              Try again
            </Button>
          </div>

          <div className="auth-footer">
            <Link to="/login" className="auth-back-link" style={{ display: 'inline-flex', marginTop: 12 }}>
              <ChevronLeft size={14} strokeWidth={2} aria-hidden="true" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Link to="/" className="auth-logo">
            <img src="/assets/logo/emlakpro-logo.png" alt="Əmlak Professionalları" className="logo-image" />
          </Link>
          <h1 className="auth-title">Forgot your password?</h1>
          <p className="auth-subtitle">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error-banner">
              <AlertCircle size={16} strokeWidth={2} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={loading}
            disabled={loading}
          >
            Send reset link
          </Button>
        </form>

        <Link to="/login" className="auth-back-link" style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
          <ChevronLeft size={14} strokeWidth={2} aria-hidden="true" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassword;
