// File: frontendside/src/API/budgetAPI.js
import axios from 'axios';

const budgetApi = axios.create({ 
  baseURL: import.meta.env.VITE_BUDGET_API_URL || 'http://localhost:8000/api',
});

// Add interceptor to include JWT token in requests
budgetApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default budgetApi;