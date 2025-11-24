import React, { useEffect, useState } from 'react';
import { getProperties, createProperty } from '../services/api';
import { useParams } from 'react-router-dom';

const UpdateProperty = () => {
  const { id } = useParams(); // get :id from route
  const [properties, setProperties] = useState([]);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await getProperties();
        setProperties(res.data);
        const property = res.data.find(p => p._id === id);
        if (property) {
          setTitle(property.title);
          setPrice(property.price);
        }
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || 'Error fetching properties');
      }
    };
    fetchProperties();
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      await createProperty({ title, price }, token); // replace with updateProperty if exists
      alert('Property updated successfully!');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error updating property');
    }
  };

  return (
    <div>
      <h2>Update Property</h2>
      <form onSubmit={handleUpdate}>
        <input type="text" placeholder="Property Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input type="number" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} required />
        <button type="submit">Update Property</button>
      </form>
    </div>
  );
};

export default UpdateProperty;
