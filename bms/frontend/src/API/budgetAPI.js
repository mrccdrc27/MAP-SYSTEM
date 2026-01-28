// File: frontendside/src/API/budgetAPI.js
import axios from 'axios';
import { getAccessToken } from './TokenUtils';

const budgetApi = axios.create({ 
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api', 
  // CRITICAL: Enable credentials to send cookies cross-origin
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add interceptor to include JWT token in requests
budgetApi.interceptors.request.use(
  (config) => {
    // CRITICAL FIX: Try to get token from localStorage first
    // This handles both cookie-based and token-based auth
    const token = getAccessToken();
    
    if (token) {
      // Explicitly set the Authorization header
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 Using Bearer token from localStorage');
    } else {
      // If no token in localStorage, cookies will be sent via withCredentials
      console.log('🔑 No localStorage token, relying on HttpOnly cookies');
    }
    
    // Log for debugging (remove in production)
    console.log('🔑 BMS API Request:', {
      url: config.url,
      hasToken: !!token,
      withCredentials: config.withCredentials,
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
        hasLocalToken: !!getAccessToken(),
        withCredentials: error.config?.withCredentials,
        error: error.response?.data
      });
      
      // If we get 403, it might be because cookies aren't working
      // Try to help debug
      console.error('🍪 Cookie debug:', {
        allCookies: document.cookie,
        hasAccessCookie: document.cookie.includes('access_token')
      });
    }
    return Promise.reject(error);
  }
);

export default budgetApi;