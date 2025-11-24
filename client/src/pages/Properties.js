import React, { useEffect, useState } from 'react';
import { getProperties } from '../services/api';

const Properties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await getProperties();
        setProperties(res.data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Error fetching properties');
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  if (loading) return <p>Loading properties...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h2>All Properties</h2>
      <ul>
        {properties.map((prop) => (
          <li key={prop._id}>
            {prop.title} - ${prop.price}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Properties;
