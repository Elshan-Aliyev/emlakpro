import React, { useState, useEffect, useCallback } from 'react';
import { sendPhoneOtp, verifyPhoneOtp } from '../services/api';
import './PhoneVerification.css';

const COOLDOWN_SECONDS = 60;

const PhoneVerification = ({ user, onVerified }) => {
  const [phone, setPhone] = useState(user?.phone || '');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('idle'); // idle | sending | code | verifying | done
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const isVerified = user?.phoneVerified && user?.phone;

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleSend = useCallback(async () => {
    setError('');
    const trimmed = phone.trim();
    if (!trimmed) {
      setError('Enter your phone number.');
      return;
    }
    setStep('sending');
    try {
      const token = localStorage.getItem('token');
      await sendPhoneOtp(trimmed, token);
      setStep('code');
      setCooldown(COOLDOWN_SECONDS);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send code.';
      const retryAfter = err.response?.data?.retryAfter;
      if (retryAfter) setCooldown(retryAfter);
      setError(msg);
      setStep('idle');
    }
  }, [phone]);

  const handleVerify = useCallback(async () => {
    setError('');
    if (!code.trim()) {
      setError('Enter the verification code.');
      return;
    }
    setStep('verifying');
    try {
      const token = localStorage.getItem('token');
      await verifyPhoneOtp(phone.trim(), code.trim(), token);
      setStep('done');
      if (onVerified) onVerified(phone.trim());
    } catch (err) {
      setError(err.response?.data?.message || 'Incorrect code. Try again.');
      setStep('code');
    }
  }, [phone, code, onVerified]);

  if (isVerified && step !== 'done') {
    return (
      <div className="pv-verified">
        <span className="pv-check">&#10003;</span>
        <span className="pv-verified-text">Phone verified</span>
        <span className="pv-verified-number">{user.phone}</span>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="pv-verified">
        <span className="pv-check">&#10003;</span>
        <span className="pv-verified-text">Phone verified</span>
        <span className="pv-verified-number">{phone.trim()}</span>
      </div>
    );
  }

  return (
    <div className="pv-root">
      {step === 'idle' || step === 'sending' ? (
        <>
          <label className="pv-label" htmlFor="pv-phone">Phone number (E.164 format)</label>
          <div className="pv-row">
            <input
              id="pv-phone"
              className="pv-input"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+994501234567"
              disabled={step === 'sending'}
            />
            <button
              className="pv-btn pv-btn-primary"
              onClick={handleSend}
              disabled={step === 'sending' || cooldown > 0}
            >
              {step === 'sending' ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Send Code'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="pv-sent-notice">
            Code sent to <strong>{phone.trim()}</strong>
          </div>
          <label className="pv-label" htmlFor="pv-code">Verification code</label>
          <div className="pv-row">
            <input
              id="pv-code"
              className="pv-input pv-input-code"
              type="text"
              inputMode="numeric"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              maxLength={8}
              disabled={step === 'verifying'}
              autoFocus
            />
            <button
              className="pv-btn pv-btn-primary"
              onClick={handleVerify}
              disabled={step === 'verifying'}
            >
              {step === 'verifying' ? 'Verifying…' : 'Verify'}
            </button>
          </div>
          <div className="pv-resend-row">
            <button
              className="pv-btn-link"
              onClick={() => { setStep('idle'); setCode(''); setError(''); }}
              disabled={step === 'verifying'}
            >
              Change number
            </button>
            {cooldown > 0 ? (
              <span className="pv-cooldown">Resend in {cooldown}s</span>
            ) : (
              <button className="pv-btn-link" onClick={handleSend}>
                Resend code
              </button>
            )}
          </div>
        </>
      )}
      {error && <p className="pv-error">{error}</p>}
      <p className="pv-hint">
        Use E.164 format: +{' '}country code + number (e.g. +994501234567).
      </p>
    </div>
  );
};

export default PhoneVerification;
