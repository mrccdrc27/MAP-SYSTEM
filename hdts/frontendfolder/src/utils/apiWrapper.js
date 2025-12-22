// API wrapper that handles authentication for local vs backend
import { USE_LOCAL_API } from '../config/environment.js';
import { getAuthToken } from './authUtils.js';
import axios from 'axios';

// Create axios instance with interceptors
const apiClient = axios.create({
  timeout: 10000
});

// Request interceptor to add auth headers
apiClient.interceptors.request.use(
  (config) => {
    if (USE_LOCAL_API) {
      // For local development, add mock headers
      config.headers['Authorization'] = `Bearer ${getAuthToken()}`;
      config.headers['X-Local-Development'] = 'true';
      console.log('🔓 Local API call:', config.method?.toUpperCase(), config.url);
    } else {
      // For backend API, add real tokens
      const token = getAuthToken();
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (USE_LOCAL_API) {
      // For local development, provide helpful error messages
      console.error('🔓 Local API error:', error.message);
    } else {
      // Handle backend API errors
      if (error.response?.status === 401) {
        // Instead of redirecting here, dispatch a global event so the UI
        // can show a modal and let the user confirm before going to login.
        try {
          window.dispatchEvent(new CustomEvent('auth:expired'));
        } catch (e) {
          // Fallback: clear storage and redirect
          localStorage.clear();
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Utility functions for common API patterns
export const apiWrapper = {
  // GET request with authentication
  get: async (url, config = {}) => {
    return apiClient.get(url, config);
  },

  // POST request with authentication
  post: async (url, data, config = {}) => {
    return apiClient.post(url, data, config);
  },

  // PUT request with authentication
  put: async (url, data, config = {}) => {
    return apiClient.put(url, data, config);
  },

  // DELETE request with authentication
  delete: async (url, config = {}) => {
    return apiClient.delete(url, config);
  },

  // Upload file with authentication
  upload: async (url, formData, onUploadProgress) => {
    if (USE_LOCAL_API) {
      // For local development, simulate file upload
      console.log('🔓 Local dev: File upload simulated');
      return Promise.resolve({ data: { success: true, message: 'File upload simulated' } });
    }
    
    return apiClient.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress
    });
  }
};

export default apiClient;
