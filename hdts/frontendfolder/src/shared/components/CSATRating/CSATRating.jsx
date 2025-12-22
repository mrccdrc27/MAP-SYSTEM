import React, { useState } from "react";
import styles from "./CSATRating.module.css";

const CSATRating = ({ ticketNumber, onSubmit, existingRating = null }) => {
  const [rating, setRating] = useState(existingRating?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState(existingRating?.comment || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!existingRating);

  const ratingLabels = {
    1: "Very Dissatisfied",
    2: "Dissatisfied",
    3: "Neutral",
    4: "Satisfied",
    5: "Very Satisfied",
  };

  const handleStarClick = (value) => {
    if (!submitted) {
      setRating(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      alert("Please select a rating before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        rating,
        comment: comment.trim(),
        submittedAt: new Date().toISOString(),
      });
      setSubmitted(true);
    } catch (error) {
      console.error("Failed to submit CSAT rating:", error);
      alert("Failed to submit rating. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={styles.csatContainer}>
        <div className={styles.successMessage}>
          <div className={styles.successIcon}>✓</div>
          <h3 className={styles.successTitle}>Thank You for Your Feedback!</h3>
          <p className={styles.successDescription}>
            Your satisfaction rating has been submitted successfully.
          </p>
          <div className={styles.submittedRating}>
            <div className={styles.submittedStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`${styles.star} ${star <= rating ? styles.filled : ""}`}
                >
                  ★
                </span>
              ))}
            </div>
            <div className={styles.submittedLabel}>{ratingLabels[rating]}</div>
            {comment && (
              <div className={styles.submittedComment}>
                <strong>Your comment:</strong> "{comment}"
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.csatContainer}>
      <div className={styles.csatHeader}>
        <h3 className={styles.csatTitle}>Rate Your Experience</h3>
        <p className={styles.csatDescription}>
          How satisfied are you with the resolution of ticket <strong>{ticketNumber}</strong>?
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.csatForm}>
        <div className={styles.ratingSection}>
          <div className={styles.starContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`${styles.starButton} ${
                  star <= (hoveredRating || rating) ? styles.active : ""
                }`}
                onClick={() => handleStarClick(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                aria-label={`Rate ${star} stars`}
              >
                <span className={styles.star}>★</span>
              </button>
            ))}
          </div>
          {(hoveredRating || rating) > 0 && (
            <div className={styles.ratingLabel}>
              {ratingLabels[hoveredRating || rating]}
            </div>
          )}
        </div>

        <div className={styles.commentSection}>
          <label htmlFor="csatComment" className={styles.commentLabel}>
            Additional Comments (Optional)
          </label>
          <textarea
            id="csatComment"
            className={styles.commentTextarea}
            placeholder="Tell us more about your experience..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={1000}
          />
          <div className={styles.charCount}>{comment.length}/1000 characters</div>
        </div>

        <div className={styles.buttonGroup}>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={rating === 0 || isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Rating"}
          </button>
        </div>
      </form>

      <div className={styles.csatInfo}>
        <p className={styles.infoText}>
          Your feedback helps us improve our service quality and response time.
        </p>
      </div>
    </div>
  );
};

export default CSATRating;
