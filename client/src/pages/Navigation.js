// client/src/pages/Navigation.js
import React from 'react';
import { Link } from 'react-router-dom';

const Navigation = () => {
  const token = localStorage.getItem('token');

  return (
    <nav>
      <ul>
        <li><Link to="/">Home</Link></li>
        <li><Link to="/properties">Properties</Link></li>
        {token ? (
          <>
            <li><Link to="/profile">My Profile</Link></li>
            <li><Link to="/users">Users</Link></li>
            <li><button onClick={() => { localStorage.removeItem('token'); window.location.reload(); }}>Sign Out</button></li>
          </>
        ) : (
          <>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/signup">Sign Up</Link></li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navigation;
