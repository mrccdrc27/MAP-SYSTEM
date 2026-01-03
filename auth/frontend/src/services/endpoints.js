import { USER_TYPES } from '../utils/constants';

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

// Get endpoints based on user type
export const getEndpoints = (userType = USER_TYPES.STAFF) => {
  return userType === USER_TYPES.EMPLOYEE ? EMPLOYEE_ENDPOINTS : STAFF_ENDPOINTS;
};
