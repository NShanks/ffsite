/**
 * API client for the Django backend.
 * Points to http://localhost:8000/api when the backend is running.
 */
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

const api = {
  get: (path) => {
    const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
    return axios.get(url);
  },
  post: (path, data = {}) => {
    const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
    return axios.post(url, data);
  },
};

export default api;
