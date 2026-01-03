import { apiRequest } from './api';
import { getEndpoints, STAFF_ENDPOINTS } from './endpoints';
import { getUserType } from '../utils/storage';
import { USER_TYPES } from '../utils/constants';

/**
 * User Service
 * Handles user profile, identity check, and account settings
 */

// Get current authenticated user (/api/me)
export const getMe = async () => {
  const endpoints = getEndpoints(getUserType());
  return await apiRequest(endpoints.ME, {
    method: 'GET',
  });
};

// Get user profile
export const getProfile = async () => {
  const endpoints = getEndpoints(getUserType());
  return await apiRequest(endpoints.PROFILE, {
    method: 'GET',
    includeAuth: true,
  });
};

// Update user profile
export const updateProfile = async (profileData, isFormData = false) => {
  const endpoints = getEndpoints(getUserType());
  const options = {
    method: 'PATCH',
    includeAuth: true,
  };
  
  if (isFormData) {
    options.body = profileData;
    // For FormData, let the browser set the Content-Type header with the boundary
    options.headers = {};
  } else {
    options.body = JSON.stringify(profileData);
  }
  
  return await apiRequest(endpoints.PROFILE, options);
};

// Change password (authenticated)
export const changePassword = async (currentPassword, newPassword, confirmPassword) => {
  const endpoints = getEndpoints(getUserType());
  return await apiRequest(endpoints.CHANGE_PASSWORD, {
    method: 'POST',
    includeAuth: true,
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    }),
  });
};

// Verify current password (staff only)
export const verifyPassword = async (password) => {
  return await apiRequest(STAFF_ENDPOINTS.VERIFY_PASSWORD, {
    method: 'POST',
    includeAuth: true,
    body: JSON.stringify({ password }),
  });
};

// Validate token (primarily for staff)
export const validateToken = async () => {
  const userType = getUserType();
  if (userType === USER_TYPES.EMPLOYEE) {
    return await getProfile();
  }
  return await apiRequest(STAFF_ENDPOINTS.TOKEN_VALIDATE, {
    method: 'GET',
    includeAuth: true,
  });
};

// Get user's available systems
export const getUserSystems = async () => {
  return await apiRequest('/api/v1/users/systems/', {
    method: 'GET',
    includeAuth: true,
  });
};

// Select a system
export const selectSystem = async (systemSlug) => {
  return await apiRequest('/api/v1/users/systems/select/', {
    method: 'POST',
    includeAuth: true,
    body: JSON.stringify({ system_slug: systemSlug }),
  });
};

export default {
  getMe,
  getProfile,
  updateProfile,
  changePassword,
  verifyPassword,
  validateToken,
  getUserSystems,
  selectSystem,
};
