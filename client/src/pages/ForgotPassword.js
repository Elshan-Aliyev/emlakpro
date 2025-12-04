import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
            <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>📧</div>
            <h1 className="auth-title">Check Your Email</h1>
            <p className="auth-subtitle">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
          </div>

          <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
            <p style={{ marginBottom: 'var(--space-4)', color: 'var(--gray-600)' }}>
              Didn't receive the email? Check your spam folder or
            </p>
            <Button variant="outline" onClick={() => setSent(false)}>
              Try Again
            </Button>
          </div>

          <div className="auth-footer">
            <Link to="/login" className="auth-link-bold">
              ← Back to Login
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
          <Link to="/" className="logo">
            <img src="/assets/logo/emlakpro-logo.png" alt="Əmlak Professionalları" className="logo-image" />
            <span className="logo-text">Əmlak Professionalları</span>
          </Link>
          <h1 className="auth-title">Forgot Password?</h1>
          <p className="auth-subtitle">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error-banner">
              {error}
            </div>
          )}

          <Input
            label="Email Address"
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<span>📧</span>}
            required
          />

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={loading}
            disabled={loading}
          >
            Send Reset Link
          </Button>
        </form>

        <div className="auth-footer">
          <Link to="/login" className="auth-link-bold">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
