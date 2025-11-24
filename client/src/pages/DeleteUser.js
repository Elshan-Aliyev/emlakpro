import React from 'react';
import { deleteUser } from '../services/api';
import { useParams, useNavigate } from 'react-router-dom';

const DeleteUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteUser(id);
      alert('User deleted successfully');
      navigate('/users/list');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error deleting user');
    }
  };

  return <button onClick={handleDelete}>Delete User</button>;
};

export default DeleteUser;
