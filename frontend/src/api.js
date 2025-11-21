import axios from 'axios';

// 1. Determine the correct URL based on the environment
// If we are on the live site (production), use the Render URL.
// If we are on your computer (development), use localhost.
const BASE_URL = process.env.NODE_ENV === 'production'
  ? process.env.REACT_APP_API_URL // We will set this in Cloudflare later
  : 'http://localhost:8000/api';

// 2. Create the Axios instance
const api = axios.create({
  baseURL: BASE_URL,
});

// 3. Add the Interceptor (Automatically adds the Token)
// This logic was previously inside AdminDashboard.js
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

export default api;