import axios from 'axios';
import { getUserType, clearAuthState } from '../utils/storage';
import { getCSRFToken } from '../utils/csrf';
import { getEndpoints, STAFF_ENDPOINTS, EMPLOYEE_ENDPOINTS } from './endpoints';
import { USER_TYPES } from '../utils/constants';

// API Base URL - leave empty to use relative paths (for same-origin)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Include cookies
});

// Global auth state listener for 401 handling
let onUnauthorizedCallback = null;

export const setOnUnauthorizedCallback = (callback) => {
  onUnauthorizedCallback = callback;
};

// Helper function to build full URL (kept for backward compatibility)
export const buildUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

// Request interceptor - add headers
api.interceptors.request.use(
  (config) => {
    // Set default Content-Type for non-FormData requests
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }
    // For FormData, axios automatically sets the correct Content-Type with boundary
    
    // Add CSRF token
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle 401 and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Skip token refresh for login-related endpoints (login, refresh, me during login flow)
    const isLoginRelated = originalRequest.url.includes('login') || 
                           originalRequest.url.includes('refresh') ||
                           originalRequest.url.includes('register');
    
    // Handle 401 Unauthorized - Attempt Refresh (only for authenticated requests, not login flow)
    if (error.response?.status === 401 && !originalRequest._retry && !isLoginRelated) {
      originalRequest._retry = true;
      
      try {
        const userType = getUserType();
        const refreshEndpoint = userType === USER_TYPES.EMPLOYEE 
          ? EMPLOYEE_ENDPOINTS.TOKEN_REFRESH 
          : STAFF_ENDPOINTS.TOKEN_REFRESH;
        
        const refreshResponse = await api.post(refreshEndpoint);
        
        if (refreshResponse.status === 200) {
          // Retry original request
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }
      
      // Refresh failed - trigger unauthorized callback
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }
    
    return Promise.reject(error);
  }
);

// Default headers helper (kept for backward compatibility)
export const getDefaultHeaders = (includeAuth = false) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  const csrfToken = getCSRFToken();
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }
  
  return headers;
};

// API request helper - wraps axios with consistent response format
export const apiRequest = async (endpoint, options = {}) => {
  const { method = 'GET', body, headers = {}, ...rest } = options;
  
  try {
    const config = {
      url: endpoint,
      method,
      headers,
      ...rest,
    };
    
    // Handle body/data
    if (body) {
      config.data = body;
    }
    
    const response = await api(config);
    
    return {
      ok: true,
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    console.error('API Request Error:', error);
    
    if (error.response) {
      // Server responded with error status
      return {
        ok: false,
        status: error.response.status,
        data: error.response.data,
      };
    }
    
    // Network error or other issue
    return {
      ok: false,
      status: 0,
      data: { error: error.message || 'Network error' },
    };
  }
};

// Export axios instance for direct use if needed
export { api };
export default api;
