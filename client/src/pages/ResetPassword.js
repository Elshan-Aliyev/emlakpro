import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import { useToast } from '../components/Toast';
import Button from '../components/Button';
import Input from '../components/Input';
import api from '../services/api';
import './Auth.css';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { token } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const validate = () => {
    const newErrors = {};

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      await api.post(`/auth/reset-password/${token}`, { password });
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to reset password. Link may be expired.';
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
          <h1 className="auth-title">Set a new password</h1>
          <p className="auth-subtitle">Choose a strong password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {errors.general && (
            <div className="auth-error-banner">
              <AlertCircle size={16} strokeWidth={2} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{errors.general}</span>
            </div>
          )}

          <Input
            label="New password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            helperText="Must be at least 6 characters"
            required
          />

          <Input
            label="Confirm new password"
            type="password"
            placeholder="Repeat your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            required
          />

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={loading}
            disabled={loading}
          >
            Reset password
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

export default ResetPassword;
