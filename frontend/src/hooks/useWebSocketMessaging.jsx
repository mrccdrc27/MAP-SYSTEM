import { useState, useEffect, useRef, useCallback } from 'react';

const WEBSOCKET_BASE = import.meta.env.VITE_MESSAGING_WS || 'ws://localhost:8005';

export const useWebSocketMessaging = (ticketId, userId = 'anonymous') => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [messages, setMessages] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const connectWebSocket = useCallback(() => {
    if (!ticketId) return;

    try {
      const wsUrl = `${WEBSOCKET_BASE}/ws/tickets/${ticketId}/`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setError(null);

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
          console.error('Failed to parse WebSocket message', err);
        }
      };

      wsRef.current.onclose = (event) => {
        setIsConnected(false);

        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 3000);
        }
      };

      wsRef.current.onerror = () => {
        setError('WebSocket connection failed');
      };
    } catch (err) {
      setError('Failed to establish WebSocket connection');
    }
  }, [ticketId]);

  const handleWebSocketMessage = useCallback((data) => {
    switch (data.type) {
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
        // Handle new message sent
        if (data.message) {
          setMessages((prev) => {
            const exists = prev.some((msg) => msg.message_id === data.message.message_id);
            if (!exists) {
              return [...prev, data.message].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            }
            return prev;
          });
        }
        break;

      case 'message_deleted':
        // Handle message deletion
        if (data.message_id) {
          setMessages((prev) => prev.filter((msg) => msg.message_id !== data.message_id));
        }
        break;

      default:
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

  useEffect(() => {
    if (ticketId) {
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [ticketId, connectWebSocket]);

  return {
    isConnected,
    error,
    typingUsers: Array.from(typingUsers),
    startTyping,
    stopTyping,
    reconnect: connectWebSocket,
    messages,
  };
};