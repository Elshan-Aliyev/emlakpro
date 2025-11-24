import React, { useEffect, useState } from 'react';
import { getProperties } from '../services/api';

const PropertyList = () => {
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await getProperties();
        setProperties(res.data);
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || 'Error fetching properties');
      }
    };
    fetchProperties();
  }, []);

  return (
    <div>
      <h2>All Properties</h2>
      <ul>
        {properties.map((p) => (
          <li key={p._id}>
            {p.title} - ${p.price}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PropertyList;
