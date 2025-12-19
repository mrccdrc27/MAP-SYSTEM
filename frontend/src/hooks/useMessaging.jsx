import { useState, useCallback, useEffect } from 'react';
import { useMessagingAPI } from './useMessagingAPI';
import { useWebSocketMessaging } from './useWebSocketMessaging';

/**
 * Main messaging hook that combines HTTP API and WebSocket functionality
 * Used for communication between ticket coordinators and agents
 * 
 * @param {string} ticketId - The ticket ID to fetch/send messages for
 * @param {string} userId - The current user's identifier for typing indicators
 */
export const useMessaging = (ticketId, userId = 'anonymous') => {
  const [messages, setMessages] = useState([]);

  // HTTP API operations
  const {
    ticket,
    isLoading,
    error: apiError,
    fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    downloadAttachment,
  } = useMessagingAPI(ticketId, setMessages);

  // WebSocket for real-time updates
  const {
    isConnected,
    error: wsError,
    typingUsers,
    startTyping,
    stopTyping,
    reconnect,
  } = useWebSocketMessaging(ticketId, userId, setMessages);

  // Auto-fetch messages when ticketId changes
  useEffect(() => {
    console.log('[useMessaging] useEffect triggered');
    console.log('[useMessaging] ticketId:', ticketId);
    console.log('[useMessaging] fetchMessages function:', typeof fetchMessages);
    
    if (ticketId) {
      console.log('[useMessaging] Calling fetchMessages for ticket:', ticketId);
      fetchMessages()
        .then(result => console.log('[useMessaging] fetchMessages result:', result))
        .catch(err => console.error('[useMessaging] fetchMessages error:', err));
    } else {
      console.log('[useMessaging] No ticketId, skipping fetch');
    }
  }, [ticketId, fetchMessages]);

  return {
    // State
    ticket,
    messages,
    isConnected,
    isLoading,
    error: apiError || wsError,
    typingUsers,
    
    // HTTP API methods
    fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    downloadAttachment,
    
    // WebSocket methods
    startTyping,
    stopTyping,
    reconnect,
  };
};
