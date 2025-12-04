import React from 'react';
import { useAuth } from '../context/AuthContext';

const AdminWrapper = ({ children, fallback = null }) => {
  const { isAdmin } = useAuth();

  if (!isAdmin()) {
    return fallback;
  }

  return <>{children}</>;
};

export default AdminWrapper;
