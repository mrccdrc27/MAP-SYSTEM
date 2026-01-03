import { useState, useEffect, useRef, useCallback } from 'react';
import { getAccessToken } from '../api/TokenUtils';

// Use environment config for WebSocket
const WEBSOCKET_BASE = import.meta.env.VITE_MESSAGING_WS || 'ws://localhost:8005';

/**
 * Hook for WebSocket messaging
 * Handles real-time communication for ticket messaging
 */
export const useWebSocketMessaging = (ticketId, userId = 'anonymous', setMessages) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [connectedUsers, setConnectedUsers] = useState([]);
  
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const typingTimeoutRef = useRef(null);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (!ticketId) {
      console.log('[useWebSocketMessaging] No ticketId, skipping connection');
      return;
    }

    // Close existing connection
    if (socketRef.current) {
      socketRef.current.close();
    }

    // Get token for WebSocket authentication (Kong gateway support)
    const token = getAccessToken();
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    const wsUrl = `${WEBSOCKET_BASE}/ws/tickets/${ticketId}/${tokenParam}`;
    console.log('[useWebSocketMessaging] Connecting to:', wsUrl.replace(/token=.*/, 'token=***'));

    try {
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        console.log('[useWebSocketMessaging] Connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      socketRef.current.onclose = (event) => {
        console.log('[useWebSocketMessaging] Disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Attempt reconnection if not intentionally closed
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`[useWebSocketMessaging] Reconnecting in ${delay}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      socketRef.current.onerror = (event) => {
        console.error('[useWebSocketMessaging] Error:', event);
        setError('WebSocket connection error');
      };

      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[useWebSocketMessaging] Received:', data);
          
          handleMessage(data);
        } catch (err) {
          console.error('[useWebSocketMessaging] Parse error:', err);
        }
      };
    } catch (err) {
      console.error('[useWebSocketMessaging] Connection error:', err);
      setError(err.message);
    }
  }, [ticketId]);

  /**
   * Handle incoming WebSocket messages
   */
  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case 'connection_established':
        console.log('[useWebSocketMessaging] Connection confirmed:', data);
        break;
        
      case 'message_sent':
      case 'new_message':
        // Add new message to state
        if (data.message && setMessages) {
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.message_id === data.message.message_id)) {
              return prev;
            }
            return [...prev, data.message];
          });
        }
        break;
        
      case 'message_edited':
        // Update edited message
        if (data.message && setMessages) {
          setMessages(prev => 
            prev.map(msg => 
              msg.message_id === data.message.message_id ? data.message : msg
            )
          );
        }
        break;
        
      case 'message_deleted':
        // Remove deleted message
        if (data.message_id && setMessages) {
          setMessages(prev => 
            prev.filter(msg => msg.message_id !== data.message_id)
          );
        }
        break;

      case 'message_unsent':
        // Update unsent message
        if (data.message && setMessages) {
          setMessages(prev => 
            prev.map(msg => 
              msg.message_id === data.message.message_id ? data.message : msg
            )
          );
        }
        break;
        
      case 'reaction_added':
      case 'reaction_removed':
        // Update reactions
        if (data.message_id && setMessages) {
          setMessages(prev => 
            prev.map(msg => {
              if (msg.message_id === data.message_id) {
                return { ...msg, reactions: data.reactions || [] };
              }
              return msg;
            })
          );
        }
        break;
        
      case 'user_typing':
      case 'typing_indicator':
        // Update typing users (exclude current user)
        console.log('[useWebSocketMessaging] Typing indicator received:', data);
        console.log('[useWebSocketMessaging] Current userId:', userId, 'Typing user:', data.user);
        if (String(data.user) !== String(userId)) {
          setTypingUsers(prev => {
            const newTypingUsers = data.is_typing
              ? prev.includes(data.user) ? prev : [...prev, data.user]
              : prev.filter(u => u !== data.user);
            console.log('[useWebSocketMessaging] Updated typingUsers:', newTypingUsers);
            return newTypingUsers;
          });
        } else {
          console.log('[useWebSocketMessaging] Ignoring own typing indicator');
        }
        break;

      case 'user_joined':
      case 'presence_update':
        // Track user joining the chat
        console.log('[useWebSocketMessaging] User joined/presence update:', data);
        if (data.user && String(data.user) !== String(userId)) {
          setConnectedUsers(prev => {
            if (data.status === 'online' || data.type === 'user_joined') {
              return prev.includes(data.user) ? prev : [...prev, data.user];
            } else if (data.status === 'offline') {
              return prev.filter(u => u !== data.user);
            }
            return prev;
          });
        }
        // Handle users list from server
        if (data.users) {
          setConnectedUsers(data.users.filter(u => String(u) !== String(userId)));
        }
        break;

      case 'user_left':
        // Track user leaving the chat
        console.log('[useWebSocketMessaging] User left:', data);
        if (data.user) {
          setConnectedUsers(prev => prev.filter(u => u !== data.user));
          setTypingUsers(prev => prev.filter(u => u !== data.user));
        }
        break;
        
      case 'pong':
        // Heartbeat response
        break;
        
      case 'error':
        console.error('[useWebSocketMessaging] Server error:', data.message);
        setError(data.message);
        break;
        
      default:
        console.log('[useWebSocketMessaging] Unknown message type:', data.type);
    }
  }, [setMessages, userId]);

  /**
   * Send a message through WebSocket
   */
  const send = useCallback((data) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
      return true;
    }
    console.warn('[useWebSocketMessaging] Cannot send - not connected');
    return false;
  }, []);

  /**
   * Send typing indicator - start
   */
  const startTyping = useCallback(() => {
    send({ type: 'typing_start', user: userId });
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Auto-stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [send, userId]);

  /**
   * Send typing indicator - stop
   */
  const stopTyping = useCallback(() => {
    send({ type: 'typing_stop', user: userId });
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [send, userId]);

  /**
   * Reconnect to WebSocket
   */
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (socketRef.current) {
      socketRef.current.close(1000, 'User disconnected');
      socketRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    
    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        send({ type: 'ping' });
      }
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      disconnect();
    };
  }, [connect, disconnect, send]);

  return {
    isConnected,
    error,
    typingUsers,
    connectedUsers,
    startTyping,
    stopTyping,
    reconnect,
    disconnect,
  };
};
