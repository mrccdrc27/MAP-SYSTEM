// src/api/useComments.jsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from './axios';

// Define the API endpoint as an environment variable to avoid hardcoding
const MESSAGING_API = import.meta.env.VITE_MESSAGING_API

export const useComments = (ticketId) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { user, getTtsRole } = useAuth();

  const refreshComments = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // Helper function to get the user's role for comments
  const getUserRole = useCallback(() => {
    // Get the user's tts role using the function from AuthContext
    const ttsRole = getTtsRole();
    // Default to 'User' if no specific role is found
    return ttsRole || 'User';
  }, [getTtsRole]);

  // Fetch comments for a ticket
  const fetchComments = useCallback(async () => {
    if (!ticketId) return;

    setLoading(true);
    try {
      const response = await api.get(`${MESSAGING_API}/api/comments/comments/?ticket_id=${ticketId}`);
      setComments(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Failed to load comments. Please try again later.');
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  // Add a new comment
  const addComment = useCallback(async (content) => {
    if (!ticketId || !user?.id) {
      setError('Unable to add comment: Missing ticket ID or user information');
      return null;
    }

    const userRole = getUserRole();
    
    try {
      const response = await api.post(`${MESSAGING_API}/api/comments/comments/`, {
        ticket_id: ticketId,
        user_id: user.id,
        firstname: user.first_name || user.firstname || '',
        lastname: user.last_name || user.lastname || '',
        role: userRole,
        content
      });
      refreshComments();
      return response.data;
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to post your comment. Please try again.');
      return null;
    }
  }, [ticketId, user, getUserRole, refreshComments]);

  // Add a reply to a comment
  const addReply = useCallback(async (parentCommentId, content) => {
    if (!ticketId || !user?.id) {
      setError('Unable to add reply: Missing ticket ID or user information');
      return null;
    }

    const userRole = getUserRole();
    
    try {
      const response = await api.post(`${MESSAGING_API}/api/comments/comments/${parentCommentId}/reply/`, {
        ticket_id: ticketId,
        user_id: user.id,
        firstname: user.first_name || user.firstname || '',
        lastname: user.last_name || user.lastname || '',
        role: userRole,
        content,
        parent: parentCommentId
      });
      refreshComments();
      return response.data;
    } catch (err) {
      console.error('Error adding reply:', err);
      setError('Failed to post your reply. Please try again.');
      return null;
    }
  }, [ticketId, user, getUserRole, refreshComments]);

  // Add a reaction to a comment (like/dislike)
  const addReaction = useCallback(async (commentId, reactionType) => {
    if (!user?.id) {
      setError('Unable to react: Missing user information');
      return null;
    }

    const userRole = getUserRole();
    
    try {
      const response = await api.post(`${MESSAGING_API}/api/comments/comments/${commentId}/rate/`, {
        user_id: user.id,
        firstname: user.first_name || user.firstname || '',
        lastname: user.last_name || user.lastname || '',
        role: userRole,
        rating: reactionType === 'like' ? 1 : 0 // Convert like/dislike to 1/0
      });
      refreshComments();
      return response.data;
    } catch (err) {
      console.error('Error adding reaction:', err);
      setError('Failed to save your reaction. Please try again.');
      return null;
    }
  }, [user, getUserRole, refreshComments]);

  // Remove a reaction
  const removeReaction = useCallback(async (commentId) => {
    if (!user?.id) {
      setError('Unable to remove reaction: Missing user information');
      return false;
    }
    
    const userRole = getUserRole();
    
    try {
      await api.post(`${MESSAGING_API}/api/comments/comments/${commentId}/rate/`, {
        user_id: user.id,
        firstname: user.first_name || user.firstname || '',
        lastname: user.last_name || user.lastname || '',
        role: userRole,
        rating: null // null to remove rating
      });
      refreshComments();
      return true;
    } catch (err) {
      console.error('Error removing reaction:', err);
      setError('Failed to remove your reaction. Please try again.');
      return false;
    }
  }, [refreshComments, user, getUserRole]);

  // Effect to fetch comments when ticketId changes or refreshKey is updated
  useEffect(() => {
    fetchComments();
  }, [fetchComments, refreshKey]);

  return {
    comments,
    loading,
    error,
    addComment,
    addReply,
    addReaction,
    removeReaction,
    refreshComments
  };
};

export default useComments;