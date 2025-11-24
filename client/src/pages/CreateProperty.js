import React, { useState } from 'react';
import { createProperty } from '../services/api'; // must match history

const CreateProperty = () => {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token'); // retrieve JWT from login
    try {
      await createProperty({ title, price }, token); // token passed here exactly as in history
      alert('Property created successfully!');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error creating property');
    }
  };

  return (
    <form onSubmit={handleCreate}>
      <input type="text" placeholder="Property Title" value={title} onChange={e => setTitle(e.target.value)} required />
      <input type="number" placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} required />
      <button type="submit">Create Property</button>
    </form>
  );
};

export default CreateProperty;
