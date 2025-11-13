// src/api/useCommentsHttp.jsx
import { useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../axios';

// Define the API endpoint as an environment variable to avoid hardcoding
const MESSAGING_API = import.meta.env.VITE_MESSAGING_API;

export const useCommentsHttp = (ticketId) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // Helper function to get the user's role for comments
  const getUserRole = useCallback(() => {
    // Get user role from user object if available
    if (user) {
      // Try to get role from common locations in the user object
      return user.role || user.userRole || 'User';
    }
    // Default to 'User' if no specific role is found
    return 'User';
  }, [user]);

  // Fetch comments for a ticket
  const fetchComments = useCallback(async (page = 1) => {
    if (!ticketId) return null;

    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`${MESSAGING_API}/comments/?ticket_id=${ticketId}`);

      let comments = [];
      if (Array.isArray(response.data)) {
        comments = response.data;
      } else {
        comments = response.data.results || [];
      }

      // Sort comments and replies by created_at (newer first)
      const sortCommentsByTime = (comments) => {
        return comments
          .map((comment) => ({
            ...comment,
            replies: comment.replies.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
          }))
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      };

      return {
        comments: sortCommentsByTime(comments),
        pagination: {
          count: response.data.count || comments.length,
          next: response.data.next,
          previous: response.data.previous,
          current_page: page,
          total_pages: Math.ceil((response.data.count || comments.length) / 10),
        },
      };
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Failed to load comments. Please try again later.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  // Add a new comment with optional file attachments
  const addComment = useCallback(async (content, files = []) => {
    if (!ticketId) {
      setError('Unable to add comment: Missing ticket ID');
      return null;
    }

    try {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('ticket_id', ticketId);

      // Add files using the 'documents' field that the backend expects
      files.forEach((file) => {
        formData.append('documents', file);
      });

      const response = await api.post(`${MESSAGING_API}/comments/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to post your comment. Please try again.');
      return null;
    }
  }, [ticketId]);

  // Add a reply to a comment with optional file attachments
  const addReply = useCallback(async (parentCommentId, content, files = []) => {
    if (!ticketId) {
      setError('Unable to add reply: Missing ticket ID');
      return null;
    }

    try {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('ticket_id', ticketId);

      // Add files if any
      files.forEach((file, index) => {
        if (index < 5) {
          formData.append('documents', file);
        }
      });

      const response = await api.post(`${MESSAGING_API}/comments/${parentCommentId}/reply/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (err) {
      console.error('Error adding reply:', err);
      setError('Failed to post your reply. Please try again.');
      return null;
    }
  }, [ticketId]);

  // Add a reaction to a comment (like/dislike)
  const addReaction = useCallback(async (commentId, reactionType) => {
    try {
      const response = await api.post(`${MESSAGING_API}/comments/${commentId}/rate/`, {
        rating: reactionType === 'like' ? true : false // Convert like/dislike to true/false
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // The backend returns the updated comment data
      if (response.data && response.data.comment) {
        return response.data.comment;
      }
      
      return response.data;
    } catch (err) {
      console.error('Error adding reaction:', err);
      if (err.response?.status === 400) {
        setError('Invalid reaction data. Please try again.');
      } else if (err.response?.status === 404) {
        setError('Comment not found. It may have been deleted.');
      } else {
        setError('Failed to save your reaction. Please try again.');
      }
      return null;
    }
  }, []);

  // Remove a reaction
  const removeReaction = useCallback(async (commentId) => {
    if (!user?.id) {
      setError('Unable to remove reaction: Missing user information');
      return false;
    }
    
    const userRole = getUserRole();
    
    try {
      const response = await api.post(`${MESSAGING_API}/comments/${commentId}/rate/`, {
        rating: null // null to remove rating
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // The backend returns the updated comment data
      if (response.data && response.data.comment) {
        return response.data.comment;
      }
      
      return true;
    } catch (err) {
      console.error('Error removing reaction:', err);
      if (err.response?.status === 404) {
        setError('Comment not found. It may have been deleted.');
      } else {
        setError('Failed to remove your reaction. Please try again.');
      }
      return false;
    }
  }, [user, getUserRole]);

  // Delete a comment
  const deleteComment = useCallback(async (commentId) => {
    if (!commentId) {
      setError('Unable to delete comment: Missing comment id');
      return false;
    }

    try {
      await api.delete(`${MESSAGING_API}/comments/${commentId}/`);
      return true;
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError('Failed to delete comment. Please try again.');
      return false;
    }
  }, []);

  // Attach document to existing comment
  const attachDocument = useCallback(async (commentId, files) => {
    if (!files?.length) {
      setError('Unable to attach document: Missing files');
      return false;
    }

    try {
      const formData = new FormData();

      // Add files
      files.forEach(file => {
        formData.append('documents', file);
      });

      const response = await api.post(`${MESSAGING_API}/comments/${commentId}/attach_document/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (err) {
      console.error('Error attaching document:', err);
      setError('Failed to attach document. Please try again.');
      return false;
    }
  }, []);

  // Download document
  const downloadDocument = useCallback(async (documentId, filename) => {
    try {
      const response = await api.get(`${MESSAGING_API}/comments/download-document/${documentId}/`, {
        responseType: 'blob',
      });
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (err) {
      console.error('Error downloading document:', err);
      setError('Failed to download document. Please try again.');
      return false;
    }
  }, []);

  return {
    loading,
    error,
    fetchComments,
    addComment,
    addReply,
    addReaction,
    removeReaction,
    deleteComment,
    attachDocument,
    downloadDocument,
  };
};

export default useCommentsHttp;