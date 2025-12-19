// src/components/ticket/TicketComments.jsx
import React, { useState } from "react";

import { useAuth } from "../../context/AuthContext";
import useComments from "../../api/comments/useComments";

import Comment from "./Comment";
import FileUpload from "./FileUpload";
import Pagination from "./Pagination";
import { LoadingSpinner, EmptyState, ErrorState } from "./CommentUtilities";
import styles from "./ticketComments.module.css";
import ConfirmModal from "../modal/ConfirmModal";

const TicketComments = ({ ticketId }) => {
  const { user, isAdmin } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [clearAttachmentFilesTrigger, setClearAttachmentFilesTrigger] =
    useState(0);

  // console.log("User:", user);
  // console.log("Is admin:", typeof isAdmin === "function" ? isAdmin() : isAdmin);

  const {
    comments,
    loading,
    error,
    pagination,
    addComment,
    addReply,
    addReaction,
    removeReaction,
    deleteComment,
    downloadDocument,
    refreshComments,
    fetchComments,
  } = useComments(ticketId);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState({
    title: "",
    message: "",
    id: null,
  });

  const handleDelete = (commentId) => {
    if (!commentId) return;
    setConfirmData({
      title: "Delete comment",
      message:
        "Are you sure you want to delete this comment? This cannot be undone.",
      id: commentId,
    });
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    setConfirmOpen(false);
    if (!confirmData.id) return;

    const success = await deleteComment(confirmData.id);
    if (!success) {
      console.error("Failed to delete comment", confirmData.id);
    }
    setConfirmData({ title: "", message: "", id: null });
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (newComment.trim()) {
      console.log("Sending comment with files:", attachmentFiles);
      const result = await addComment(newComment, attachmentFiles);
      if (result) {
        setNewComment("");
        setAttachmentFiles([]);
        setClearAttachmentFilesTrigger((prev) => prev + 1);
        console.log("Comment sent successfully");
      } else {
        console.error("Failed to send comment");
      }
    }
  };

  const handleReply = async (parentId, content, files = []) => {
    console.log("Sending reply with files:", files);
    const result = await addReply(parentId, content, files);
    if (result) {
      console.log("Reply sent successfully");
    } else {
      console.error("Failed to send reply");
    }
  };

  const handleReaction = async (
    commentId,
    existingReactionId,
    reactionType
  ) => {
    if (!reactionType && existingReactionId) {
      // Remove reaction - use commentId, not the rating ID
      await removeReaction(commentId);
    } else if (existingReactionId) {
      // Update existing reaction - just add new type (backend handles upsert)
      await addReaction(commentId, reactionType);
    } else if (reactionType) {
      // Add new reaction
      await addReaction(commentId, reactionType);
    }
  };

  const handleDownloadDocument = async (documentId, filename) => {
    await downloadDocument(documentId, filename);
  };

  const handlePageChange = (page) => {
    fetchComments(page);
  };

  // Organize comments into a tree structure (root comments and their replies)
  const organizedComments = React.useMemo(() => {
    if (!comments) return [];

    // Map the comments to include the 'id' field expected by the component
    // Use the already nested 'replies' structure from the API
    const mappedComments = comments.map((comment) => {
      // Process the main comment
      const processedComment = {
        ...comment,
        id: comment.comment_id,
        parent_id: comment.parent,
      };

      // Process any replies that come pre-nested from the API
      if (comment.replies && Array.isArray(comment.replies)) {
        processedComment.replies = comment.replies.map((reply) => ({
          ...reply,
          id: reply.comment_id,
          parent_id: reply.parent || comment.comment_id,
        }));
      }

      return processedComment;
    });

    // Filter to only include root comments (those without a parent)
    const rootComments = mappedComments.filter((comment) => !comment.parent);

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
      <div className={styles.commentsHeader}>
        <h3>Comments</h3>
        {pagination.count > 0 && (
          <span className={styles.commentsCount}>
            {pagination.count} comment{pagination.count !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className={styles.commentsList}>
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorState message={error} onRetry={refreshComments} />
        ) : organizedComments.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {organizedComments.map((comment) => (
              <Comment
                key={comment.id}
                comment={comment}
                onReply={handleReply}
                onReaction={handleReaction}
                onDelete={handleDelete}
                onDownloadDocument={handleDownloadDocument}
                canDelete={
                  (user?.id && String(user.id) === String(comment.user_id)) ||
                  (typeof isAdmin === "function" ? isAdmin() : false)
                }
                currentUserId={user?.id}
              />
            ))}

            <Pagination
              pagination={pagination}
              onPageChange={handlePageChange}
              loading={loading}
            />
          </>
        )}
      </div>

      <form onSubmit={handleSendComment} className={styles.commentForm}>
        <textarea
          className={styles.commentInput}
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={loading}
          rows="4"
        />

        <FileUpload
          onFilesSelected={setAttachmentFiles}
          maxFiles={5}
          uniqueId="comment-file-upload"
          clearTrigger={clearAttachmentFilesTrigger}
        />

        <div className={styles.commentFormActions}>
          <div className={styles.attachmentInfo}>
            {attachmentFiles.length > 0 && (
              <span className={styles.fileCount}>
                <i className="fas fa-paperclip"></i>
                {attachmentFiles.length} file
                {attachmentFiles.length !== 1 ? "s" : ""} selected
              </span>
            )}
          </div>
          <button
            className={styles.commentButton}
            type="submit"
            disabled={loading || !newComment.trim()}
          >
            <i className="fa-solid fa-paper-plane"></i> Send
          </button>
        </div>
      </form>
      <ConfirmModal
        isOpen={confirmOpen}
        title={confirmData.title}
        message={confirmData.message}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};

export default TicketComments;
