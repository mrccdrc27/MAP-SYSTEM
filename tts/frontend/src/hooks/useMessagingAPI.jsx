import { useState, useCallback } from 'react';
import { getAccessToken } from '../api/TokenUtils';

// Use environment config for messaging API
const MESSAGING_API_BASE = import.meta.env.VITE_MESSAGING_API || 'http://localhost:8005';

// Debug: Log the API base URL on module load
console.log('[useMessagingAPI] MESSAGING_API_BASE:', MESSAGING_API_BASE);

/**
 * Hook for messaging API operations
 * Handles HTTP requests to the messaging service for ticket communication
 */
export const useMessagingAPI = (ticketId, setMessages) => {
  console.log('[useMessagingAPI] Hook initialized with ticketId:', ticketId);
  const [ticket, setTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Get auth headers - tries localStorage first, then cookies
   */
  const getAuthHeaders = useCallback(() => {
    const token = getAccessToken();
    console.log('[useMessagingAPI] Token found:', token ? 'Yes' : 'No');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  /**
   * Fetch all messages for the current ticket
   */
  const fetchMessages = useCallback(async () => {
    if (!ticketId) {
      console.log('[useMessagingAPI] No ticketId provided, skipping fetch');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = `${MESSAGING_API_BASE}/messages/by-ticket/?ticket_id=${ticketId}`;
      console.log('[useMessagingAPI] Fetching messages from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include', // Include cookies for cross-origin requests
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });

      console.log('[useMessagingAPI] Response status:', response.status);

      if (!response.ok) {
        // Handle 404 gracefully - ticket may not have messages yet
        if (response.status === 404) {
          setTicket({ ticket_id: ticketId, status: 'open' });
          setMessages([]);
          return { ticket_id: ticketId, messages: [] };
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('[useMessagingAPI] Fetched messages:', result);
      
      setTicket({
        ticket_id: result.ticket_id,
        status: result.ticket_status,
      });
      setMessages(result.messages || []);
      return result;
    } catch (err) {
      console.error('[useMessagingAPI] Fetch error:', err);
      setError(err.message);
      // Don't fail completely - just show empty messages
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [ticketId, setMessages, getAuthHeaders]);

  /**
   * Send a new message to the ticket
   */
  const sendMessage = useCallback(async (messageText, attachments = []) => {
    if (!ticketId) {
      throw new Error('No ticket ID provided');
    }

    if (!messageText?.trim() && attachments.length === 0) {
      throw new Error('Message text or attachments required');
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('ticket_id', ticketId);
      formData.append('message', messageText?.trim() || '');

      // Append all attachments
      attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await fetch(`${MESSAGING_API_BASE}/messages/`, {
        method: 'POST',
        credentials: 'include', // Include cookies for cross-origin requests
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || `HTTP ${response.status}`);
      }

      const newMessage = await response.json();
      console.log('[useMessagingAPI] Message sent:', newMessage);
      
      // Add message to local state with deduplication check
      // WebSocket may also deliver this message, so we check for duplicates
      setMessages(prev => {
        if (prev.some(m => m.message_id === newMessage.message_id)) {
          return prev; // Already exists, skip
        }
        return [...prev, newMessage];
      });
      
      return newMessage;
    } catch (err) {
      console.error('[useMessagingAPI] Send error:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [ticketId, setMessages, getAuthHeaders]);

  /**
   * Edit an existing message
   */
  const editMessage = useCallback(async (messageId, newText) => {
    if (!messageId || !newText?.trim()) {
      throw new Error('Message ID and new text required');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${MESSAGING_API_BASE}/messages/${messageId}/`, {
        method: 'PUT',
        credentials: 'include', // Include cookies for cross-origin requests
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ message: newText.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || `HTTP ${response.status}`);
      }

      const updatedMessage = await response.json();
      console.log('[useMessagingAPI] Message edited:', updatedMessage);
      
      // Update message in local state
      setMessages(prev => 
        prev.map(msg => msg.message_id === messageId ? updatedMessage : msg)
      );
      
      return updatedMessage;
    } catch (err) {
      console.error('[useMessagingAPI] Edit error:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setMessages, getAuthHeaders]);

  /**
   * Delete a message (soft delete)
   */
  const deleteMessage = useCallback(async (messageId) => {
    if (!messageId) {
      throw new Error('Message ID required');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${MESSAGING_API_BASE}/messages/${messageId}/`, {
        method: 'DELETE',
        credentials: 'include', // Include cookies for cross-origin requests
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || `HTTP ${response.status}`);
      }

      console.log('[useMessagingAPI] Message deleted:', messageId);
      
      // Remove message from local state
      setMessages(prev => prev.filter(msg => msg.message_id !== messageId));
      
      return true;
    } catch (err) {
      console.error('[useMessagingAPI] Delete error:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setMessages, getAuthHeaders]);

  /**
   * Unsend a message (mark as unsent, optionally for everyone)
   */
  const unsendMessage = useCallback(async (messageId, forAll = false) => {
    if (!messageId) {
      throw new Error('Message ID required');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${MESSAGING_API_BASE}/messages/${messageId}/unsend/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ for_all: forAll }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || `HTTP ${response.status}`);
      }

      const updatedMessage = await response.json();
      console.log('[useMessagingAPI] Message unsent:', updatedMessage);
      
      // Update message in local state
      setMessages(prev => 
        prev.map(msg => msg.message_id === messageId ? updatedMessage : msg)
      );
      
      return updatedMessage;
    } catch (err) {
      console.error('[useMessagingAPI] Unsend error:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setMessages, getAuthHeaders]);

  /**
   * Add a reaction to a message
   */
  const addReaction = useCallback(async (messageId, emoji) => {
    if (!messageId || !emoji) {
      throw new Error('Message ID and emoji required');
    }

    try {
      const response = await fetch(`${MESSAGING_API_BASE}/reactions/add/`, {
        method: 'POST',
        credentials: 'include', // Include cookies for cross-origin requests
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ message_id: messageId, reaction: emoji }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('[useMessagingAPI] Reaction added:', result);
      
      // Update message reactions in local state
      setMessages(prev => 
        prev.map(msg => {
          if (msg.message_id === messageId) {
            return {
              ...msg,
              reactions: [...(msg.reactions || []), result]
            };
          }
          return msg;
        })
      );
      
      return result;
    } catch (err) {
      console.error('[useMessagingAPI] Add reaction error:', err);
      throw err;
    }
  }, [setMessages, getAuthHeaders]);

  /**
   * Remove a reaction from a message
   */
  const removeReaction = useCallback(async (messageId, emoji) => {
    if (!messageId || !emoji) {
      throw new Error('Message ID and emoji required');
    }

    try {
      const response = await fetch(`${MESSAGING_API_BASE}/reactions/remove/`, {
        method: 'POST',
        credentials: 'include', // Include cookies for cross-origin requests
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ message_id: messageId, reaction: emoji }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || `HTTP ${response.status}`);
      }

      console.log('[useMessagingAPI] Reaction removed');
      
      // Update message reactions in local state
      setMessages(prev => 
        prev.map(msg => {
          if (msg.message_id === messageId) {
            return {
              ...msg,
              reactions: (msg.reactions || []).filter(r => r.reaction !== emoji)
            };
          }
          return msg;
        })
      );
      
      return true;
    } catch (err) {
      console.error('[useMessagingAPI] Remove reaction error:', err);
      throw err;
    }
  }, [setMessages, getAuthHeaders]);

  /**
   * Download an attachment
   */
  const downloadAttachment = useCallback(async (attachmentId, filename) => {
    if (!attachmentId) {
      throw new Error('Attachment ID required');
    }

    try {
      const response = await fetch(
        `${MESSAGING_API_BASE}/attachments/${attachmentId}/download/`,
        {
          method: 'GET',
          credentials: 'include', // Include cookies for cross-origin requests
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`Download failed: HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'attachment';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return true;
    } catch (err) {
      console.error('[useMessagingAPI] Download error:', err);
      throw err;
    }
  }, [getAuthHeaders]);

  return {
    ticket,
    isLoading,
    error,
    fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    unsendMessage,
    addReaction,
    removeReaction,
    downloadAttachment,
  };
};
