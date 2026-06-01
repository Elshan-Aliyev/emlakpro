import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, Shield, Lock, Check, ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Button from '../components/Button';
import Input from '../components/Input';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'admin' || user?.role === 'superadmin') {
        navigate('/admin');
      } else {
        const from = location.state?.from;
        navigate(from || '/account', { replace: true });
      }
    }
  }, [isAuthenticated, user?.role, navigate, location.state]);

  const validate = () => {
    const newErrors = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      const result = await login(email, password);

      if (result.success) {
        toast.success('Login successful!');
        // Navigation handled by the useEffect that watches isAuthenticated
      } else {
        setErrors({ general: result.message });
        toast.error(result.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
      setErrors({ general: errorMessage });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Link to="/" className="auth-logo">
            <img src="/assets/logo/emlakpro-logo.png" alt="Əmlak Professionalları" className="logo-image" />
          </Link>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to your account to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {errors.general && (
            <div className="auth-error-banner">
              <AlertCircle size={16} strokeWidth={2} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{errors.general}</span>
            </div>
          )}

          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            required
          />

          <div className="auth-options">
            <Link to="/forgot-password" className="auth-link">
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={loading}
            disabled={loading}
          >
            Sign in
          </Button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/signup" className="auth-link-bold">
              Create one free
            </Link>
          </p>
        </div>

        <div className="auth-trust">
          <span className="auth-trust-item">
            <Shield size={12} strokeWidth={2.5} aria-hidden="true" />
            Secure login
          </span>
          <span className="auth-trust-item">
            <Lock  size={12} strokeWidth={2.5} aria-hidden="true" />
            Data encrypted
          </span>
          <span className="auth-trust-item">
            <Check size={12} strokeWidth={2.5} aria-hidden="true" />
            No spam, ever
          </span>
        </div>

        <Link to="/" className="auth-back-link">
          <ChevronLeft size={14} strokeWidth={2} aria-hidden="true" />
          Back to home
        </Link>
      </div>
    </div>
  );
};

export default Login;
