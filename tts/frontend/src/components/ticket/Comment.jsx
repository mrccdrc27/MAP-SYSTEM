// src/components/ticket/Comment.jsx
import React, { useState, useMemo } from "react";
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
  const [isRatingLoading, setIsRatingLoading] = useState(false);

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

  // Get like/dislike counts - use thumbs counts from backend
  const likeCount = useMemo(() => {
    return comment.thumbs_up_count ?? 0;
  }, [comment.thumbs_up_count]);

  const dislikeCount = useMemo(() => {
    return comment.thumbs_down_count ?? 0;
  }, [comment.thumbs_down_count]);

  // Check if current user has reacted - look in reactions/ratings array
  // Backend stores: rating=true (like) or rating=false (dislike)
  const userReaction = useMemo(() => {
    const reactions = comment.reactions || comment.ratings || [];
    const userIdStr = String(currentUserId);
    
    const found = reactions.find((r) => {
      const rUserId = String(r.user_id);
      return rUserId === userIdStr;
    });
    
    if (!found) return null;
    
    // Convert backend format to frontend format
    // Backend: rating: true/false
    // Frontend expects: reaction_type: 'like'/'dislike'
    return {
      ...found,
      reaction_type: found.rating === true ? "like" : found.rating === false ? "dislike" : null,
    };
  }, [comment.reactions, comment.ratings, currentUserId]);

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
      // Use comment_id (CX format) for replies
      onReply(comment.comment_id || comment.id, replyContent, replyFiles);
      setReplyContent("");
      setReplyFiles([]);
      setShowReplyForm(false);
      setClearReplyFilesTrigger((prev) => prev + 1);
    }
  };

  const handleLikeClick = async () => {
    if (isRatingLoading) return;

    setIsRatingLoading(true);

    try {
      if (userReaction?.reaction_type === "like") {
        // User already liked, toggle off (remove)
        await onReaction(comment.comment_id || comment.id, userReaction.id, null);
      } else {
        // Add or change to like
        await onReaction(comment.comment_id || comment.id, userReaction?.id, "like");
      }
    } catch (error) {
      console.error("Error handling like:", error);
    } finally {
      setTimeout(() => {
        setIsRatingLoading(false);
      }, 300);
    }
  };

  const handleDislikeClick = async () => {
    if (isRatingLoading) return;

    setIsRatingLoading(true);

    try {
      if (userReaction?.reaction_type === "dislike") {
        // User already disliked, toggle off (remove)
        await onReaction(comment.comment_id || comment.id, userReaction.id, null);
      } else {
        // Add or change to dislike
        await onReaction(comment.comment_id || comment.id, userReaction?.id, "dislike");
      }
    } catch (error) {
      console.error("Error handling dislike:", error);
    } finally {
      setTimeout(() => {
        setIsRatingLoading(false);
      }, 300);
    }
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
            <i className="fa-solid fa-thumbs-up"></i> {likeCount}
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
            <i className="fa-solid fa-thumbs-down"></i> {dislikeCount}
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
                  onDelete(comment.comment_id || comment.id);
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
