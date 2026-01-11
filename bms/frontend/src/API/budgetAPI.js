// File: frontendside/src/API/budgetAPI.js
import axios from 'axios';
import { getAccessToken } from './TokenUtils';

const budgetApi = axios.create({ 
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api', 
  // Changed: Disable withCredentials to rely solely on Bearer token for cross-domain stability
  withCredentials: false, 
});

// Add interceptor to include JWT token in requests
budgetApi.interceptors.request.use(
  (config) => {
    // Get token from localStorage (where AuthContext stores it)
    const token = getAccessToken();
    
    if (token) {
      // Explicitly set the Authorization header
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log for debugging (remove in production)
    console.log('🔑 BMS API Request:', {
      url: config.url,
      hasToken: !!token,
      headers: config.headers
    });
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
budgetApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      console.error('❌ 403 Forbidden - Authorization failed:', {
        url: error.config?.url,
        token: !!getAccessToken(),
        error: error.response?.data
      });
    }
    return Promise.reject(error);
  }
);

export default budgetApi;