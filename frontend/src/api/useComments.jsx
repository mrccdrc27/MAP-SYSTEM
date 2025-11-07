// src/api/useComments.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from './axios';

// Define the API endpoint as an environment variable to avoid hardcoding
const MESSAGING_API = import.meta.env.VITE_MESSAGING_API

export const useComments = (ticketId) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [connected, setConnected] = useState(false);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    current_page: 1,
    total_pages: 1
  });
  const { user } = useAuth();
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isConnectingRef = useRef(false); // Prevent multiple connection attempts

  const refreshComments = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

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

  // Add a new comment with optional file attachments
  const addComment = useCallback(async (content, files = []) => {
    if (!ticketId || !user?.id) {
      setError('Unable to add comment: Missing ticket ID or user information');
      return null;
    }

    const userRole = getUserRole();
    
    try {
      const formData = new FormData();
      formData.append('ticket_id', ticketId);
      formData.append('user_id', user.id);
      formData.append('firstname', user.first_name || user.firstname || '');
      formData.append('lastname', user.last_name || user.lastname || '');
      formData.append('role', userRole);
      formData.append('content', content);

      // Add files using the 'documents' field that the backend expects
      files.forEach((file) => {
        formData.append('documents', file);
      });

      const response = await api.post(`${MESSAGING_API}/api/comments/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Don't call refreshComments() - let WebSocket handle the update
      return response.data;
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to post your comment. Please try again.');
      return null;
    }
  }, [ticketId, user, getUserRole]);

  // Add a reply to a comment with optional file attachments
  const addReply = useCallback(async (parentCommentId, content, files = []) => {
    if (!ticketId || !user?.id) {
      setError('Unable to add reply: Missing ticket ID or user information');
      return null;
    }

    const userRole = getUserRole();
    
    try {
      const formData = new FormData();
      formData.append('user_id', user.id);
      formData.append('firstname', user.first_name || user.firstname || '');
      formData.append('lastname', user.last_name || user.lastname || '');
      formData.append('role', userRole);
      formData.append('content', content);

      // Add files if any
      files.forEach((file, index) => {
        if (index < 5) {
          formData.append('documents', file);
        }
      });

      const response = await api.post(`${MESSAGING_API}/api/comments/${parentCommentId}/reply/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Don't call refreshComments() - let WebSocket handle the update
      return response.data;
    } catch (err) {
      console.error('Error adding reply:', err);
      setError('Failed to post your reply. Please try again.');
      return null;
    }
  }, [ticketId, user, getUserRole]);

  // Add a reaction to a comment (like/dislike)
  const addReaction = useCallback(async (commentId, reactionType) => {
    if (!user?.id) {
      setError('Unable to react: Missing user information');
      return null;
    }

    const userRole = getUserRole();
    
    try {
      const response = await api.post(`${MESSAGING_API}/api/comments/${commentId}/rate/`, {
        user_id: user.id,
        firstname: user.first_name || user.firstname || '',
        lastname: user.last_name || user.lastname || '',
        role: userRole,
        rating: reactionType === 'like' ? true : false // Convert like/dislike to true/false
      });
      
      // Don't call refreshComments() - let WebSocket handle the update
      return response.data;
    } catch (err) {
      console.error('Error adding reaction:', err);
      setError('Failed to save your reaction. Please try again.');
      return null;
    }
  }, [user, getUserRole]);

  // Remove a reaction
  const removeReaction = useCallback(async (commentId) => {
    if (!user?.id) {
      setError('Unable to remove reaction: Missing user information');
      return false;
    }
    
    const userRole = getUserRole();
    
    try {
      await api.post(`${MESSAGING_API}/api/comments/${commentId}/rate/`, {
        user_id: user.id,
        firstname: user.first_name || user.firstname || '',
        lastname: user.last_name || user.lastname || '',
        role: userRole,
        rating: null // null to remove rating
      });
      
      // Don't call refreshComments() - let WebSocket handle the update
      return true;
    } catch (err) {
      console.error('Error removing reaction:', err);
      setError('Failed to remove your reaction. Please try again.');
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
      await api.delete(`${MESSAGING_API}/api/comments/${commentId}/`);
      
      // Don't call refreshComments() - let WebSocket handle the update
      return true;
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError('Failed to delete comment. Please try again.');
      return false;
    }
  }, []);

  // Attach document to existing comment
  const attachDocument = useCallback(async (commentId, files) => {
    if (!user?.id || !files?.length) {
      setError('Unable to attach document: Missing user information or files');
      return false;
    }

    const userRole = getUserRole();
    
    try {
      const formData = new FormData();
      formData.append('user_id', user.id);
      formData.append('firstname', user.first_name || user.firstname || '');
      formData.append('lastname', user.last_name || user.lastname || '');
      formData.append('role', userRole);

      // Add files
      files.forEach(file => {
        formData.append('documents', file);
      });

      const response = await api.post(`${MESSAGING_API}/api/comments/${commentId}/attach_document/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Don't call refreshComments() - let WebSocket handle the update
      return response.data;
    } catch (err) {
      console.error('Error attaching document:', err);
      setError('Failed to attach document. Please try again.');
      return false;
    }
  }, [user, getUserRole]);

  // Download document
  const downloadDocument = useCallback(async (documentId, filename) => {
    try {
      const response = await api.get(`${MESSAGING_API}/api/comments/download-document/${documentId}/`, {
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

  // Handle incoming WebSocket messages - moved up to avoid dependency issues
  const handleWebSocketMessage = useCallback((data) => {
    if (data.type === 'comment_update') {
      const { action, comment } = data;
      
      // Debug: Log the incoming comment data
      console.log('WebSocket comment update:', { action, comment });
      
      // Ensure the comment has proper document structure for images
      console.log('Incoming WebSocket comment:', comment);
      const processedComment = {
        ...comment,
        documents: (comment.documents || []).map(doc => {
          const inner = doc.document || doc; // <— this line is key
          return {
            ...doc,
            document: {
              ...inner,
              download_url: inner.download_url?.startsWith('http')
                ? inner.download_url
                : `${MESSAGING_API}${inner.download_url}`,
              is_image: inner.is_image || inner.content_type?.startsWith('image/'),
            },
          };
        }),
      };
      
      // Update comments state immediately without delays that could cause loops
      setComments(prevComments => {
        switch (action) {
          case 'create':
            // Add new comment if it's not already in the list
            if (!prevComments.find(c => c.comment_id === processedComment.comment_id)) {
              if (processedComment.parent) {
                // It's a reply - find parent and add to replies
                return prevComments.map(c => {
                  if (c.comment_id === processedComment.parent || c.id === processedComment.parent) {
                    return {
                      ...c,
                      replies: [...(c.replies || []), processedComment]
                    };
                  }
                  return c;
                });
              } else {
                // It's a top-level comment - add to beginning
                return [processedComment, ...prevComments];
              }
            }
            return prevComments;
            
          case 'reply':
            // Handle reply to existing comment
            if (processedComment.parent) {
              return prevComments.map(c => {
                if (c.comment_id === processedComment.parent || c.id === processedComment.parent) {
                  const existingReplies = c.replies || [];
                  const replyExists = existingReplies.find(r => r.comment_id === processedComment.comment_id);
                  if (!replyExists) {
                    return {
                      ...c,
                      replies: [...existingReplies, processedComment]
                    };
                  }
                }
                return c;
              });
            }
            return prevComments;
            
          case 'rate':
          case 'attach_document':
          case 'detach_document':
            // Update existing comment
            return prevComments.map(c => {
              if (c.comment_id === processedComment.comment_id) {
                return processedComment;
              }
              // Also check replies
              if (c.replies?.length > 0) {
                const updatedReplies = c.replies.map(reply => 
                  reply.comment_id === processedComment.comment_id ? processedComment : reply
                );
                return { ...c, replies: updatedReplies };
              }
              return c;
            });
            
          case 'delete':
            // Remove deleted comment
            return prevComments.filter(c => {
              if (c.comment_id === processedComment.comment_id) {
                return false;
              }
              // Also filter replies
              if (c.replies?.length > 0) {
                c.replies = c.replies.filter(reply => reply.comment_id !== processedComment.comment_id);
              }
              return true;
            });
            
          default:
            return prevComments;
        }
      });

      // Update pagination count for new comments
      if (action === 'create' && !processedComment.parent) {
        setPagination(prev => ({
          ...prev,
          count: prev.count + 1,
          total_pages: Math.ceil((prev.count + 1) / 10)
        }));
      }
    }
  }, [MESSAGING_API]);

  // WebSocket connection management - no dependencies to avoid loops
  const connectWebSocket = useCallback(() => {
    if (!ticketId || wsRef.current?.readyState === WebSocket.OPEN || isConnectingRef.current) {
      return;
    }

    isConnectingRef.current = true;

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = `${MESSAGING_API.replace('http', 'ws')}/ws/comments/${ticketId}/`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log(`WebSocket connected for ticket ${ticketId}`);
        setConnected(true);
        setError(null);
        isConnectingRef.current = false;
        
        // Clear any reconnection timeout
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
          console.error('Error parsing WebSocket message:', err);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log(`WebSocket disconnected for ticket ${ticketId}`, event.code, event.reason);
        setConnected(false);
        isConnectingRef.current = false;
        
        // Only auto-reconnect if not a manual close and we still have a ticketId
        if (event.code !== 1000 && ticketId && !reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            reconnectTimeoutRef.current = null;
            connectWebSocket();
          }, 3000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error(`WebSocket error for ticket ${ticketId}:`, error);
        setConnected(false);
        isConnectingRef.current = false;
      };
    } catch (err) {
      console.error('Error creating WebSocket connection:', err);
      setConnected(false);
      isConnectingRef.current = false;
    }
  }, [ticketId, MESSAGING_API, handleWebSocketMessage]);

  // Disconnect WebSocket - no dependencies
  const disconnectWebSocket = useCallback(() => {
    isConnectingRef.current = false;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000); // Normal closure
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  // Fetch comments for a ticket with pagination
  const fetchComments = useCallback(async (page = 1) => {
    if (!ticketId) return;

    setLoading(true);
    try {
      const response = await api.get(`${MESSAGING_API}/api/comments/?ticket_id=${ticketId}&page=${page}`);
      
      // Handle both paginated and non-paginated responses
      if (response.data.results) {
        // Paginated response
        setComments(response.data.results);
        setPagination({
          count: response.data.count,
          next: response.data.next,
          previous: response.data.previous,
          current_page: page,
          total_pages: Math.ceil(response.data.count / 10) // Assuming page size of 10
        });
      } else {
        // Non-paginated response (fallback)
        setComments(response.data);
        setPagination({
          count: response.data.length,
          next: null,
          previous: null,
          current_page: 1,
          total_pages: 1
        });
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Failed to load comments. Please try again later.');
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  // WebSocket connection effect - FIXED: Only depend on ticketId
  useEffect(() => {
    if (ticketId) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    // Cleanup on unmount or ticketId change
    return () => {
      disconnectWebSocket();
    };
  }, [ticketId]); // ONLY ticketId dependency to prevent loops

  // Effect to fetch comments when ticketId changes or refreshKey is updated
  useEffect(() => {
    fetchComments();
  }, [fetchComments, refreshKey]);

  return {
    comments,
    loading,
    error,
    pagination,
    connected, // Add WebSocket connection status
    addComment,
    addReply,
    addReaction,
    removeReaction,
    deleteComment,
    attachDocument,
    downloadDocument,
    refreshComments,
    fetchComments, // Expose for pagination
    connectWebSocket, // Expose for manual reconnection
    disconnectWebSocket // Expose for manual disconnection
  };
};

export default useComments;