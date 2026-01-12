import { USER_TYPES } from '../utils/constants';

// Detect if we're going through Kong (has /auth prefix) or direct to auth service
// Kong is used when accessing via the API gateway (port 8080 or api.ticketing domain)
const API_URL = import.meta.env.VITE_API_BASE_URL || '';
const USE_KONG = API_URL.includes('8080') || API_URL.includes('api.ticketing') || API_URL.includes('api.') || false;
const AUTH_PREFIX = USE_KONG ? '/auth' : '';

// API Endpoints - Staff (Admin/Staff users)
export const STAFF_ENDPOINTS = {
  LOGIN: `${AUTH_PREFIX}/api/v1/users/login/api/`,
  VERIFY_OTP: `${AUTH_PREFIX}/api/v1/users/login/verify-otp/`,
  REGISTER: `${AUTH_PREFIX}/api/v1/users/register/`,
  LOGOUT: `${AUTH_PREFIX}/api/v1/users/logout/`,
  TOKEN_REFRESH: `${AUTH_PREFIX}/api/v1/users/token/refresh/`,
  TOKEN_VALIDATE: `${AUTH_PREFIX}/api/v1/users/token/validate/`,
  ME: `${AUTH_PREFIX}/api/v1/users/me/`,
  PROFILE: `${AUTH_PREFIX}/api/v1/users/profile/`,
  FORGOT_PASSWORD: `${AUTH_PREFIX}/api/v1/users/password/forgot/`,
  RESET_PASSWORD: `${AUTH_PREFIX}/api/v1/users/password/reset/`,
  CHANGE_PASSWORD: `${AUTH_PREFIX}/api/v1/users/change-password/`,
  VERIFY_PASSWORD: `${AUTH_PREFIX}/api/v1/users/verify-password/`,
  REQUEST_OTP: `${AUTH_PREFIX}/api/v1/users/2fa/request-otp/`,
  ENABLE_2FA: `${AUTH_PREFIX}/api/v1/users/2fa/enable/`,
  DISABLE_2FA: `${AUTH_PREFIX}/api/v1/users/2fa/disable/`,
};

// API Endpoints - Employee (HDTS Employee users)
export const EMPLOYEE_ENDPOINTS = {
  LOGIN: `${AUTH_PREFIX}/api/v1/hdts/employees/api/login/`,
  VERIFY_OTP: `${AUTH_PREFIX}/api/v1/hdts/employees/api/2fa/verify-otp/`,
  REGISTER: `${AUTH_PREFIX}/api/v1/hdts/employees/api/register/`,
  LOGOUT: `${AUTH_PREFIX}/api/v1/hdts/employees/api/logout/`,
  TOKEN_REFRESH: `${AUTH_PREFIX}/api/v1/hdts/employees/api/token/refresh/`,
  PROFILE: `${AUTH_PREFIX}/api/v1/hdts/employees/api/profile/`,
  ME: `${AUTH_PREFIX}/api/v1/hdts/employees/api/me/`,
  FORGOT_PASSWORD: `${AUTH_PREFIX}/api/v1/hdts/employees/api/password/forgot/`,
  RESET_PASSWORD: `${AUTH_PREFIX}/api/v1/hdts/employees/api/password/reset/`,
  CHANGE_PASSWORD: `${AUTH_PREFIX}/api/v1/hdts/employees/api/profile/change-password/`,
  VERIFY_PASSWORD: `${AUTH_PREFIX}/api/v1/hdts/employees/api/profile/verify-password/`,
  REQUEST_OTP: `${AUTH_PREFIX}/api/v1/hdts/employees/api/2fa/request-otp/`,
  ENABLE_2FA: `${AUTH_PREFIX}/api/v1/hdts/employees/api/2fa/enable/`,
  DISABLE_2FA: `${AUTH_PREFIX}/api/v1/hdts/employees/api/2fa/disable/`,
};

// Get endpoints based on user type
export const getEndpoints = (userType = USER_TYPES.STAFF) => {
  return userType === USER_TYPES.EMPLOYEE ? EMPLOYEE_ENDPOINTS : STAFF_ENDPOINTS;
};

// Unified ME endpoint for checking authentication status
// Note: /api/me/ is a special unified endpoint that works without /api/v1/users prefix
export const UNIFIED_ME = USE_KONG ? `${AUTH_PREFIX}/api/v1/users/me/` : '/api/me/';
