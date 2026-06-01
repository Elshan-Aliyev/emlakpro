import React, { useState } from 'react';
import { User, Heart, Home, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AccountProfile from './AccountProfile';
import AccountSaved from './AccountSaved';
import AccountListings from './AccountListings';
import AccountSettings from './AccountSettings';
import './Account.css';

const TABS = [
  { key: 'profile',       label: 'Profile',     icon: <User     size={18} strokeWidth={1.5} aria-hidden="true" /> },
  { key: 'favorites',     label: 'Saved',       icon: <Heart    size={18} strokeWidth={1.5} aria-hidden="true" /> },
  { key: 'my-properties', label: 'My listings', icon: <Home     size={18} strokeWidth={1.5} aria-hidden="true" /> },
  { key: 'settings',      label: 'Settings',    icon: <Settings size={18} strokeWidth={1.5} aria-hidden="true" /> },
];

const AccountTabs = () => {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('profile');

  const initials = user?.name
    ? `${user.name[0]}${user.lastName?.[0] || ''}`.toUpperCase()
    : 'U';

  return (
    <div className="account-layout">
      <aside className="account-sidebar">
        <div className="account-tabs-avatar">
          <div className="avatar-img-placeholder">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} />
            ) : (
              initials
            )}
          </div>
          <div className="account-tabs-name">{user?.name} {user?.lastName}</div>
          <div className="account-tabs-email">{user?.email}</div>
        </div>

        <nav className="account-nav" style={{ marginTop: '1.25rem' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={`account-nav-link${tab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}
              type="button"
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}

          <button
            className="account-nav-link logout"
            onClick={logout}
            type="button"
            style={{ marginTop: '1.25rem' }}
          >
            <LogOut size={18} strokeWidth={1.5} aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </nav>
      </aside>

      <section className="account-content">
        {tab === 'profile'        && <AccountProfile />}
        {tab === 'favorites'      && <AccountSaved />}
        {tab === 'my-properties'  && <AccountListings />}
        {tab === 'settings'       && <AccountSettings />}
      </section>
    </div>
  );
};

export default AccountTabs;
