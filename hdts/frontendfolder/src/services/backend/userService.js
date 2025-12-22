// Backend user service (auth users)
import { API_CONFIG } from '../../config/environment.js';

// Prefer the AUTH service base URL for user endpoints (auth app serves /api/v1/users/)
const AUTH_BASE = API_CONFIG.AUTH.BASE_URL || API_CONFIG.BACKEND.BASE_URL;

const getAuthHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  let token = null;
  try { token = localStorage.getItem('access_token') || null; } catch (e) { token = null; }
  if (!token && typeof document !== 'undefined' && document.cookie) {
    try {
      const match = document.cookie.match(/(?:^|; )access_token=([^;]+)/);
      if (match && match[1]) token = decodeURIComponent(match[1]);
    } catch (e) {}
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
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
        const response = await fetch(url, {
          method: 'GET',
          headers: getAuthHeaders(),
          credentials: 'include',
        });
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
        const response = await fetch(url, {
          method: 'GET',
          headers: getAuthHeaders(),
          credentials: 'include',
        });
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
        const response = await fetch(url, {
          method: 'GET',
          headers: getAuthHeaders(),
          credentials: 'include',
        });
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
        const response = await fetch(url, {
          method: 'GET',
          headers: getAuthHeaders(),
          credentials: 'include',
        });
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
