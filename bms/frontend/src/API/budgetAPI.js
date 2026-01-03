// File: frontendside/src/API/budgetAPI.js
import axios from 'axios';
import { getAccessToken } from './TokenUtils';

// BMS Budget Service API URL (not auth service)
const budgetApi = axios.create({ 
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8001/api',
  withCredentials: true, 
});

// Add interceptor to include JWT token in requests
budgetApi.interceptors.request.use(
  (config) => {
    // Note: With Central Auth using cookies, we might not need to manually attach the header
    // if the cookie is being sent via withCredentials.
    // However, if we are in a transition phase, we can keep this check.
    
    // For cookie-based auth, we rely on the browser sending the cookie.
    // We don't necessarily need to read it and attach it as a header unless the backend specifically demands Bearer header.
    // Central Auth backend usually checks cookies first.
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default budgetApi;