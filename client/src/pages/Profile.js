import React, { useEffect, useState } from 'react';
import api from '../services/api';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(res.data);
        setName(res.data.name);
        setEmail(res.data.email);
      } catch (err) {
        console.error(err);
        setMessage(err.response?.data?.message || 'Error fetching profile');
      }
    };
    fetchProfile();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      await api.put(
        '/auth/me',
        { name, email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('Profile updated successfully!');
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || 'Error updating profile');
    }
  };

  if (!user) return <p>Loading profile...</p>;

  return (
    <form onSubmit={handleUpdate}>
      <h2>My Profile</h2>
      <input value={name} onChange={e => setName(e.target.value)} />
      <input value={email} onChange={e => setEmail(e.target.value)} />
      <button type="submit">Update Profile</button>
      <p>{message}</p>
    </form>
  );
};

export default Profile;
