// File: frontendside/src/API/budgetAPI.js
import axios from 'axios';
import { getAccessToken } from './TokenUtils';

// BMS Budget Service API URL (not auth service)
const budgetApi = axios.create({ 
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8001/api',
});

// Add interceptor to include JWT token in requests
budgetApi.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
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