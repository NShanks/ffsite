import axios from 'axios';

// 2. Define the URL
const BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://ffsite-x1bq.onrender.com/api'
  : 'http://localhost:8000/api';

// 3. Create the instance
const api = axios.create({
  baseURL: BASE_URL,
});

// 4. Add the Interceptor
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