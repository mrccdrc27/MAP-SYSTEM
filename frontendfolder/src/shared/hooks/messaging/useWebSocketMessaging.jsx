import { useState, useEffect, useRef, useCallback } from 'react';
import { API_CONFIG } from '../../../config/environment';

// WebSocket URL for messaging service
const WEBSOCKET_BASE = import.meta.env.VITE_MESSAGING_WS || 
  (import.meta.env.VITE_MESSAGING_API?.replace('http', 'ws')?.replace('', '') || 
   API_CONFIG.MESSAGING?.WS_URL || 
   'ws://localhost:8005');

export const useWebSocketMessaging = (ticketId, userId = 'anonymous', setMessages) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connectWebSocket = useCallback(() => {
    if (!ticketId) return;

    // Clean up existing connection
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = `${WEBSOCKET_BASE}/ws/tickets/${ticketId}/`;
      console.log('[WebSocket] Connecting to:', wsUrl);
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('[WebSocket] Connected successfully');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('[WebSocket] Connection closed:', event.code, event.reason);
        setIsConnected(false);

        // Only reconnect on abnormal closure and within attempt limit
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        }
      };

      wsRef.current.onerror = (err) => {
        console.error('[WebSocket] Error:', err);
        setError('WebSocket connection failed');
      };
    } catch (err) {
      console.error('[WebSocket] Failed to establish connection:', err);
      setError('Failed to establish WebSocket connection');
    }
  }, [ticketId]);

  const handleWebSocketMessage = useCallback((data) => {
    console.log('[WebSocket] Received message:', data.type);
    
    switch (data.type) {
      case 'connection_established':
        console.log('[WebSocket] Connection confirmed for ticket:', data.ticket_id);
        break;

      case 'typing_indicator':
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          if (data.is_typing && data.user !== userId) {
            newSet.add(data.user);
          } else {
            newSet.delete(data.user);
          }
          return newSet;
        });
        break;

      case 'message_sent':
      case 'message_broadcast':
        // Handle new message from another user
        if (data.message || data.data?.message) {
          const message = data.message || data.data;
          setMessages((prev) => {
            const exists = prev.some((msg) => msg.message_id === message.message_id);
            if (!exists) {
              return [...prev, message].sort((a, b) => 
                new Date(a.created_at) - new Date(b.created_at)
              );
            }
            return prev;
          });
        }
        break;

      case 'message_updated':
        // Handle message edit
        if (data.message) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.message_id === data.message.message_id
                ? { ...msg, ...data.message }
                : msg
            )
          );
        }
        break;

      case 'message_deleted':
        // Handle message deletion
        if (data.message_id) {
          setMessages((prev) => prev.filter((msg) => msg.message_id !== data.message_id));
        }
        break;

      case 'reaction_added':
      case 'reaction_removed':
        // Handle reaction updates
        if (data.message_id && data.reactions) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.message_id === data.message_id
                ? { ...msg, reactions: data.reactions }
                : msg
            )
          );
        }
        break;

      case 'pong':
        // Heartbeat response
        break;

      case 'error':
        console.error('[WebSocket] Server error:', data.message);
        setError(data.message);
        break;

      default:
        console.log('[WebSocket] Unhandled message type:', data.type);
        break;
    }
  }, [userId, setMessages]);

  const sendTypingIndicator = useCallback((isTyping) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: isTyping ? 'typing_start' : 'typing_stop',
          user: userId,
        })
      );
    }
  }, [userId]);

  const startTyping = useCallback(() => {
    sendTypingIndicator(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 3000);
  }, [sendTypingIndicator]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    sendTypingIndicator(false);
  }, [sendTypingIndicator]);

  const sendPing = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'ping',
          timestamp: Date.now(),
        })
      );
    }
  }, []);

  // Connect WebSocket when ticketId is available
  useEffect(() => {
    if (ticketId) {
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [ticketId, connectWebSocket]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    const heartbeat = setInterval(() => {
      if (isConnected) {
        sendPing();
      }
    }, 30000);

    return () => clearInterval(heartbeat);
  }, [isConnected, sendPing]);

  return {
    isConnected,
    error,
    typingUsers: Array.from(typingUsers),
    startTyping,
    stopTyping,
    reconnect: connectWebSocket,
  };
};
