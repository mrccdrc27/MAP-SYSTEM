// src/components/ticket/TicketComments.jsx
import React, { useState } from "react";
import { format } from "date-fns";
import { useAuth } from "../../api/AuthContext";
import useComments from "../../api/useComments";
import styles from "./ticketComments.module.css";

// Comment component to render individual comments
const Comment = ({ comment, onReply, onReaction, currentUserId }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, "h:mm a | MMM d, yyyy");
    } catch (e) {
      return "Invalid date";
    }
  };

  // Check if the current user has already reacted
  const userReaction = comment.reactions?.find(
    reaction => reaction.user_id === currentUserId
  );

  const handleReplySubmit = (e) => {
    e.preventDefault();
    if (replyContent.trim()) {
      onReply(comment.id, replyContent);
      setReplyContent("");
      setShowReplyForm(false);
    }
  };

  const handleLikeClick = () => {
    if (userReaction && userReaction.reaction_type === "like") {
      onReaction(comment.id, userReaction.id, null); // Remove reaction
    } else {
      onReaction(comment.id, userReaction?.id, "like"); // Add/change to like
    }
  };

  const handleDislikeClick = () => {
    if (userReaction && userReaction.reaction_type === "dislike") {
      onReaction(comment.id, userReaction.id, null); // Remove reaction
    } else {
      onReaction(comment.id, userReaction?.id, "dislike"); // Add/change to dislike
    }
  };

  const getLikeCount = () => {
    // Use the thumbs_up_count directly from the API response if available
    if (comment.thumbs_up_count !== undefined) {
      return comment.thumbs_up_count;
    }
    // Fallback to the original calculation method
    return comment.reactions?.filter(r => r.reaction_type === "like").length || 0;
  };

  const getDislikeCount = () => {
    // Use the thumbs_down_count directly from the API response if available
    if (comment.thumbs_down_count !== undefined) {
      return comment.thumbs_down_count;
    }
    // Fallback to the original calculation method
    return comment.reactions?.filter(r => r.reaction_type === "dislike").length || 0;
  };

  return (
    <div className={styles.commentCard}>
      <div className={styles.commentHeader}>
        <div className={styles.userInfo}>
          <span className={styles.commentAuthor}>
            {comment.firstname || comment.user?.first_name} {comment.lastname || comment.user?.last_name}
          </span>
          {(comment.role || comment.user?.role) && (
            <span className={styles.userRole}>{comment.role || comment.user?.role}</span>
          )}
        </div>
        <span className={styles.commentTime}>{formatDate(comment.created_at)}</span>
      </div>
      
      <div className={styles.commentContent}>{comment.content}</div>
      
      <div className={styles.commentActions}>
        <button 
          className={`${styles.actionButton} ${userReaction?.reaction_type === "like" ? styles.actionButtonActive : ""}`}
          onClick={handleLikeClick}
        >
          <i className="fa-solid fa-thumbs-up"></i> {getLikeCount()}
        </button>
        
        <button 
          className={`${styles.actionButton} ${userReaction?.reaction_type === "dislike" ? styles.actionButtonActive : ""}`}
          onClick={handleDislikeClick}
        >
          <i className="fa-solid fa-thumbs-down"></i> {getDislikeCount()}
        </button>
        
        <button 
          className={styles.actionButton} 
          onClick={() => setShowReplyForm(!showReplyForm)}
        >
          <i className="fa-solid fa-reply"></i> Reply
        </button>
      </div>
      
      {showReplyForm && (
        <form className={styles.replyForm} onSubmit={handleReplySubmit}>
          <input
            type="text"
            className={styles.replyInput}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
          />
          <button type="submit" className={styles.replyButton}>
            Reply
          </button>
        </form>
      )}
      
      {comment.replies && comment.replies.length > 0 && (
        <div className={styles.repliesContainer}>
          {comment.replies.map((reply) => (
            <Comment
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onReaction={onReaction}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Loading spinner component
const LoadingSpinner = () => (
  <div className={styles.loadingSpinner}>
    <div className={styles.loadingDots}>
      <div className={styles.loadingDot}></div>
      <div className={styles.loadingDot}></div>
      <div className={styles.loadingDot}></div>
    </div>
  </div>
);

// Empty state component
const EmptyState = () => (
  <div className={styles.emptyStateContainer}>
    <i className="fa-regular fa-comments styles.emptyStateIcon"></i>
    <p className={styles.emptyStateText}>No comments yet. Be the first to start a conversation!</p>
  </div>
);

// Error state component
const ErrorState = ({ message, onRetry }) => (
  <div className={styles.errorMessage}>
    <p>{message}</p>
    {onRetry && (
      <button onClick={onRetry} className={styles.actionButton}>
        <i className="fa-solid fa-rotate"></i> Retry
      </button>
    )}
  </div>
);

const TicketComments = ({ ticketId }) => {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState("");
  
  const {
    comments,
    loading,
    error,
    addComment,
    addReply,
    addReaction,
    removeReaction,
    refreshComments
  } = useComments(ticketId);

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (newComment.trim()) {
      await addComment(newComment);
      setNewComment("");
    }
  };

  const handleReply = async (parentId, content) => {
    await addReply(parentId, content);
  };

  const handleReaction = async (commentId, existingReactionId, reactionType) => {
    if (!reactionType && existingReactionId) {
      // Remove reaction
      await removeReaction(existingReactionId);
    } else if (existingReactionId) {
      // Update existing reaction
      // For simplicity, we'll remove and re-add
      await removeReaction(existingReactionId);
      if (reactionType) {
        await addReaction(commentId, reactionType);
      }
    } else if (reactionType) {
      // Add new reaction
      await addReaction(commentId, reactionType);
    }
  };

  // Organize comments into a tree structure (root comments and their replies)
  const organizedComments = React.useMemo(() => {
    if (!comments) return [];
    
    console.log("Raw comments data:", comments);
    
    // Map the comments to include the 'id' field expected by the component
    // Use the already nested 'replies' structure from the API
    const mappedComments = comments.map(comment => {
      // Process the main comment
      const processedComment = {
        ...comment,
        id: comment.comment_id,
        parent_id: comment.parent,
      };

      // Process any replies that come pre-nested from the API
      if (comment.replies && Array.isArray(comment.replies)) {
        processedComment.replies = comment.replies.map(reply => ({
          ...reply,
          id: reply.comment_id,
          parent_id: reply.parent || comment.comment_id
        }));
      }
      
      return processedComment;
    });
    
    // Filter to only include root comments (those without a parent)
    const rootComments = mappedComments.filter(comment => !comment.parent);
    
    console.log("Organized comments:", rootComments);
    return rootComments;
  }, [comments]);

  if (!ticketId) {
    return (
      <div className={styles.commentsSection}>
        <ErrorState message="No ticket ID provided. Comments cannot be loaded." />
      </div>
    );
  }

  return (
    <div className={styles.commentsSection}>
      <h3>Comments</h3>
      
      <div className={styles.commentsList}>
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorState 
            message={error} 
            onRetry={refreshComments} 
          />
        ) : organizedComments.length === 0 ? (
          <EmptyState />
        ) : (
          organizedComments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              onReply={handleReply}
              onReaction={handleReaction}
              currentUserId={user?.id}
            />
          ))
        )}
      </div>
      
      <form onSubmit={handleSendComment} className={styles.commentForm}>
        <textarea
          className={styles.commentInput}
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={loading}
        />
        <button 
          className={styles.commentButton} 
          type="submit"
          disabled={loading || !newComment.trim()}
        >
          <i className="fa-solid fa-paper-plane"></i> Send
        </button>
      </form>
    </div>
  );
};

export default TicketComments;