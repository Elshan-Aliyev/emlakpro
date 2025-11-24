// src/pages/UserList.js
import React, { useEffect, useState } from 'react';
import { getUsers, deleteUser } from '../services/api';

const UserList = () => {
  const [users, setUsers] = useState([]);

  const fetchUsers = async () => {
    try {
      const res = await getUsers();
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error fetching users');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteUser(id);
      alert('User deleted successfully');
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error deleting user');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div>
      <h2>User List</h2>
      <ul>
        {users.map((user) => (
          <li key={user._id}>
            {user.name} ({user.email})
            <button onClick={() => handleDelete(user._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserList;
