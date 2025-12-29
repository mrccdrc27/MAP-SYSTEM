import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNotificationWebSocket } from '../api/useNotificationWebSocket';
import { useAuth } from './AuthContext';

// Ensure axios sends cookies for authentication
axios.defaults.withCredentials = true;

const API_BASE_URL = import.meta.env.VITE_NOTIFICATION_API || 'http://localhost:8006';

const userEndpoints = {
    my_notifications: {
        all: `${API_BASE_URL}/api/v1/app/my/notifications/`,
        unread: `${API_BASE_URL}/api/v1/app/my/notifications/unread/`,
        read: `${API_BASE_URL}/api/v1/app/my/notifications/read/`,
        mark_all_read: `${API_BASE_URL}/api/v1/app/my/notifications/mark-all-read/`
    },
    my_notification_specific: {
        mark_read: `${API_BASE_URL}/api/v1/app/my/notification/mark-read/`
    }
};

// Create context
const NotificationContext = createContext(null);

/**
 * Notification Provider - shares notification state and WebSocket across the app
 */
export function NotificationProvider({ children }) {
    const { user } = useAuth();
    const userId = user?.id;
    
    const [notifications, setNotifications] = useState({
        all: [],
        unread: [],
        read: []
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Track if initial fetch is done
    const initialFetchDone = useRef(false);

    // Helper to normalize API response
    const normalizeResponseToArray = (data) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.results)) return data.results;
        if (Array.isArray(data.items)) return data.items;
        if (Array.isArray(data.data)) return data.data;
        return [];
    };

    /**
     * Handle new notification from WebSocket
     */
    const handleNewNotification = useCallback((notification, action) => {
        console.log('[NotificationContext] WebSocket notification received:', action, notification);
        
        if (action === 'new') {
            setNotifications(prev => ({
                all: [notification, ...prev.all],
                unread: [notification, ...prev.unread],
                read: prev.read
            }));
        } else if (action === 'read') {
            setNotifications(prev => ({
                all: prev.all.map(n => 
                    n.id === notification.id ? { ...n, is_read: true } : n
                ),
                unread: prev.unread.filter(n => n.id !== notification.id),
                read: [notification, ...prev.read.filter(n => n.id !== notification.id)]
            }));
        }
    }, []);

    /**
     * Handle unread count update from WebSocket
     */
    const handleCountUpdate = useCallback((unreadCount) => {
        console.log('[NotificationContext] WebSocket count update:', unreadCount);
        // If count doesn't match, refresh unread list
        setNotifications(prev => {
            if (prev.unread.length !== unreadCount) {
                // Trigger refresh in the background
                fetchNotifications('unread');
            }
            return prev;
        });
    }, []);

    // Single WebSocket connection for the entire app
    const { isConnected: wsConnected } = useNotificationWebSocket(
        userId,
        handleNewNotification,
        handleCountUpdate
    );

    /**
     * Fetch notifications from API
     */
    const fetchNotifications = useCallback(async (type = 'all') => {
        if (!userId) return;
        
        setLoading(true);
        setError(null);
        try {
            const url = userEndpoints.my_notifications[type];
            if (!url) {
                throw new Error(`Invalid notification type: ${type}`);
            }
            const response = await axios.get(url);
            const items = normalizeResponseToArray(response.data);
            setNotifications(prev => ({
                ...prev,
                [type]: items
            }));
        } catch (err) {
            console.error(`[NotificationContext] Failed to fetch ${type} notifications:`, err);
            setError(`Could not fetch ${type} notifications.`);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    /**
     * Mark single notification as read
     */
    const markAsRead = useCallback(async (notificationId) => {
        if (!notificationId) return;
        setLoading(true);
        setError(null);
        try {
            await axios.post(userEndpoints.my_notification_specific.mark_read, {
                notification_id: notificationId
            });
            // Update local state immediately for responsiveness
            setNotifications(prev => {
                const notification = prev.unread.find(n => n.id === notificationId);
                if (!notification) return prev;
                
                return {
                    all: prev.all.map(n => n.id === notificationId ? { ...n, is_read: true } : n),
                    unread: prev.unread.filter(n => n.id !== notificationId),
                    read: [{ ...notification, is_read: true }, ...prev.read]
                };
            });
        } catch (err) {
            console.error('[NotificationContext] Failed to mark notification as read:', err);
            setError('Could not mark notification as read.');
            // Refresh on error to ensure consistency
            await fetchNotifications('unread');
        } finally {
            setLoading(false);
        }
    }, [fetchNotifications]);

    /**
     * Mark all notifications as read
     */
    const markAllAsRead = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            await axios.post(userEndpoints.my_notifications.mark_all_read);
            // Update local state immediately
            setNotifications(prev => ({
                all: prev.all.map(n => ({ ...n, is_read: true })),
                unread: [],
                read: [...prev.unread.map(n => ({ ...n, is_read: true })), ...prev.read]
            }));
        } catch (err) {
            console.error('[NotificationContext] Failed to mark all as read:', err);
            setError('Could not mark all notifications as read.');
            // Refresh on error
            await Promise.all([
                fetchNotifications('all'),
                fetchNotifications('unread'),
                fetchNotifications('read')
            ]);
        } finally {
            setLoading(false);
        }
    }, [fetchNotifications]);

    // Initial fetch when user becomes available
    useEffect(() => {
        if (userId && !initialFetchDone.current) {
            initialFetchDone.current = true;
            fetchNotifications('unread');
        }
    }, [userId, fetchNotifications]);

    // Reset when user logs out
    useEffect(() => {
        if (!userId) {
            initialFetchDone.current = false;
            setNotifications({ all: [], unread: [], read: [] });
        }
    }, [userId]);

    const value = {
        notifications,
        loading,
        error,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        wsConnected,
        unreadCount: notifications.unread.length
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}

/**
 * Hook to use notification context
 */
export function useNotificationContext() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotificationContext must be used within NotificationProvider');
    }
    return context;
}
