import React from 'react';
import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';

const NotFound = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: 'var(--color-bg-canvas, #FAFAF9)',
    fontFamily: "var(--font-sans, 'Inter Tight', 'Inter', sans-serif)",
  }}>
    <div style={{
      textAlign: 'center',
      maxWidth: 480,
      background: 'var(--color-bg-surface, #fff)',
      padding: '56px 48px',
      borderRadius: 24,
      border: '1px solid var(--border-subtle, #e5e7eb)',
      boxShadow: '0 4px 6px rgba(15,23,42,0.04), 0 10px 30px rgba(15,23,42,0.08)',
    }}>
      {/* Minimal 404 mark */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 72,
        height: 72,
        borderRadius: 20,
        background: 'var(--color-bg-sunken, #f5f5f4)',
        border: '1px solid var(--border-subtle, #e5e7eb)',
        marginBottom: 24,
        color: 'var(--color-text-muted, #9ca3af)',
      }}>
        <SearchX size={32} strokeWidth={1.5} aria-hidden="true" />
      </div>

      <div style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--color-graphite-900, #0F172A)', marginBottom: 8, lineHeight: 1 }}>
        404
      </div>

      <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-graphite-900, #0F172A)', marginBottom: 10 }}>
        Page not found
      </h1>

      <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-muted, #6b7280)', marginBottom: 32, lineHeight: 1.6, margin: '0 0 32px' }}>
        This page may have moved or no longer exists. Try searching for what you need.
      </p>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '10px 20px',
          background: 'var(--color-primary, #0F766E)',
          color: '#fff', borderRadius: 10,
          fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none',
          transition: 'background 180ms ease',
        }}>
          Go home
        </Link>
        <Link to="/search" style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '10px 20px',
          background: 'transparent',
          color: 'var(--color-text-secondary, #374151)',
          border: '1px solid var(--border-subtle, #e5e7eb)',
          borderRadius: 10,
          fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none',
        }}>
          Browse listings
        </Link>
      </div>
    </div>
  </div>
);

export default NotFound;
