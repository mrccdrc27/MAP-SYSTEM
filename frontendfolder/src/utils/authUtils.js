// Authentication utilities for local development
import { USE_LOCAL_API } from '../config/environment.js';
import { STORAGE_KEYS, getFromStorage, setToStorage } from '../mock-data/localStorage.js';

// Mock tokens for local development
const MOCK_TOKENS = {
  employee: 'mock_employee_token_12345',
  admin: 'mock_admin_token_12345'
};

// Get authentication token with local development bypass
export const getAuthToken = (role = 'employee') => {
  if (USE_LOCAL_API) {
    // For local development, return mock tokens
    console.log(`🔓 Local dev: Using mock ${role} token`);
    return MOCK_TOKENS[role] || MOCK_TOKENS.employee;
  } else {
    // Original backend token logic
    const tokenKey = role === 'admin' ? 'admin_access_token' : 'employee_access_token';
    return localStorage.getItem(tokenKey);
  }
};

// Check if user is authenticated with local development bypass
export const isAuthenticated = (role = 'employee') => {
  if (USE_LOCAL_API) {
    // For local development, always return true
    console.log(`🔓 Local dev: Authentication bypassed for ${role}`);
    return true;
  } else {
    // Original backend authentication check
    const token = getAuthToken(role);
    return !!token;
  }
};

// Get current user with local development data
export const getCurrentUser = () => {
  if (USE_LOCAL_API) {
    // Return mock user data for local development
    const currentUser = getFromStorage(STORAGE_KEYS.CURRENT_USER);
    if (!currentUser) {
      // Set default user if none exists
      const defaultUser = {
        id: 1,
        email: "john.doe@company.com",
        company_id: "EMP001",
        first_name: "John",
        middle_name: "Michael",
        last_name: "Doe",
        suffix: "Jr.",
        department: "IT",
        role: "Developer",
        status: "approved",
        date_joined: "2024-01-15",
        profile_image: "/public/default-profile.png"
      };
      setToStorage(STORAGE_KEYS.CURRENT_USER, defaultUser);
      return defaultUser;
    }
    return currentUser;
  } else {
    // Original backend user logic would go here
    return getFromStorage(STORAGE_KEYS.CURRENT_USER);
  }
};

// Set authentication tokens for local development
export const setAuthTokens = (userRole = 'employee') => {
  if (USE_LOCAL_API) {
    // Set mock tokens for local development
    const tokenKey = userRole === 'admin' ? 'admin_access_token' : 'employee_access_token';
    localStorage.setItem(tokenKey, MOCK_TOKENS[userRole]);
    localStorage.setItem(`${userRole}_refresh_token`, `mock_${userRole}_refresh_token`);
    console.log(`🔓 Local dev: Mock ${userRole} tokens set`);
  }
};

// Initialize local development authentication
export const initializeLocalAuth = () => {
  if (USE_LOCAL_API) {
    // Automatically set authentication tokens for seamless development
    setAuthTokens('employee');
    setAuthTokens('admin');
    
    // Set a default current user
    const currentUser = getCurrentUser();
    console.log('🔓 Local development authentication initialized with user:', currentUser);
  }
};

// Logout utility
export const logout = () => {
  if (USE_LOCAL_API) {
    // For local development, just clear current user but keep mock tokens for easy access
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER.replace('hdts_', ''));
    try {
      localStorage.removeItem('chatbotMessages');
    } catch (e) {}
    console.log('🔓 Local dev: User logged out (tokens preserved for easy re-access)');
  } else {
    // Original logout logic
    localStorage.removeItem('employee_access_token');
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('employee_refresh_token');
    localStorage.removeItem('admin_refresh_token');
    try {
      localStorage.removeItem('chatbotMessages');
    } catch (e) {}
  }
};
