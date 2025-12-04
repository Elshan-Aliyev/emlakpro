import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';

const NotFound = () => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-6)',
      background: 'linear-gradient(135deg, var(--primary-500), var(--secondary-500))',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '600px',
        background: 'white',
        padding: 'var(--space-12)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-xl)',
      }}>
        <div style={{ fontSize: '6rem', marginBottom: 'var(--space-4)' }}>🏚️</div>
        <h1 style={{ fontSize: '3rem', fontWeight: '700', marginBottom: 'var(--space-4)', color: 'var(--gray-900)' }}>
          404
        </h1>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: 'var(--space-3)', color: 'var(--gray-800)' }}>
          Page Not Found
        </h2>
        <p style={{ fontSize: '1.125rem', color: 'var(--gray-600)', marginBottom: 'var(--space-8)' }}>
          Sorry, we couldn't find the property you're looking for. It might have been sold or removed.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/">
            <Button size="lg">Go Home</Button>
          </Link>
          <Link to="/buy">
            <Button variant="outline" size="lg">Browse Properties</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
