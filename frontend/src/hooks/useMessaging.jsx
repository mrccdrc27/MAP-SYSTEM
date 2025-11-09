import { useMessagingAPI } from './useMessagingAPI';
import { useWebSocketMessaging } from './useWebSocketMessaging';

export const useMessaging = (ticketId, userId = 'anonymous') => {
  const {
    ticket,
    messages,
    isLoading,
    error: apiError,
    fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    downloadAttachment,
  } = useMessagingAPI(ticketId);

  const {
    isConnected,
    error: wsError,
    typingUsers,
    startTyping,
    stopTyping,
    reconnect,
  } = useWebSocketMessaging(ticketId, userId);

  return {
    ticket,
    messages,
    isConnected,
    isLoading,
    error: apiError || wsError,
    typingUsers,
    fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    downloadAttachment,
    startTyping,
    stopTyping,
    reconnect,
  };
};