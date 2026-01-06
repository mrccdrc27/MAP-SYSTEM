// Auth service user API client
import { API_CONFIG } from '../../config/environment.js';

const AUTH_BASE_URL = API_CONFIG.AUTH.BASE_URL;

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

export const authUserService = {
  /**
   * Get all HDTS users from auth service
   * Returns all users with roles in the HDTS system, combined from both users_user and hdts_employees tables
   */
  async getAllHdtsUsers() {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/api/v1/hdts/user-management/users/api/`, 
        getFetchOptions());

      if (!response.ok) {
        throw new Error(`Failed to fetch HDTS users: ${response.status}`);
      }

      const data = await response.json();
      
      // The response has structure: { count: X, users: [...], all_users: [...] }
      // all_users combines both system users and employees from hdts_employees table
      return data.all_users || data.users || [];
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
      const response = await fetch(`${AUTH_BASE_URL}/api/v1/hdts/user-management/pending/api/`, 
        getFetchOptions());

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
      const response = await fetch(`${AUTH_BASE_URL}/api/v1/users/${userId}/`, 
        getFetchOptions());

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
      // Call the update status endpoint
      const url = `${AUTH_BASE_URL}/api/v1/hdts/user-management/update-status/${userId}/`;
      
      const response = await fetch(url, 
        getFetchOptions('POST', { action: 'approve' }));

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Failed to approve user: ${response.status} ${text}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error approving HDTS user:', error);
      throw error;
    }
  },

  /**
   * Reject an HDTS pending user by id
   * Calls the auth service endpoint to reject the pending user
   */
  async rejectHdtsUser(userId) {
    try {
      if (!userId) throw new Error('Missing userId for rejection');
      // Call the update status endpoint with reject action
      const url = `${AUTH_BASE_URL}/api/v1/hdts/user-management/update-status/${userId}/`;
      
      const response = await fetch(url, 
        getFetchOptions('POST', { action: 'reject' }));

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Failed to reject user: ${response.status} ${text}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error rejecting HDTS user:', error);
      throw error;
    }
  }
};
