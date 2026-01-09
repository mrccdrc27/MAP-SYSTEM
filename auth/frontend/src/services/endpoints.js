import { USER_TYPES } from '../utils/constants';

// Detect if we're going through Kong (has /auth prefix) or direct to auth service
const USE_KONG = import.meta.env.VITE_API_BASE_URL?.includes('8080') || false;
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
  LOGIN: '/auth/api/v1/hdts/employees/api/login/',
  VERIFY_OTP: '/auth/api/v1/hdts/employees/api/2fa/verify-otp/',
  REGISTER: '/auth/api/v1/hdts/employees/api/register/',
  LOGOUT: '/auth/api/v1/hdts/employees/api/logout/',
  TOKEN_REFRESH: '/auth/api/v1/hdts/employees/api/token/refresh/',
  PROFILE: '/auth/api/v1/hdts/employees/api/profile/',
  ME: '/auth/api/v1/hdts/employees/api/me/',
  FORGOT_PASSWORD: '/auth/api/v1/hdts/employees/api/password/forgot/',
  RESET_PASSWORD: '/auth/api/v1/hdts/employees/api/password/reset/',
  CHANGE_PASSWORD: '/auth/api/v1/hdts/employees/api/profile/change-password/',
  REQUEST_OTP: '/auth/api/v1/hdts/employees/api/2fa/request-otp/',
  ENABLE_2FA: '/auth/api/v1/hdts/employees/api/2fa/enable/',
  DISABLE_2FA: '/auth/api/v1/hdts/employees/api/2fa/disable/',
};

// Get endpoints based on user type
export const getEndpoints = (userType = USER_TYPES.STAFF) => {
  return userType === USER_TYPES.EMPLOYEE ? EMPLOYEE_ENDPOINTS : STAFF_ENDPOINTS;
};
