// Auth service user API client
import { API_CONFIG } from '../../config/environment.js';

const AUTH_BASE_URL = API_CONFIG.AUTH.BASE_URL;

// Helper function to get headers for cookie-based auth
const getAuthHeaders = () => {
  // Try to get the access token from cookies (set by auth service)
  const cookies = document.cookie.split(';');
  const accessTokenCookie = cookies.find(c => c.trim().startsWith('access_token='));
  const accessToken = accessTokenCookie ? accessTokenCookie.split('=')[1] : null;
  
  const headers = {
    'Content-Type': 'application/json',
  };
  
  // If we have an access token, send it as Authorization header
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  return headers;
};

export const authUserService = {
  /**
   * Get all HDTS users from auth service
   * Returns all users with roles in the HDTS system
   */
  async getAllHdtsUsers() {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/api/v1/hdts/user-management/users/api/`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include', // Send cookies
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch HDTS users: ${response.status}`);
      }

      const data = await response.json();
      console.log('📋 Auth Service - Fetched HDTS users:', data);
      
      // The response has structure: { count: X, users: [...] }
      return data.users || [];
    } catch (error) {
      console.error('Error fetching HDTS users from auth service:', error);
      throw error;
    }
  },

  /**
   * Get pending HDTS employee registrations
   * Returns users with pending status in HDTS system
   */
  async getPendingHdtsUsers() {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/api/v1/hdts/user-management/pending/api/`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include', // Send cookies
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch pending users: ${response.status}`);
      }

      const data = await response.json();
      console.log('📋 Auth Service - Fetched pending HDTS users:', data);
      
      // The response has structure: { count: X, users: [...] }
      return data.users || [];
    } catch (error) {
      console.error('Error fetching pending users from auth service:', error);
      throw error;
    }
  },

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/api/v1/users/${userId}/`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      throw error;
    }
  }
  ,

  /**
   * Approve an HDTS pending user by id
   * Calls the auth service endpoint to approve the pending user
   */
  async approveHdtsUser(userId) {
    try {
      if (!userId) throw new Error('Missing userId for approval');
      // Call the new JSON API endpoint which uses DRF and accepts Authorization
      const url = `${AUTH_BASE_URL}/api/v1/hdts/user-management/update-status-api/${userId}/`;
      const headers = getAuthHeaders();
      headers['Content-Type'] = 'application/json';

      const response = await fetch(url, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ action: 'approve' }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Failed to approve user: ${response.status} ${text}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error approving HDTS user:', error);
      throw error;
    }
  }
};
