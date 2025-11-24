import React, { useState, useEffect } from 'react';
import { getUsers, updateUser } from '../services/api';
import { useParams } from 'react-router-dom';

const UpdateUser = () => {
  const { id } = useParams();
  const [user, setUser] = useState({ name: '', email: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await getUsers();
        const foundUser = res.data.find(u => u._id === id);
        if (foundUser) setUser({ name: foundUser.name, email: foundUser.email });
      } catch (err) {
        console.error(err);
      }
    };
    fetchUser();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateUser(id, user);
      setMessage('User updated successfully');
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || 'Error updating user');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={user.name} onChange={e => setUser({ ...user, name: e.target.value })} placeholder="Name" />
      <input value={user.email} onChange={e => setUser({ ...user, email: e.target.value })} placeholder="Email" />
      <button type="submit">Update User</button>
      <p>{message}</p>
    </form>
  );
};

export default UpdateUser;
