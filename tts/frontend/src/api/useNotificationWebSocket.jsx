import { useState, useEffect, useRef, useCallback } from 'react';
import { getAccessToken } from './TokenUtils';

// WebSocket endpoint for notifications
const NOTIFICATION_WS_BASE = import.meta.env.VITE_NOTIFICATION_WS || 'ws://localhost:8006';

/**
 * Hook for real-time notification updates via WebSocket
 * Connects to user-specific notification channel and receives live updates
 * 
 * @param {number|string} userId - The user ID to subscribe to notifications for
 * @param {Function} onNewNotification - Callback when a new notification arrives
 * @param {Function} onCountUpdate - Callback when unread count changes
 */
export const useNotificationWebSocket = (userId, onNewNotification, onCountUpdate) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const pingIntervalRef = useRef(null);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (!userId) {
      console.log('[NotificationWS] No userId, skipping connection');
      return;
    }

    // Close existing connection
    if (socketRef.current) {
      socketRef.current.close();
    }

    // Get token for WebSocket authentication (Kong gateway support)
    const token = getAccessToken();
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    const wsUrl = `${NOTIFICATION_WS_BASE}/ws/notifications/${userId}/${tokenParam}`;
    console.log('[NotificationWS] Connecting to:', wsUrl.replace(/token=.*/, 'token=***'));

    try {
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        console.log('[NotificationWS] Connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        
        // Start ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ 
              type: 'ping', 
              timestamp: Date.now() 
            }));
          }
        }, 30000); // Ping every 30 seconds
      };

      socketRef.current.onclose = (event) => {
        console.log('[NotificationWS] Disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        // Attempt reconnection if not intentionally closed
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`[NotificationWS] Reconnecting in ${delay}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      socketRef.current.onerror = (event) => {
        console.error('[NotificationWS] Error:', event);
        setError('WebSocket connection error');
      };

      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[NotificationWS] Received:', data);
          
          handleMessage(data);
        } catch (err) {
          console.error('[NotificationWS] Parse error:', err);
        }
      };
    } catch (err) {
      console.error('[NotificationWS] Connection error:', err);
      setError(err.message);
    }
  }, [userId]);

  /**
   * Handle incoming WebSocket messages
   */
  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case 'connection_established':
        console.log('[NotificationWS] Connection confirmed:', data.message);
        break;
        
      case 'pong':
        // Connection is healthy
        break;
        
      case 'notification_update':
        // New notification received
        if (data.notification && typeof onNewNotification === 'function') {
          onNewNotification(data.notification, data.action);
        }
        break;
        
      case 'count_update':
        // Unread count updated
        if (typeof onCountUpdate === 'function') {
          onCountUpdate(data.unread_count);
        }
        break;
        
      case 'subscribed':
        console.log('[NotificationWS] Subscribed to notifications');
        break;
        
      case 'error':
        console.error('[NotificationWS] Server error:', data.message);
        setError(data.message);
        break;
        
      default:
        console.log('[NotificationWS] Unknown message type:', data.type);
    }
  }, [onNewNotification, onCountUpdate]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.close(1000, 'User disconnected');
      socketRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  /**
   * Mark a notification as read via WebSocket
   */
  const markAsReadViaWS = useCallback((notificationId) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'mark_read',
        notification_id: notificationId
      }));
    }
  }, []);

  // Connect when userId is available
  useEffect(() => {
    if (userId) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [userId, connect, disconnect]);

  return {
    isConnected,
    error,
    disconnect,
    reconnect: connect,
    markAsReadViaWS
  };
};

export default useNotificationWebSocket;
