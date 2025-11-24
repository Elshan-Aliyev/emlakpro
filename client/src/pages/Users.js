import React, { useEffect, useState } from 'react';
import { getUsers } from '../services/api';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await getUsers();
        setUsers(res.data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Error fetching users');
      }
    };
    fetchUsers();
  }, []);

  if (error) return <p>{error}</p>;

  return (
    <div>
      <h2>All Users</h2>
      <ul>
        {users.map((user) => (
          <li key={user._id}>
            {user.name} - {user.email}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Users;
