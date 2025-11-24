// src/pages/Login.js
import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom'; // <-- import useNavigate

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate(); // <-- create navigate function

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token); // save JWT token
      alert('Login successful!');
      navigate('/users'); // <-- redirect to Users page
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
      <button type="submit">Login</button>
    </form>
  );
};

export default Login;
