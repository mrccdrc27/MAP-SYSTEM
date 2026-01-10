import { apiRequest, api } from './api';
import { getEndpoints, STAFF_ENDPOINTS, EMPLOYEE_ENDPOINTS } from './endpoints';
import { setUserType, getUserType, clearAuthState } from '../utils/storage';
import { USER_TYPES } from '../utils/constants';
import { getCSRFToken } from '../utils/csrf';

/**
 * Auth Service
 * Handles login, logout, registration, and MFA logic
 */

// Login with email and password
export const login = async (email, password, userType = USER_TYPES.STAFF, recaptchaResponse = '') => {
  const endpoints = getEndpoints(userType);
  // Ensure CSRF cookie is present for views requiring it (Django session auth)
  try {
    if (!getCSRFToken()) {
      // Attempt a harmless GET to the ME endpoint to set CSRF cookie via Set-Cookie
      await api.get(endpoints.ME);
    }
  } catch (err) {
    // Ignore errors - this is just to obtain CSRF cookie if backend sets it on GET
    // eslint-disable-next-line no-console
    console.debug('CSRF preflight request failed (safe to ignore):', err?.message || err);
  }
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
export const verifyOtpLogin = async (temporaryToken, otpCode, userType = null) => {
  const type = userType || getUserType();
  const endpoints = getEndpoints(type);
  const response = await apiRequest(endpoints.VERIFY_OTP, {
    method: 'POST',
    body: JSON.stringify({
      temporary_token: temporaryToken,
      otp_code: otpCode,
    }),
  });
  
  if (response.ok) {
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
  const type = getUserType();
  const endpoints = getEndpoints(type);
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
  const endpoints = getEndpoints(getUserType());
  return await apiRequest(endpoints.TOKEN_REFRESH, {
    method: 'POST',
  });
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

// Request OTP for enabling 2FA
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

export default {
  login,
  verifyOtpLogin,
  register,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  requestOtp,
  enable2FA,
  disable2FA,
};
