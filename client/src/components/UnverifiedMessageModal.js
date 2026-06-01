import React, { useState } from 'react';
import { User, Star } from 'lucide-react';
import Modal from '../components/Modal';
import Button from '../components/Button';
import '../pages/Messages.css';

const UnverifiedMessageModal = ({ isOpen, onClose, agent }) => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    setSuccess(false);
    // TODO: Implement API call to send message as guest
    setTimeout(() => {
      setSending(false);
      setSuccess(true);
      setForm({ name: '', email: '', phone: '', message: '' });
    }, 1200);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title={null}>
      <div className="unverified-message-modal">
        <div className="agent-info-box">
          <div className="agent-avatar-placeholder">
            <User size={28} strokeWidth={1.5} aria-hidden="true" />
          </div>
          <div>
            <div className="agent-title">{agent?.role || 'Əmlakçı'}</div>
            <div className="agent-name">{agent?.name || 'Agent Name'}</div>
            <div className="agent-rating-row">
              <span className="agent-star"><Star size={12} strokeWidth={2} aria-hidden="true" /></span>
              <span className="agent-rating">{agent?.rating || '4.7'}</span>
              <span className="agent-sales">• {agent?.sales || '89'} satış</span>
            </div>
            <div className="agent-contact-row">
              <span>{agent?.phone || '+994 51 345 67 89'}</span>
            </div>
            <div className="agent-contact-row">
              <span>{agent?.email || 'rashad@realestate.az'}</span>
            </div>
          </div>
        </div>
        <hr className="agent-divider" />
        <form className="unverified-message-form" onSubmit={handleSubmit}>
          <div className="form-title">Mesaj göndər</div>
          <input
            type="text"
            name="name"
            placeholder="Adınız"
            value={form.name}
            onChange={handleChange}
            required
            className="unverified-input"
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            className="unverified-input"
          />
          <input
            type="tel"
            name="phone"
            placeholder="Telefon"
            value={form.phone}
            onChange={handleChange}
            required
            className="unverified-input"
          />
          <textarea
            name="message"
            placeholder="Mesajınız..."
            value={form.message}
            onChange={handleChange}
            required
            className="unverified-input"
            rows={3}
          />
          {error && <div className="form-error">{error}</div>}
          {success && <div className="form-success">Mesaj göndərildi!</div>}
          <Button type="submit" fullWidth loading={sending}>
            Mesaj Göndər
          </Button>
        </form>
      </div>
    </Modal>
  );
};

export default UnverifiedMessageModal;
