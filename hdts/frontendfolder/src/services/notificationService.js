/**
 * Notification Service for HDTS Employee Notifications
 * Handles fetching, reading, and clearing notifications from the backend API
 */

import { API_CONFIG, USE_LOCAL_API } from '../config/environment';

const BASE_URL = USE_LOCAL_API ? '' : API_CONFIG.BACKEND.BASE_URL;

/**
 * Get auth headers from cookie or localStorage
 */
const getAuthHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  return headers;
};

/**
 * Fetch all notifications for the current employee
 * @param {Object} options - Query options
 * @param {boolean} options.unreadOnly - Only return unread notifications
 * @param {number} options.limit - Max number of notifications to return
 * @returns {Promise<{notifications: Array, unread_count: number}>}
 */
export const getNotifications = async (options = {}) => {
  if (USE_LOCAL_API) {
    return getMockNotifications();
  }

  const params = new URLSearchParams();
  if (options.unreadOnly) params.append('unread_only', 'true');
  if (options.limit) params.append('limit', options.limit.toString());

  const response = await fetch(`${BASE_URL}/api/notifications/?${params}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }

  return response.json();
};

/**
 * Get count of unread notifications
 * @returns {Promise<{unread_count: number}>}
 */
export const getUnreadCount = async () => {
  if (USE_LOCAL_API) {
    return { unread_count: 2 };
  }

  const response = await fetch(`${BASE_URL}/api/notifications/unread-count/`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch unread count');
  }

  return response.json();
};

/**
 * Mark a specific notification as read
 * @param {number} notificationId - The notification ID
 * @returns {Promise<{status: string, message: string}>}
 */
export const markAsRead = async (notificationId) => {
  if (USE_LOCAL_API) {
    return { status: 'ok', message: 'Notification marked as read' };
  }

  const response = await fetch(`${BASE_URL}/api/notifications/${notificationId}/read/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to mark notification as read');
  }

  return response.json();
};

/**
 * Mark all notifications as read
 * @returns {Promise<{status: string, message: string}>}
 */
export const markAllAsRead = async () => {
  if (USE_LOCAL_API) {
    return { status: 'ok', message: 'All notifications marked as read' };
  }

  const response = await fetch(`${BASE_URL}/api/notifications/read-all/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to mark all as read');
  }

  return response.json();
};

/**
 * Delete a specific notification
 * @param {number} notificationId - The notification ID
 * @returns {Promise<{status: string, message: string}>}
 */
export const deleteNotification = async (notificationId) => {
  if (USE_LOCAL_API) {
    return { status: 'ok', message: 'Notification deleted' };
  }

  const response = await fetch(`${BASE_URL}/api/notifications/${notificationId}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to delete notification');
  }

  return response.json();
};

/**
 * Clear all notifications
 * @returns {Promise<{status: string, message: string}>}
 */
export const clearAllNotifications = async () => {
  if (USE_LOCAL_API) {
    return { status: 'ok', message: 'All notifications cleared' };
  }

  const response = await fetch(`${BASE_URL}/api/notifications/clear/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to clear notifications');
  }

  return response.json();
};

/**
 * Mock notifications for local development
 */
const getMockNotifications = () => {
  return {
    notifications: [
      {
        id: 'mock-1',
        type: 'ticket_submitted',
        icon: 'document-add',
        title: 'Ticket Submitted',
        message: 'Your ticket "Network Issue" has been submitted successfully.',
        time: '2 minutes ago',
        timestamp: new Date().toISOString(),
        is_read: false,
        ticket_id: 1,
        ticket_number: 'TX20260110123456',
        link_type: 'ticket',
      },
      {
        id: 'mock-2',
        type: 'ticket_approved',
        icon: 'check-circle',
        title: 'Ticket Approved',
        message: 'Your ticket "Software Installation" has been approved.',
        time: '1 hour ago',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        is_read: false,
        ticket_id: 2,
        ticket_number: 'TX20260109654321',
        link_type: 'ticket',
      },
    ],
    unread_count: 2,
  };
};

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
};
