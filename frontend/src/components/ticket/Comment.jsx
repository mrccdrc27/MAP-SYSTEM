// src/components/ticket/Comment.jsx
import React, { useState } from "react";
import ReactDOM from "react-dom";
import { format } from "date-fns";
import DocumentAttachment from "./DocumentAttachment";
import ImageCarousel from "./ImageCarousel";
import FileUpload from "./FileUpload";

import styles from "./ticketComments.module.css";

const Comment = ({
  comment,
  onReply,
  onReaction,
  onDelete,
  onDownloadDocument,
  canDelete = false,
  currentUserId,
  isReply = false,
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replyFiles, setReplyFiles] = useState([]);
  const [clearReplyFilesTrigger, setClearReplyFilesTrigger] = useState(0);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isRatingLoading, setIsRatingLoading] = useState(false); // Prevent double clicks

  const MAX_CONTENT_LENGTH = 200;

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, "h:mm a | MMM d, yyyy");
    } catch (e) {
      return "Invalid date";
    }
  };

  // Separate images from other documents
  const separateDocuments = (documents) => {
    if (!documents || !Array.isArray(documents))
      return { images: [], nonImages: [] };

    const images = [];
    const nonImages = [];

    documents.forEach((docAttachment) => {
      const doc = docAttachment.document;
      if (doc.is_image || doc.content_type?.startsWith("image/")) {
        images.push(doc);
      } else {
        nonImages.push(doc);
      }
    });

    return { images, nonImages };
  };

  const { images, nonImages } = separateDocuments(comment.documents);

  const handleImageClick = (image, index) => {
    setSelectedImageIndex(index);
    setShowImageModal(true);
  };

  // Check if the current user has already reacted
  const userReaction = comment.reactions?.find(
    (reaction) => reaction.user_id === currentUserId
  );

  // Truncate comment content if it's too long
  const truncatedContent =
    comment.content.length > MAX_CONTENT_LENGTH
      ? comment.content.slice(0, MAX_CONTENT_LENGTH) + "..."
      : comment.content;

  const handleToggleContent = () => {
    setIsContentExpanded(!isContentExpanded);
  };

  const handleReplySubmit = (e) => {
    e.preventDefault();
    if (replyContent.trim()) {
      onReply(comment.id, replyContent, replyFiles);
      setReplyContent("");
      setReplyFiles([]);
      setShowReplyForm(false);
      setClearReplyFilesTrigger((prev) => prev + 1);
    }
  };

  const handleLikeClick = async () => {
    if (isRatingLoading) return; // Prevent double clicks

    setIsRatingLoading(true);

    try {
      if (userReaction && userReaction.reaction_type === "like") {
        // User already liked, so remove the like
        await onReaction(comment.id, userReaction.id, null);
      } else {
        // User hasn't liked or has disliked, so add/change to like
        await onReaction(comment.id, userReaction?.id, "like");
      }
    } catch (error) {
      console.error("Error handling like:", error);
    } finally {
      // Add a small delay to prevent rapid clicking
      setTimeout(() => {
        setIsRatingLoading(false);
      }, 500);
    }
  };

  const handleDislikeClick = async () => {
    if (isRatingLoading) return; // Prevent double clicks

    setIsRatingLoading(true);

    try {
      if (userReaction && userReaction.reaction_type === "dislike") {
        // User already disliked, so remove the dislike
        await onReaction(comment.id, userReaction.id, null);
      } else {
        // User hasn't disliked or has liked, so add/change to dislike
        await onReaction(comment.id, userReaction?.id, "dislike");
      }
    } catch (error) {
      console.error("Error handling dislike:", error);
    } finally {
      // Add a small delay to prevent rapid clicking
      setTimeout(() => {
        setIsRatingLoading(false);
      }, 500);
    }
  };

  const getLikeCount = () => {
    if (comment.thumbs_up_count !== undefined) {
      return comment.thumbs_up_count;
    }
    return (
      comment.reactions?.filter((r) => r.reaction_type === "like").length || 0
    );
  };

  const getDislikeCount = () => {
    if (comment.thumbs_down_count !== undefined) {
      return comment.thumbs_down_count;
    }
    return (
      comment.reactions?.filter((r) => r.reaction_type === "dislike").length ||
      0
    );
  };

  return (
    <>
      <div className={styles.commentCard}>
        <div className={styles.commentBody}>
          <div className={styles.commentHeader}>
            <div className={styles.userInfo}>
              <span className={styles.commentAuthor}>
                {comment.firstname || comment.user?.first_name}{" "}
                {comment.lastname || comment.user?.last_name}
              </span>
              {(comment.role || comment.user?.role) && (
                <span className={styles.userRole}>
                  {comment.role || comment.user?.role}
                </span>
              )}
            </div>
            <span className={styles.commentTime}>
              {formatDate(comment.created_at)}
            </span>
          </div>

          <div className={styles.commentContent}>
            {isContentExpanded || comment.content.length <= MAX_CONTENT_LENGTH
              ? comment.content
              : truncatedContent}
            {comment.content.length > MAX_CONTENT_LENGTH && (
              <button
                className={styles.seeMoreButton}
                onClick={handleToggleContent}
              >
                {isContentExpanded ? "See Less" : "See More"}
              </button>
            )}
          </div>

          {/* Display images directly in the comment */}
          {images.length > 0 && (
            <div className={styles.imagesSection}>
              <ImageCarousel images={images} onImageClick={handleImageClick} />
            </div>
          )}

          {/* Display non-image attachments separately */}
          {nonImages.length > 0 && (
            <div className={styles.documentsContainer}>
              <div className={styles.documentsHeader}>
                <i className="fas fa-paperclip"></i>
                <span>Attachments ({nonImages.length})</span>
              </div>
              <div className={styles.documentsList}>
                {nonImages.map((document, index) => (
                  <DocumentAttachment
                    key={`${document.id}-${index}`}
                    document={document}
                    onDownload={onDownloadDocument}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.commentActions}>
          <button
            className={`${styles.actionButton} ${
              userReaction?.reaction_type === "like"
                ? styles.actionButtonActive
                : ""
            } ${isRatingLoading ? styles.actionButtonLoading : ""}`}
            onClick={handleLikeClick}
            disabled={isRatingLoading}
          >
            <i className="fa-solid fa-thumbs-up"></i> {getLikeCount()}
          </button>

          <button
            className={`${styles.actionButton} ${
              userReaction?.reaction_type === "dislike"
                ? styles.actionButtonActive
                : ""
            } ${isRatingLoading ? styles.actionButtonLoading : ""}`}
            onClick={handleDislikeClick}
            disabled={isRatingLoading}
          >
            <i className="fa-solid fa-thumbs-down"></i> {getDislikeCount()}
          </button>

          {/* Only show reply button if this is not already a reply */}
          {!isReply && (
            <button
              className={styles.actionButton}
              onClick={() => setShowReplyForm(!showReplyForm)}
            >
              <i className="fa-solid fa-reply"></i> Reply
            </button>
          )}

          {/* Delete button shown only when user can delete */}
          {canDelete && (
            <button
              className={styles.actionButton}
              onClick={() => {
                if (onDelete) {
                  const confirmed = window.confirm("Delete this comment?");
                  if (confirmed) onDelete(comment.id);
                }
              }}
            >
              <i className="fa-solid fa-trash"></i> Delete
            </button>
          )}
        </div>

        {showReplyForm && (
          <form className={styles.replyForm} onSubmit={handleReplySubmit}>
            <div className={styles.replyFormWrapper}>
              <textarea
                className={styles.replyInput}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                rows="3"
              />

              <FileUpload
                onFilesSelected={setReplyFiles}
                maxFiles={3}
                uniqueId={`reply-file-upload-${comment.id}`}
                clearTrigger={clearReplyFilesTrigger}
              />
            </div>
            <div className={styles.replyFormActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => {
                  setShowReplyForm(false);
                  setReplyContent("");
                  setReplyFiles([]);
                }}
              >
                Cancel
              </button>
              <button type="submit" className={styles.replyButton}>
                Reply
              </button>
            </div>
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
                onDownloadDocument={onDownloadDocument}
                currentUserId={currentUserId}
                isReply={true} // Mark this as a reply so it won't show the reply button
              />
            ))}
          </div>
        )}
      </div>

      {/* Render Image Modal using React Portal for true full-screen */}
      {showImageModal &&
        images.length > 0 &&
        ReactDOM.createPortal(
          <div
            className={styles.imageModal}
            onClick={() => setShowImageModal(false)}
          >
            <div
              className={styles.imageModalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className={styles.closeModalButton}
                onClick={() => setShowImageModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
              <img
                src={images[selectedImageIndex].download_url}
                alt={images[selectedImageIndex].original_filename}
                className={styles.modalImage}
              />
              <div className={styles.imageModalInfo}>
                <span className={styles.modalImageName}>
                  {images[selectedImageIndex].original_filename}
                </span>
                {images[selectedImageIndex].image_info && (
                  <span className={styles.modalImageDimensions}>
                    {images[selectedImageIndex].image_info.dimensions}
                  </span>
                )}
              </div>
              {images.length > 1 && (
                <div className={styles.modalNavigation}>
                  <button
                    className={styles.modalNavButton}
                    onClick={() =>
                      setSelectedImageIndex(
                        (prev) => (prev - 1 + images.length) % images.length
                      )
                    }
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  <span className={styles.modalCounter}>
                    {selectedImageIndex + 1} / {images.length}
                  </span>
                  <button
                    className={styles.modalNavButton}
                    onClick={() =>
                      setSelectedImageIndex(
                        (prev) => (prev + 1) % images.length
                      )
                    }
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default Comment;
