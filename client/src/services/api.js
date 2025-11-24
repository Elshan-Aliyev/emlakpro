import axios from 'axios';

// Base axios instance (uses proxy automatically)
const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Points to backend via proxy
});
export const deleteUser = (id, token) =>
  api.delete(`/auth/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });

export const updateUser = (id, data, token) =>
  api.put(`/auth/users/${id}`, data, { headers: { Authorization: `Bearer ${token}` } });
export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);
export const getUsers = () => api.get('/auth/users');
export const getProperties = () => api.get('/properties');
export const createProperty = (data, token) =>
  api.post('/properties', data, { headers: { Authorization: `Bearer ${token}` } });

export default api;
