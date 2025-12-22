import { useState, useEffect, useCallback } from 'react';
import { useMessagingAPI } from './useMessagingAPI';
import { useWebSocketMessaging } from './useWebSocketMessaging';

/**
 * useMessaging Hook
 * 
 * Combined hook for real-time messaging between HDTS Ticket Coordinators and TTS Agents.
 * Provides both HTTP API operations and WebSocket real-time updates.
 * 
 * @param {string} ticketId - The ticket ID to fetch messages for (e.g., 'T12345')
 * @param {string} userId - The current user's ID for tracking typing indicators
 * @param {object} userInfo - Optional user info { name, role } for sender identification
 * @returns {object} Messaging state and functions
 */
export const useMessaging = (ticketId, userId = 'anonymous', userInfo = {}) => {
  const [messages, setMessages] = useState([]);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const {
    ticket,
    isLoading,
    error: apiError,
    fetchMessages,
    sendMessage: apiSendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    downloadAttachment,
  } = useMessagingAPI(ticketId, setMessages);

  const {
    isConnected,
    error: wsError,
    typingUsers,
    startTyping,
    stopTyping,
    reconnect,
  } = useWebSocketMessaging(ticketId, userId, setMessages);

  // Fetch initial messages when ticketId changes
  useEffect(() => {
    if (ticketId && !initialLoadComplete) {
      fetchMessages()
        .then(() => setInitialLoadComplete(true))
        .catch((err) => {
          console.error('[useMessaging] Failed to fetch initial messages:', err);
          setInitialLoadComplete(true); // Mark complete even on error to prevent infinite retries
        });
    }
  }, [ticketId, initialLoadComplete, fetchMessages]);

  // Reset when ticketId changes
  useEffect(() => {
    setInitialLoadComplete(false);
    setMessages([]);
  }, [ticketId]);

  // Wrapper for sendMessage that includes user info
  const sendMessage = useCallback(async (messageText, attachments = []) => {
    const senderInfo = {
      sender: userInfo.name || userInfo.full_name || `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim() || 'Unknown',
      sender_role: userInfo.role || 'Coordinator',
    };
    return apiSendMessage(messageText, attachments, senderInfo);
  }, [apiSendMessage, userInfo]);

  // Combine errors
  const error = apiError || wsError;

  return {
    // Ticket info
    ticket,
    
    // Messages
    messages,
    
    // Connection state
    isConnected,
    isLoading,
    error,
    
    // Typing indicators
    typingUsers,
    startTyping,
    stopTyping,
    
    // API operations
    fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    downloadAttachment,
    
    // Reconnection
    reconnect,
  };
};

// Export individual hooks for granular usage
export { useMessagingAPI } from './useMessagingAPI';
export { useWebSocketMessaging } from './useWebSocketMessaging';
