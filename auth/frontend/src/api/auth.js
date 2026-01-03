import { 
  apiRequest, 
  clearAuthState, 
  getEndpoints,
  getUserType,
  setUserType,
  USER_TYPES,
  STAFF_ENDPOINTS,
  EMPLOYEE_ENDPOINTS 
} from './config';

// Re-export for convenience
export { getUserType, setUserType };

// Login with email and password
export const login = async (email, password, userType = USER_TYPES.STAFF, recaptchaResponse = '') => {
  const endpoints = getEndpoints(userType);
  const response = await apiRequest(endpoints.LOGIN, {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      g_recaptcha_response: recaptchaResponse,
    }),
  });
  
  if (response.ok) {
    // JWT tokens are set as HttpOnly cookies by the backend
    setUserType(userType);
  }
  
  return response;
};

// Verify OTP for login
export const verifyOtpLogin = async (email, otpCode, userType = null) => {
  const type = userType || getUserType();
  const endpoints = getEndpoints(type);
  const response = await apiRequest(endpoints.VERIFY_OTP, {
    method: 'POST',
    body: JSON.stringify({
      email,
      otp_code: otpCode,
    }),
  });
  
  if (response.ok) {
    // JWT tokens are set as HttpOnly cookies by the backend
    setUserType(type);
  }
  
  return response;
};

// Register new user
export const register = async (userData, userType = USER_TYPES.STAFF) => {
  const endpoints = getEndpoints(userType);
  return await apiRequest(endpoints.REGISTER, {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

// Logout
export const logout = async () => {
  const endpoints = getEndpoints(getUserType());
  const response = await apiRequest(endpoints.LOGOUT, {
    method: 'POST',
    includeAuth: true,
  });
  
  // Clear client-side auth state (cookies cleared by backend)
  clearAuthState();
  return response;
};

// Refresh token
export const refreshToken = async () => {
  // Refresh token is in HttpOnly cookie, backend handles it
  const endpoints = getEndpoints(getUserType());
  const response = await apiRequest(endpoints.TOKEN_REFRESH, {
    method: 'POST',
  });
  
  return response;
};

// Validate token (only available for staff)
export const validateToken = async () => {
  const userType = getUserType();
  if (userType === USER_TYPES.EMPLOYEE) {
    // For employees, try to get profile instead
    return await getProfile();
  }
  return await apiRequest(STAFF_ENDPOINTS.TOKEN_VALIDATE, {
    method: 'GET',
    includeAuth: true,
  });
};

// Get current authenticated user (/api/me)
// This is the primary way to check if user is authenticated
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
    options.headers = {};
  } else {
    options.body = JSON.stringify(profileData);
  }
  
  return await apiRequest(endpoints.PROFILE, options);
};

// Forgot password
export const forgotPassword = async (email, userType = USER_TYPES.STAFF) => {
  const endpoints = getEndpoints(userType);
  return await apiRequest(endpoints.FORGOT_PASSWORD, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
};

// Reset password
export const resetPassword = async (token, password, confirmPassword, userType = USER_TYPES.STAFF) => {
  const endpoints = getEndpoints(userType);
  return await apiRequest(endpoints.RESET_PASSWORD, {
    method: 'POST',
    body: JSON.stringify({
      token,
      password,
      confirm_password: confirmPassword,
    }),
  });
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

// Request OTP
export const requestOtp = async () => {
  const endpoints = getEndpoints(getUserType());
  return await apiRequest(endpoints.REQUEST_OTP, {
    method: 'POST',
    includeAuth: true,
  });
};

// Enable 2FA
export const enable2FA = async (otpCode) => {
  const endpoints = getEndpoints(getUserType());
  return await apiRequest(endpoints.ENABLE_2FA, {
    method: 'POST',
    includeAuth: true,
    body: JSON.stringify({ otp_code: otpCode }),
  });
};

// Disable 2FA
export const disable2FA = async (otpCode) => {
  const endpoints = getEndpoints(getUserType());
  return await apiRequest(endpoints.DISABLE_2FA, {
    method: 'POST',
    includeAuth: true,
    body: JSON.stringify({ otp_code: otpCode }),
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

// Get agents/users for a specific system
export const getSystemAgents = async (systemSlug) => {
  return await apiRequest(`/api/v1/system-roles/systems/${systemSlug}/users/`, {
    method: 'GET',
    includeAuth: true,
  });
};

// Get all user system roles
export const getUserSystemRoles = async () => {
  return await apiRequest('/api/v1/system-roles/user-system-roles/', {
    method: 'GET',
    includeAuth: true,
  });
};

// Update a user's system role
export const updateUserSystemRole = async (roleId, data) => {
  return await apiRequest(`/api/v1/system-roles/user-system-roles/${roleId}/`, {
    method: 'PATCH',
    includeAuth: true,
    body: JSON.stringify(data),
  });
};

// Delete a user's system role
export const deleteUserSystemRole = async (roleId) => {
  return await apiRequest(`/api/v1/system-roles/user-system-roles/${roleId}/`, {
    method: 'DELETE',
    includeAuth: true,
  });
};

// Invite a user to a system
export const inviteAgent = async (inviteData) => {
  return await apiRequest('/api/v1/system-roles/invite/', {
    method: 'POST',
    includeAuth: true,
    body: JSON.stringify(inviteData),
  });
};

// Get all systems
export const getAllSystems = async () => {
  return await apiRequest('/api/v1/systems/', {
    method: 'GET',
    includeAuth: true,
  });
};

// Get roles for a specific system
export const getSystemRoles = async (systemSlug) => {
  return await apiRequest(`/api/v1/roles/?system=${systemSlug}`, {
    method: 'GET',
    includeAuth: true,
  });
};

// Create a new role
export const createRole = async (roleData) => {
  return await apiRequest('/api/v1/roles/', {
    method: 'POST',
    includeAuth: true,
    body: JSON.stringify(roleData),
  });
};

// Update a role
export const updateRole = async (roleId, roleData) => {
  return await apiRequest(`/api/v1/roles/${roleId}/`, {
    method: 'PATCH',
    includeAuth: true,
    body: JSON.stringify(roleData),
  });
};

// Delete a role
export const deleteRole = async (roleId) => {
  return await apiRequest(`/api/v1/roles/${roleId}/`, {
    method: 'DELETE',
    includeAuth: true,
  });
};

// Update user profile by admin
export const updateUserByAdmin = async (userId, userData) => {
  return await apiRequest(`/api/v1/users/${userId}/`, {
    method: 'PATCH',
    includeAuth: true,
    body: JSON.stringify(userData),
  });
};

export default {
  login,
  verifyOtpLogin,
  register,
  logout,
  refreshToken,
  validateToken,
  getMe,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyPassword,
  requestOtp,
  enable2FA,
  disable2FA,
  getUserSystems,
  selectSystem,
};
