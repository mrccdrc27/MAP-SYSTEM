// src/api/useCommentsWebSocket.jsx
import { useState, useEffect, useCallback, useRef } from 'react';

// Define the API endpoint as an environment variable to avoid hardcoding
const MESSAGING_API = import.meta.env.VITE_MESSAGING_API || 'http://localhost:8005';

export const useCommentsWebSocket = (ticketId, onCommentsUpdate) => {
  const [comments, setComments] = useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    current_page: 1,
    total_pages: 1
  });
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isConnectingRef = useRef(false);

  // Initialize comments and pagination from external source
  const initializeComments = useCallback((commentsData, paginationData) => {
    setComments(commentsData || []);
    setPagination(paginationData || {
      count: 0,
      next: null,
      previous: null,
      current_page: 1,
      total_pages: 1
    });
  }, []);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((data) => {
    console.log('WebSocket message received:', data);
    
    // Handle different message types from the refactored backend
    if (data.type === 'connection_established') {
      console.log('WebSocket connected:', data.message);
      return;
    }
    
    if (data.type === 'pong') {
      console.log('WebSocket pong received');
      return;
    }
    
    if (data.type === 'error') {
      console.error('WebSocket error:', data.message);
      setError(`WebSocket error: ${data.message}`);
      return;
    }
    
    if (data.type === 'notification') {
      console.log('WebSocket notification:', data.message);
      return;
    }
    
    // Handle comment updates - this is the main message type from backend
    if (data.type === 'comment_update') {
      const { action, comment, deleted_comment_id, rating_data, document_info } = data;
      
      console.log('Processing comment action:', { action, comment, deleted_comment_id });
      
      // Handle DELETE action - remove comment from state
      if (action === 'delete') {
        setComments(prevComments => {
          const deleteCommentById = (comments, idToDelete) => {
            return comments.reduce((acc, c) => {
              // Check both id and comment_id for matching
              const commentIdMatch = c.id === idToDelete || 
                                   c.comment_id === comment?.comment_id ||
                                   (c.comment_id || c.id) === idToDelete;
              
              if (commentIdMatch) {
                console.log('Removing comment:', idToDelete, c.comment_id);
                return acc; // Skip this comment (delete it)
              }
              
              // Process replies recursively
              const updatedComment = { ...c };
              if (c.replies && c.replies.length > 0) {
                const originalRepliesLength = c.replies.length;
                updatedComment.replies = deleteCommentById(c.replies, idToDelete);
                // If replies were modified, log it
                if (updatedComment.replies.length !== originalRepliesLength) {
                  console.log(`Removed reply from comment ${c.comment_id}`);
                }
              }
              
              acc.push(updatedComment);
              return acc;
            }, []);
          };
          
          const commentIdToDelete = deleted_comment_id || comment?.id;
          if (commentIdToDelete) {
            const newComments = deleteCommentById(prevComments, commentIdToDelete);
            console.log(`Comments before delete: ${prevComments.length}, after: ${newComments.length}`);
            return newComments;
          }
          return prevComments;
        });
        
        // Update pagination count for deleted comments
        setPagination(prev => ({
          ...prev,
          count: Math.max(0, prev.count - 1),
          total_pages: Math.ceil(Math.max(0, prev.count - 1) / 10)
        }));
        return;
      }
      
      // For other actions, ensure we have comment data
      if (!comment) {
        console.warn('WebSocket message missing comment data:', data);
        return;
      }
      
      // Process comment data with proper document structure and fix field names
      const processedComment = {
        ...comment,
        // Map backend fields to frontend expected fields
        id: comment.id || comment.comment_id,
        content: comment.content || comment.text,
        user_id: comment.user_id,
        firstname: comment.firstname,
        lastname: comment.lastname,
        role: comment.role,
        created_at: comment.created_at,
        parent: comment.parent, // Keep the parent ID as-is for reply matching
        // Handle reactions/ratings - map thumbs counts to reactions
        reactions: comment.ratings || [],
        thumbs_up_count: comment.thumbs_up_count || 0,
        thumbs_down_count: comment.thumbs_down_count || 0,
        // Process replies
        replies: (comment.replies || []).map(reply => ({
          ...reply,
          id: reply.id || reply.comment_id,
          content: reply.content || reply.text,
          reactions: reply.ratings || [],
          thumbs_up_count: reply.thumbs_up_count || 0,
          thumbs_down_count: reply.thumbs_down_count || 0,
          documents: (reply.documents || []).map(doc => {
            const inner = doc.document || doc;
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
        })),
        // Process documents
        documents: (comment.documents || []).map(doc => {
          const inner = doc.document || doc;
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
      
      // Update comments state based on action
      setComments(prevComments => {
        const updateCommentById = (comments, updatedComment) => {
          let wasUpdated = false;
          const newComments = comments.map(c => {
            // Check if this is the comment to update
            const isMatch = (c.comment_id === updatedComment.comment_id) || 
                           (c.id === updatedComment.id) ||
                           ((c.comment_id || c.id) === (updatedComment.comment_id || updatedComment.id));
            
            if (isMatch) {
              console.log(`Updating comment ${c.comment_id || c.id} with action: ${action}`);
              wasUpdated = true;
              return updatedComment;
            }
            
            // Check replies recursively
            if (c.replies && c.replies.length > 0) {
              const updatedReplies = updateCommentById(c.replies, updatedComment);
              if (updatedReplies !== c.replies) {
                wasUpdated = true;
                return { ...c, replies: updatedReplies };
              }
            }
            
            return c;
          });
          
          return wasUpdated ? newComments : comments;
        };
        
        const addCommentOrReply = (comments, newComment) => {
          if (newComment.parent) {
            // It's a reply - find parent by checking both database ID and comment_id
            let wasAdded = false;
            const newComments = comments.map(c => {
              const isParent = (c.comment_id || c.id) === newComment.parent;

              if (isParent) {
                const existingReplies = c.replies || [];
                const replyExists = existingReplies.find(r => 
                  (r.comment_id === newComment.comment_id) || 
                  (r.id === newComment.id) ||
                  ((r.comment_id || r.id) === (newComment.comment_id || newComment.id))
                );
                if (!replyExists) {
                  console.log(`Adding reply to comment ${c.comment_id || c.id}`);
                  wasAdded = true;
                  return {
                    ...c,
                    replies: [newComment, ...existingReplies].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                  };
                } else {
                  console.log(`Reply already exists for comment ${c.comment_id || c.id}`);
                }
              }
              return c;
            });

            if (!wasAdded) {
              console.log(`Could not find parent comment with ID ${newComment.parent} for reply ${newComment.comment_id}`);
              const commentExists = comments.find(c => 
                (c.comment_id === newComment.comment_id) || 
                (c.id === newComment.id) ||
                ((c.comment_id || c.id) === (newComment.comment_id || newComment.id))
              );
              if (!commentExists) {
                console.log('Adding orphaned reply as top-level comment:', newComment.comment_id);
                return [newComment, ...comments];
              }
            }

            return wasAdded ? newComments : comments;
          } else {
            // It's a top-level comment - add to beginning if not exists
            const commentExists = comments.find(c => 
              (c.comment_id === newComment.comment_id) || 
              (c.id === newComment.id) ||
              ((c.comment_id || c.id) === (newComment.comment_id || newComment.id))
            );
            if (!commentExists) {
              console.log('Adding new top-level comment:', newComment.comment_id);
              return [newComment, ...comments];
            } else {
              console.log('Top-level comment already exists:', newComment.comment_id);
            }
          }
          return comments;
        };
        
        switch (action) {
          case 'create':
            return addCommentOrReply(prevComments, processedComment);
            
          case 'reply':
            return addCommentOrReply(prevComments, processedComment);
            
          case 'update':
          case 'rate':
          case 'attach_document':
          case 'detach_document':
            const updatedComments = updateCommentById(prevComments, processedComment);
            if (updatedComments === prevComments) {
              console.log('No comment was updated for action:', action);
            }
            return updatedComments;
            
          default:
            console.log('Unknown comment action:', action);
            return prevComments;
        }
      });

      // Update pagination count for new top-level comments only
      if (action === 'create' && !processedComment.parent) {
        setPagination(prev => ({
          ...prev,
          count: prev.count + 1,
          total_pages: Math.ceil((prev.count + 1) / 10)
        }));
      }

      // Notify parent component of comments update if callback provided
      if (onCommentsUpdate) {
        onCommentsUpdate(action, processedComment);
      }
    } else {
      console.log('Unknown WebSocket message type:', data.type);
    }
  }, [MESSAGING_API, onCommentsUpdate]);

  // WebSocket connection management
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

  // Disconnect WebSocket
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

  // WebSocket connection effect - Only depend on ticketId
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
  }, [ticketId, connectWebSocket, disconnectWebSocket]);

  return {
    comments,
    connected,
    error: error, // WebSocket-specific errors
    pagination,
    initializeComments,
    connectWebSocket,
    disconnectWebSocket,
  };
};

export default useCommentsWebSocket;