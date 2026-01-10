import { apiRequest } from './api';

/**
 * Admin Service
 * Handles system management, role management, and user administration
 * 
 * Note: All endpoints use /auth prefix for Kong gateway routing
 */

// Get agents/users for a specific system
export const getSystemAgents = async (systemSlug) => {
  return await apiRequest(`/auth/api/v1/system-roles/systems/${systemSlug}/users/`, {
    method: 'GET',
    includeAuth: true,
  });
};

// Get all user system roles
export const getUserSystemRoles = async () => {
  return await apiRequest('/auth/api/v1/system-roles/user-system-roles/', {
    method: 'GET',
    includeAuth: true,
  });
};

// Update a user's system role
export const updateUserSystemRole = async (roleId, data) => {
  return await apiRequest(`/auth/api/v1/system-roles/user-system-roles/${roleId}/`, {
    method: 'PATCH',
    includeAuth: true,
    body: JSON.stringify(data),
  });
};

// Delete a user's system role
export const deleteUserSystemRole = async (roleId) => {
  return await apiRequest(`/auth/api/v1/system-roles/user-system-roles/${roleId}/`, {
    method: 'DELETE',
    includeAuth: true,
  });
};

// Invite a user to a system
export const inviteAgent = async (inviteData) => {
  return await apiRequest('/auth/api/v1/system-roles/invite/', {
    method: 'POST',
    includeAuth: true,
    body: JSON.stringify(inviteData),
  });
};

// Get all systems
export const getAllSystems = async () => {
  return await apiRequest('/auth/api/v1/systems/', {
    method: 'GET',
    includeAuth: true,
  });
};

// Get roles for a specific system
export const getSystemRoles = async (systemSlug) => {
  return await apiRequest(`/auth/api/v1/roles/?system=${systemSlug}`, {
    method: 'GET',
    includeAuth: true,
  });
};

// Create a new role
export const createRole = async (roleData) => {
  return await apiRequest('/auth/api/v1/roles/', {
    method: 'POST',
    includeAuth: true,
    body: JSON.stringify(roleData),
  });
};

// Update a role
export const updateRole = async (roleId, roleData) => {
  return await apiRequest(`/auth/api/v1/roles/${roleId}/`, {
    method: 'PATCH',
    includeAuth: true,
    body: JSON.stringify(roleData),
  });
};

// Delete a role
export const deleteRole = async (roleId) => {
  return await apiRequest(`/auth/api/v1/roles/${roleId}/`, {
    method: 'DELETE',
    includeAuth: true,
  });
};

// Update user profile by admin
export const updateUserByAdmin = async (userId, userData) => {
  return await apiRequest(`/auth/api/v1/users/${userId}/`, {
    method: 'PATCH',
    includeAuth: true,
    body: JSON.stringify(userData),
  });
};

// Get available users and systems for invitation
export const getInviteData = async () => {
  return await apiRequest('/auth/api/v1/users/invite-agent/', {
    method: 'GET',
    includeAuth: true,
  });
};

// Invite a user to a system (via user endpoint)
export const submitInvite = async (inviteData) => {
  return await apiRequest('/auth/api/v1/users/invite-agent/', {
    method: 'POST',
    includeAuth: true,
    body: JSON.stringify(inviteData),
  });
};

// Get TTS assignments
export const getTTSAssignments = async () => {
  return await apiRequest('/auth/api/v1/tts/manage-assignments-api/', {
    method: 'GET',
    includeAuth: true,
  });
};

// Update TTS assignment
export const updateTTSAssignment = async (assignmentId, data) => {
  return await apiRequest(`/auth/api/v1/tts/update-assignment/${assignmentId}/`, {
    method: 'PUT',
    includeAuth: true,
    body: JSON.stringify(data),
  });
};

export default {
  getSystemAgents,
  getUserSystemRoles,
  updateUserSystemRole,
  deleteUserSystemRole,
  inviteAgent,
  getAllSystems,
  getSystemRoles,
  createRole,
  updateRole,
  deleteRole,
  updateUserByAdmin,
  getInviteData,
  submitInvite,
  getTTSAssignments,
  updateTTSAssignment,
};
