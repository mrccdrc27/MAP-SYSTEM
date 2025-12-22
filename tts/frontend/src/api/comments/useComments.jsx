// src/useComments.jsx
import { useState, useEffect, useCallback } from 'react';
import { useCommentsHttp } from './useCommentsHttp';
import { useCommentsWebSocket } from './useCommentsWebSocket';

export const useComments = (ticketId) => {
  const [refreshKey, setRefreshKey] = useState(0);
  
  // HTTP hook for API requests
  const {
    loading,
    error: httpError,
    fetchComments,
    addComment: httpAddComment,
    addReply: httpAddReply,
    addReaction: httpAddReaction,
    removeReaction: httpRemoveReaction,
    deleteComment: httpDeleteComment,
    attachDocument: httpAttachDocument,
    downloadDocument,
  } = useCommentsHttp(ticketId);

  // WebSocket hook for real-time updates
  const {
    comments,
    connected,
    error: wsError,
    pagination,
    initializeComments,
    connectWebSocket,
    disconnectWebSocket,
  } = useCommentsWebSocket(ticketId);

  // Combine errors from both hooks
  const error = httpError || wsError;

  const refreshComments = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // Wrapper functions that make HTTP requests but let WebSocket handle updates
  const addComment = useCallback(async (content, files = []) => {
    const result = await httpAddComment(content, files);
    // WebSocket will handle the UI update automatically
    return result;
  }, [httpAddComment]);

  const addReply = useCallback(async (parentCommentId, content, files = []) => {
    const result = await httpAddReply(parentCommentId, content, files);
    // WebSocket will handle the UI update automatically
    return result;
  }, [httpAddReply]);

  const addReaction = useCallback(async (commentId, reactionType) => {
    const result = await httpAddReaction(commentId, reactionType);
    // WebSocket will handle the UI update automatically
    return result;
  }, [httpAddReaction]);

  const removeReaction = useCallback(async (commentId) => {
    const result = await httpRemoveReaction(commentId);
    // WebSocket will handle the UI update automatically
    return result;
  }, [httpRemoveReaction]);

  const deleteComment = useCallback(async (commentId) => {
    const result = await httpDeleteComment(commentId);
    // WebSocket will handle the UI update automatically
    return result;
  }, [httpDeleteComment]);

  const attachDocument = useCallback(async (commentId, files) => {
    const result = await httpAttachDocument(commentId, files);
    // WebSocket will handle the UI update automatically
    return result;
  }, [httpAttachDocument]);

  // Effect to fetch comments when ticketId changes or refreshKey is updated
  useEffect(() => {
    const loadComments = async () => {
      if (ticketId) {
        const result = await fetchComments();
        if (result) {
          // Initialize WebSocket hook with the fetched data
          initializeComments(result.comments, result.pagination);
        }
      }
    };
    
    loadComments();
  }, [ticketId, fetchComments, initializeComments, refreshKey]);

  return {
    comments,
    loading,
    error,
    pagination,
    connected, // WebSocket connection status
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