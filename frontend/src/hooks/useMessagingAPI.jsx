import { useState, useCallback } from 'react';

const MESSAGING_API_BASE = import.meta.env.VITE_MESSAGING_API || 'http://localhost:8005/api';

export const useMessagingAPI = (ticketId) => {
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const fetchMessages = useCallback(async () => {
    if (!ticketId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = `/messages/by_ticket/?ticket_id=${ticketId}`;
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
  }, [ticketId]);

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

  const deleteMessage = async (messageId) => {
    if (!messageId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetch(`${MESSAGING_API_BASE}/messages/${messageId}/delete/`, {
        method: 'DELETE',
        credentials: 'include',
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

  return {
    ticket,
    messages,
    isLoading,
    error,
    fetchMessages,
    sendMessage,
    deleteMessage,
  };
};