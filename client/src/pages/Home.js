// src/pages/Home.js
import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div>
      <h1>Welcome to Əmlak Pro</h1>
      <p>Navigate the app using the menu above.</p>
      <ul>
        <li><Link to="/properties">Properties</Link></li>
        <li><Link to="/users">Users</Link></li>
        <li><Link to="/profile">My Profile</Link></li>
      </ul>
    </div>
  );
};

export default Home;
