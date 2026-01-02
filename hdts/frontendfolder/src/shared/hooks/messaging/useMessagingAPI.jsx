import { useState, useCallback } from 'react';
import { API_CONFIG } from '../../../config/environment';

// Use environment config for messaging API
const MESSAGING_API_BASE =
  import.meta.env.VITE_MESSAGING_API ||
  API_CONFIG.MESSAGING?.BASE_URL ||
  'http://localhost:8005';

export const useMessagingAPI = (ticketId, setMessages) => {
  const [ticket, setTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cookie-based auth - no localStorage tokens
  const apiCall = async (endpoint, options = {}) => {
    const url = `${MESSAGING_API_BASE}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Send cookies for authentication
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  };

  const fetchMessages = useCallback(async () => {
    if (!ticketId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = `/messages/by-ticket/?ticket_id=${ticketId}`;
      const result = await apiCall(url, { method: 'GET' });
      setTicket({
        ticket_id: result.ticket_id,
        status: result.ticket_status,
      });
      setMessages(result.messages || []);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [ticketId, setMessages]);

  const sendMessage = async (messageText, attachments = [], senderInfo = {}) => {
    if (!ticketId) return;
    
    // Allow sending if there's either message text OR attachments
    if (!messageText.trim() && attachments.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('ticket_id', ticketId);
      formData.append('message', messageText.trim());
      
      // Include sender info for coordinator identification
      if (senderInfo.sender) {
        formData.append('sender', senderInfo.sender);
      }
      if (senderInfo.sender_role) {
        formData.append('sender_role', senderInfo.sender_role);
      }

      // Append all attachments
      attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      const result = await fetch(`${MESSAGING_API_BASE}/messages/`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!result.ok) {
        const errorData = await result.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `HTTP ${result.status}`);
      }

      const newMessage = await result.json();
      setMessages((prev) => {
        const exists = prev.some((msg) => msg.message_id === newMessage.message_id);
        if (!exists) {
          return [...prev, newMessage].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
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
    if (!messageId || !newContent?.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiCall(`/messages/${messageId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ message: newContent.trim() }),
      });
      
      setMessages((prev) =>
        prev.map((msg) =>
          msg.message_id === messageId
            ? { ...msg, message: result.message, is_edited: true, edited_at: result.edited_at }
            : msg
        )
      );
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMessage = async (messageId) => {
    if (!messageId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetch(`${MESSAGING_API_BASE}/messages/${messageId}/delete/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (!result.ok) {
        const errorData = await result.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `HTTP ${result.status}`);
      }
      setMessages((prev) => prev.filter((msg) => msg.message_id !== messageId));
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const addReaction = async (messageId, reactionType) => {
    if (!messageId || !reactionType) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiCall('/reactions/add/', {
        method: 'POST',
        body: JSON.stringify({ message_id: messageId, reaction_type: reactionType }),
      });
      
      // Update local message with new reaction
      setMessages((prev) =>
        prev.map((msg) =>
          msg.message_id === messageId
            ? { ...msg, reactions: result.reactions || msg.reactions }
            : msg
        )
      );
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const removeReaction = async (messageId, reactionType) => {
    if (!messageId || !reactionType) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiCall('/reactions/remove/', {
        method: 'POST',
        body: JSON.stringify({ message_id: messageId, reaction_type: reactionType }),
      });
      
      setMessages((prev) =>
        prev.map((msg) =>
          msg.message_id === messageId
            ? { ...msg, reactions: result.reactions || msg.reactions }
            : msg
        )
      );
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const downloadAttachment = async (attachmentId, filename) => {
    try {
      const response = await fetch(`${MESSAGING_API_BASE}/attachments/${attachmentId}/download/`, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download: HTTP ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    ticket,
    isLoading,
    error,
    fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    downloadAttachment,
  };
};
