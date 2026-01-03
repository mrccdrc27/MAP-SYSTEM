// API Configuration
// Base URL can be configured via environment variable or defaults to relative path
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// User type constants
export const USER_TYPES = {
  STAFF: 'staff',
  EMPLOYEE: 'employee',
};

// API Endpoints - Staff (Admin/Staff users)
export const STAFF_ENDPOINTS = {
  LOGIN: '/api/v1/users/login/api/',
  VERIFY_OTP: '/api/v1/users/login/verify-otp/',
  REGISTER: '/api/v1/users/register/',
  LOGOUT: '/api/v1/users/logout/',
  TOKEN_REFRESH: '/api/v1/users/token/refresh/',
  TOKEN_VALIDATE: '/api/v1/users/token/validate/',
  ME: '/api/v1/users/me/',
  PROFILE: '/api/v1/users/profile/',
  FORGOT_PASSWORD: '/api/v1/users/password/forgot/',
  RESET_PASSWORD: '/api/v1/users/password/reset/',
  CHANGE_PASSWORD: '/api/v1/users/change-password/',
  VERIFY_PASSWORD: '/api/v1/users/verify-password/',
  REQUEST_OTP: '/api/v1/users/2fa/request-otp/',
  ENABLE_2FA: '/api/v1/users/2fa/enable/',
  DISABLE_2FA: '/api/v1/users/2fa/disable/',
};

// API Endpoints - Employee (HDTS Employee users)
export const EMPLOYEE_ENDPOINTS = {
  LOGIN: '/api/v1/hdts/employees/api/login/',
  VERIFY_OTP: '/api/v1/hdts/employees/api/2fa/verify-otp/',
  REGISTER: '/api/v1/hdts/employees/api/register/',
  LOGOUT: '/api/v1/hdts/employees/api/logout/',
  TOKEN_REFRESH: '/api/v1/hdts/employees/api/token/refresh/',
  PROFILE: '/api/v1/hdts/employees/api/profile/',
  ME: '/api/v1/hdts/employees/api/me/',
  FORGOT_PASSWORD: '/api/v1/hdts/employees/api/password/forgot/',
  RESET_PASSWORD: '/api/v1/hdts/employees/api/password/reset/',
  CHANGE_PASSWORD: '/api/v1/hdts/employees/api/profile/change-password/',
  REQUEST_OTP: '/api/v1/hdts/employees/api/2fa/request-otp/',
  ENABLE_2FA: '/api/v1/hdts/employees/api/2fa/enable/',
  DISABLE_2FA: '/api/v1/hdts/employees/api/2fa/disable/',
};

// Legacy API_ENDPOINTS for backward compatibility (defaults to staff)
export const API_ENDPOINTS = STAFF_ENDPOINTS;

// Get endpoints based on user type
export const getEndpoints = (userType = USER_TYPES.STAFF) => {
  return userType === USER_TYPES.EMPLOYEE ? EMPLOYEE_ENDPOINTS : STAFF_ENDPOINTS;
};

// Helper function to build full URL
export const buildUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

// Get CSRF token from cookie
export const getCSRFToken = () => {
  const name = 'csrftoken';
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
};

// Get user type from sessionStorage
export const getUserType = () => {
  return sessionStorage.getItem('user_type') || USER_TYPES.STAFF;
};

// Set user type in sessionStorage
export const setUserType = (type) => {
  sessionStorage.setItem('user_type', type);
};

// Clear auth state (sessionStorage only, cookies handled by backend)
export const clearAuthState = () => {
  sessionStorage.removeItem('user_type');
};

// Global auth state listener for 401 handling
let onUnauthorizedCallback = null;

export const setOnUnauthorizedCallback = (callback) => {
  onUnauthorizedCallback = callback;
};

export const triggerUnauthorized = () => {
  if (onUnauthorizedCallback) {
    onUnauthorizedCallback();
  }
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
      
      // Refresh failed - return unauthorized response (don't trigger global handler for initial auth check)
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

export default {
  API_ENDPOINTS,
  buildUrl,
  getCSRFToken,
  getUserType,
  setUserType,
  clearAuthState,
  getDefaultHeaders,
  apiRequest,
};
