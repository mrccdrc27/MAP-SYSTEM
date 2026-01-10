// bms\frontend\src\API\TokenUtils.js
/**
 * Utility functions for working with JWT authentication tokens
 * Matches TTS frontend pattern for centralized auth integration
 */

/**
 * Check if access token exists in local storage or cookies
 * @returns {boolean} True if access token exists
 */
export const hasAccessToken = () => {
  // Check localStorage first (using same key as TTS)
  if (localStorage.getItem('accessToken')) {
    return true;
  }

  // Fall back to checking cookies
  return document.cookie
    .split('; ')
    .some(row => row.startsWith('access_token='));
};

/**
 * Get access token from local storage or cookies
 * @returns {string|null} The access token or null if not found
 */
export const getAccessToken = () => {
  // First try localStorage (for API login endpoint)
  const localToken = localStorage.getItem('accessToken');
  if (localToken) {
    return localToken;
  }

  // ⚠️ HttpOnly cookies CANNOT be read by JavaScript
  // The browser will automatically send them with requests via withCredentials
  // Return null here - axios will use cookies automatically
  return null;
};

/**
 * Set access token in local storage
 * @param {string} token - The access token to store
 */
export const setAccessToken = (token) => {
  localStorage.setItem('accessToken', token);
};

/**
 * Remove access token from local storage and cookies (if possible)
 */
export const removeAccessToken = () => {
  // Remove from localStorage
  localStorage.removeItem('accessToken');
  
  // Also remove legacy key for backwards compatibility
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  
  // Try to expire the cookie
  // Note: This will only work if the cookie wasn't set with HttpOnly
  document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
};

/**
 * Parse the JWT token to extract payload data
 * @param {string} token - JWT token to decode
 * @returns {object|null} Decoded token payload or null if invalid
 */
export const parseJwt = (token) => {
  try {
    // Get the payload part of the JWT (second part)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error parsing JWT:', error);
    return null;
  }
};

/**
 * Check if user has a specific role for a specific system
 * @param {object} user - User object with roles array
 * @param {string} system - System name to check (e.g., 'bms', 'tts')
 * @param {string} roleName - Role name to check (e.g., 'ADMIN', 'FINANCE_HEAD')
 * @returns {boolean} True if user has the role for the system
 */
export const hasSystemRole = (user, system, roleName) => {
  if (!user || !user.roles || !Array.isArray(user.roles)) {
    return false;
  }
  
  return user.roles.some(role => 
    role.system?.toLowerCase() === system?.toLowerCase() && 
    role.role?.toUpperCase() === roleName?.toUpperCase()
  );
};

/**
 * Check if user has any role for a specific system
 * @param {object} user - User object with roles array
 * @param {string} system - System name to check
 * @returns {boolean} True if user has any role for the system
 */
export const hasAnySystemRole = (user, system) => {
  if (!user || !user.roles || !Array.isArray(user.roles)) {
    return false;
  }
  
  return user.roles.some(role => role.system?.toLowerCase() === system?.toLowerCase());
};

/**
 * Get user information from the JWT token
 * @returns {object|null} User information or null if no valid token
 */
export const getUserFromToken = () => {
  const token = getAccessToken();
  if (!token) return null;
  
  return parseJwt(token);
};

/**
 * Get the user's role for a specific system
 * @param {object} user - User object with roles array
 * @param {string} system - System name to check
 * @returns {string|null} The role name or null if no role found
 */
export const getSystemRole = (user, system) => {
  if (!user || !user.roles || !Array.isArray(user.roles)) {
    return null;
  }
  
  const roleEntry = user.roles.find(role => 
    role.system?.toLowerCase() === system?.toLowerCase()
  );
  
  return roleEntry ? roleEntry.role : null;
};

/**
 * Check if the token is expired
 * @param {string} token - JWT token to check
 * @returns {boolean} True if token is expired
 */
export const isTokenExpired = (token) => {
  const payload = parseJwt(token);
  if (!payload || !payload.exp) {
    return true;
  }
  
  // exp is in seconds, Date.now() is in milliseconds
  return payload.exp * 1000 < Date.now();
};
