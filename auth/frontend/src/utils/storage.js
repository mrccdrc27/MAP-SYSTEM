import { USER_TYPES } from './constants';

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
