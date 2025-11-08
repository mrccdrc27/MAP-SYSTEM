import { useState, useEffect, useRef, useCallback } from 'react';

const MESSAGING_API_BASE = import.meta.env.VITE_MESSAGING_API || 'http://localhost:8005/api';
const WEBSOCKET_BASE = import.meta.env.VITE_MESSAGING_WS || 'ws://localhost:8005';

export const useMessaging = (ticketId, userId = 'anonymous') => {
  
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Refresh messages function
  const refreshMessages = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // API functions
  const apiCall = async (endpoint, options = {}) => {
    const url = `${MESSAGING_API_BASE}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  };

  // Fetch messages for a ticket using the correct endpoint
  const fetchMessages = useCallback(async () => {
    if (!ticketId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = `/messages/by_ticket/?ticket_id=${ticketId}`;
      
      const result = await apiCall(url, {
        method: 'GET',
      });
      setTicket({
        ticket_id: result.ticket_id,
        status: result.ticket_status
      });
      setMessages(result.messages || []);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]); // Keep ticketId dependency but we'll control when this runs

  // WebSocket connection management
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

      wsRef.current.onerror = (error) => {
        setError('WebSocket connection failed');
      };

    } catch (err) {
      setError('Failed to establish WebSocket connection');
    }
  }, [ticketId]);

  // Handle incoming WebSocket messages for real-time updates
  const handleWebSocketMessage = useCallback((data) => {
    switch (data.type) {
      case 'connection_established':
        break;

      case 'message_sent':
        setMessages(prev => {
          const exists = prev.some(msg => msg.message_id === data.message.message_id);
          if (!exists) {
            return [...prev, data.message].sort((a, b) => 
              new Date(a.created_at) - new Date(b.created_at)
            );
          }
          return prev;
        });
        break;

      case 'message_edited':
        setMessages(prev => prev.map(msg => 
          msg.message_id === data.message.message_id ? data.message : msg
        ));
        break;

      case 'message_deleted':
        setMessages(prev => prev.filter(msg => msg.message_id !== data.message_id));
        break;

      case 'reaction_added':
        setMessages(prev => prev.map(msg => {
          if (msg.message_id === data.message_id) {
            const updatedReactions = [...(msg.reactions || [])];
            const existingIndex = updatedReactions.findIndex(
              r => r.user === data.reaction.user && r.reaction === data.reaction.reaction
            );
            if (existingIndex === -1) {
              updatedReactions.push(data.reaction);
            }
            
            const reactionCounts = {};
            updatedReactions.forEach(r => {
              reactionCounts[r.reaction] = (reactionCounts[r.reaction] || 0) + 1;
            });
            
            return { ...msg, reactions: updatedReactions, reaction_counts: reactionCounts };
          }
          return msg;
        }));
        break;

      case 'reaction_removed':
        setMessages(prev => prev.map(msg => {
          if (msg.message_id === data.message_id) {
            const updatedReactions = (msg.reactions || []).filter(
              r => !(r.user === data.user && r.reaction === data.reaction)
            );
            
            const reactionCounts = {};
            updatedReactions.forEach(r => {
              reactionCounts[r.reaction] = (reactionCounts[r.reaction] || 0) + 1;
            });
            
            return { ...msg, reactions: updatedReactions, reaction_counts: reactionCounts };
          }
          return msg;
        }));
        break;

      case 'typing_indicator':
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (data.is_typing && data.user !== userId) {
            newSet.add(data.user);
          } else {
            newSet.delete(data.user);
          }
          return newSet;
        });
        break;

      case 'pong':
        break;

      default:
    }
  }, [userId]);

  const sendMessage = async (messageText, attachments = []) => {
    if (!ticketId || !messageText.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('ticket_id', ticketId);
      formData.append('message', messageText.trim());

      attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      const result = await fetch(`${MESSAGING_API_BASE}/messages/`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!result.ok) {
        const errorData = await result.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `HTTP ${result.status}`);
      }

      const newMessage = await result.json();
      
      setMessages(prev => {
        const exists = prev.some(msg => msg.message_id === newMessage.message_id);
        if (!exists) {
          return [...prev, newMessage].sort((a, b) => 
            new Date(a.created_at) - new Date(b.created_at)
          );
        }
        return prev;
      });

      return newMessage;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const editMessage = async (messageId, newContent) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiCall(`/messages/${messageId}/`, {
        method: 'PUT',
        body: JSON.stringify({
          message: newContent,
        }),
      });

      setMessages(prev => prev.map(msg => 
        msg.message_id === messageId ? result : msg
      ));

      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMessage = async (messageId) => {
    setIsLoading(true);
    setError(null);

    try {
      await apiCall(`/messages/${messageId}/`, {
        method: 'DELETE',
      });

      setMessages(prev => prev.filter(msg => msg.message_id !== messageId));

      return { success: true };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const addReaction = async (messageId, reaction) => {
    try {
      const result = await apiCall('/reactions/add/', {
        method: 'POST',
        body: JSON.stringify({
          message_id: messageId,
          reaction: reaction,
        }),
      });

      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const removeReaction = async (messageId, reaction) => {
    try {
      const result = await apiCall('/reactions/remove/', {
        method: 'POST',
        body: JSON.stringify({
          message_id: messageId,
          reaction: reaction,
        }),
      });
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const downloadAttachment = (attachmentId) => {
    const url = `${MESSAGING_API_BASE}/attachments/${attachmentId}/download/`;
    window.open(url, '_blank');
  };

  const sendTypingIndicator = useCallback((isTyping) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: isTyping ? 'typing_start' : 'typing_stop',
        user: userId,
      }));
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

  // Initialize: Connect WebSocket for real-time updates
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
  }, [ticketId]);

  // Effect to fetch messages only on initial load and manual refresh
  useEffect(() => {
    if (ticketId) {
      fetchMessages();
    }
  }, [ticketId, refreshKey]); // Remove fetchMessages dependency to prevent loops

  useEffect(() => {
    if (!isConnected) return;

    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [isConnected]);

  return {
    ticket,
    messages,
    isConnected,
    isLoading,
    error,
    typingUsers: Array.from(typingUsers),
    fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    downloadAttachment,
    refreshMessages,
    startTyping,
    stopTyping,
    reconnect: connectWebSocket,
  };
};