import { getUserType, clearAuthState } from '../utils/storage';
import { getCSRFToken } from '../utils/csrf';
import { getEndpoints, STAFF_ENDPOINTS, EMPLOYEE_ENDPOINTS } from './endpoints';
import { USER_TYPES } from '../utils/constants';

// API Base URL - leave empty to use relative paths (for same-origin)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Helper function to build full URL
export const buildUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

// Global auth state listener for 401 handling
let onUnauthorizedCallback = null;

export const setOnUnauthorizedCallback = (callback) => {
  onUnauthorizedCallback = callback;
};

// Default headers for API requests
export const getDefaultHeaders = (includeAuth = false) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  const csrfToken = getCSRFToken();
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }
  
  // Auth is handled via HttpOnly cookies - browser includes them automatically
  // with credentials: 'include'
  
  return headers;
};

// API request helper
export const apiRequest = async (endpoint, options = {}) => {
  const url = buildUrl(endpoint);
  const { includeAuth = false, ...fetchOptions } = options;
  
  const defaultOptions = {
    headers: getDefaultHeaders(includeAuth),
    credentials: 'include', // Include cookies
  };
  
  const mergedOptions = {
    ...defaultOptions,
    ...fetchOptions,
    headers: {
      ...defaultOptions.headers,
      ...fetchOptions.headers,
    },
  };
  
  try {
    let response = await fetch(url, mergedOptions);
    
    // Handle 401 Unauthorized - Attempt Refresh (but not for refresh endpoint itself)
    if (response.status === 401 && !options._retry && !endpoint.includes('refresh')) {
      try {
        // Determine user type for correct refresh endpoint
        const userType = getUserType();
        const refreshEndpoint = userType === USER_TYPES.EMPLOYEE 
          ? EMPLOYEE_ENDPOINTS.TOKEN_REFRESH 
          : STAFF_ENDPOINTS.TOKEN_REFRESH;
          
        // Attempt refresh
        const refreshResponse = await fetch(buildUrl(refreshEndpoint), {
          method: 'POST',
          headers: getDefaultHeaders(false),
          credentials: 'include'
        });
        
        if (refreshResponse.ok) {
          // Retry original request
          const retryOptions = { ...options, _retry: true };
          return apiRequest(endpoint, retryOptions);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }
      
      // Refresh failed - trigger unauthorized callback if set
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }

      // Return unauthorized response
      const data = await response.json().catch(() => ({}));
      return {
        ok: false,
        status: 401,
        data,
      };
    }

    const data = await response.json().catch(() => ({}));
    
    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch (error) {
    console.error('API Request Error:', error);
    // Return a proper error response instead of throwing
    return {
      ok: false,
      status: 0,
      data: { error: error.message },
    };
  }
};
