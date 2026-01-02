// Backend user service (auth users)
import { API_CONFIG } from '../../config/environment.js';

// Prefer the AUTH service base URL for user endpoints (auth app serves /api/v1/users/)
const AUTH_BASE = API_CONFIG.AUTH.BASE_URL || API_CONFIG.BACKEND.BASE_URL;

// Helper function to get fetch options with proper cookie-based authentication
const getFetchOptions = (method = 'GET', body = null) => {
  const options = {
    method,
    credentials: 'include', // Essential for httpOnly cookie-based auth
    headers: { 'Content-Type': 'application/json' },
  };
  
  if (body) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  
  return options;
};

const handleAuthError = (response) => {
  if (response.status === 401) {
    window.location.href = '/';
    throw new Error('Session expired. Please log in again.');
  }
};

export const backendUserService = {
  async getAllUsers() {
    // Try the auth service (v1) first, then fall back to /api/users/ on the backend base
    const candidates = [
      `${AUTH_BASE.replace(/\/$/, '')}/api/v1/users/`,
      `${AUTH_BASE.replace(/\/$/, '')}/api/users/`,
    ];

    for (const url of candidates) {
      try {
        const response = await fetch(url, getFetchOptions());
        handleAuthError(response);
        if (!response.ok) {
          // try next candidate on 404/other errors
          const err = await response.text().catch(() => '');
          console.warn('UserService: request failed', url, response.status, err);
          continue;
        }
        return await response.json();
      } catch (error) {
        console.warn('UserService: error fetching', url, error);
        // try next candidate
      }
    }

    const err = new Error('Failed to fetch users');
    console.error('Error fetching users:', err);
    throw err;
  }
,
  async getPendingHdtsUsers() {
    const candidates = [
      `${AUTH_BASE.replace(/\/$/, '')}/api/v1/hdts/user-management/pending/api/`,
      `${AUTH_BASE.replace(/\/$/, '')}/api/v1/hdts/user-management/pending/`,
    ];

    for (const url of candidates) {
      try {
        const response = await fetch(url, getFetchOptions());
        handleAuthError(response);
        if (!response.ok) {
          const txt = await response.text().catch(() => '');
          console.warn('UserService.pending: request failed', url, response.status, txt);
          continue;
        }
        return await response.json();
      } catch (err) {
        console.warn('UserService.pending: error fetching', url, err);
      }
    }
    throw new Error('Failed to fetch pending hdts users');
  },

  async getAllHdtsUsers() {
    const candidates = [
      `${AUTH_BASE.replace(/\/$/, '')}/api/v1/hdts/user-management/users/api/`,
      `${AUTH_BASE.replace(/\/$/, '')}/api/v1/hdts/user-management/users/`,
    ];

    for (const url of candidates) {
      try {
        const response = await fetch(url, getFetchOptions());
        handleAuthError(response);
        if (!response.ok) {
          const txt = await response.text().catch(() => '');
          console.warn('UserService.hdts: request failed', url, response.status, txt);
          continue;
        }
        return await response.json();
      } catch (err) {
        console.warn('UserService.hdts: error fetching', url, err);
      }
    }
    throw new Error('Failed to fetch hdts users');
  }
,
  async getUserByCompanyId(companyId) {
    const encoded = encodeURIComponent(String(companyId));
    const candidates = [
      `${AUTH_BASE.replace(/\/$/, '')}/api/v1/users/profile/by-company/${encoded}/`,
      `${AUTH_BASE.replace(/\/$/, '')}/api/v1/users/profile/by-company/${encoded}`,
    ];

    for (const url of candidates) {
      try {
        const response = await fetch(url, getFetchOptions());
        handleAuthError(response);
        if (!response.ok) {
          const txt = await response.text().catch(() => '');
          console.warn('UserService.getUserByCompanyId: request failed', url, response.status, txt);
          continue;
        }
        return await response.json();
      } catch (err) {
        console.warn('UserService.getUserByCompanyId: error fetching', url, err);
      }
    }

    // If none succeeded, return null to let caller fallback
    return null;
  }
};
