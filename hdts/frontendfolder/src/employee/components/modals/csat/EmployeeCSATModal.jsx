import { useState } from "react";
import { AiOutlineStar, AiFillStar } from "react-icons/ai";
import { FiThumbsUp } from "react-icons/fi";
import { MdConfirmationNumber } from "react-icons/md";
import ModalWrapper from "../../../../shared/modals/ModalWrapper";
import styles from "./EmployeeCSATModal.module.css";
import { backendTicketService } from "../../../../services/backend/ticketService";

const EmployeeCSATModal = ({ ticket, onClose }) => {
  const [step, setStep] = useState("rating"); // 'rating', 'feedback', or 'thankyou'
  const [selectedRating, setSelectedRating] = useState(null);
  const [hoveredRating, setHoveredRating] = useState(null);
  const [selectedFeedback, setSelectedFeedback] = useState([]);
  const [comment, setComment] = useState("");
  const [resolution, setResolution] = useState(null); // 'resolved' | 'partial' | 'not_resolved'
  const [wantsFollowUp, setWantsFollowUp] = useState(null); // true | false | null
  const [wantsReopen, setWantsReopen] = useState(null); // true | false | null
  const [isSubmitting, setIsSubmitting] = useState(false);

  // MVP feedback tags for helpdesk context
  const feedbackOptions = [
    "Fast response",
    "Helpful / Knowledgeable",
    "Professional / Courteous",
    "Clear instructions",
    "Problem resolved",
    "Followed up proactively",
    "Too slow / Delayed",
    "Solution unclear",
    "Needed escalation",
    "Reopened later",
    "Partial fix / Workaround only",
    "System-related / Bug still exists",
  ];

  const handleRatingClick = (rating) => {
    setSelectedRating(rating);
    // Move to feedback step after rating selection
    setTimeout(() => {
      setStep("feedback");
    }, 300);
  };

  const handleFeedbackClick = (feedback) => {
    setSelectedFeedback((prev) =>
      prev.includes(feedback)
        ? prev.filter((f) => f !== feedback)
        : [...prev, feedback]
    );
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      // Get ticket ID
      let ticketId = ticket.id || ticket.ticketId;
      if (!ticketId) {
        // Try to get from ticket number lookup if needed
        const ticketNumber = ticket.ticket_number || ticket.ticketNumber;
        if (ticketNumber) {
          const ticketData = await backendTicketService.getTicketByNumber(ticketNumber);
          ticketId = ticketData.id;
        }
      }
      
      if (!ticketId) {
        console.error("Could not determine ticket ID for CSAT submission");
        setStep("thankyou");
        return;
      }
      
      // Convert feedback array to comma-separated string for backend
      const feedbackString = selectedFeedback.join(', ');
      
      // Submit to backend
      await backendTicketService.submitCSATRating(ticketId, selectedRating, feedbackString);
      console.log("CSAT submitted successfully:", { ticketId, rating: selectedRating, feedback: feedbackString });
      
    } catch (err) {
      console.error("Failed to submit CSAT rating:", err);
      // Still show thank you even if API fails (graceful degradation)
    } finally {
      setIsSubmitting(false);
      setStep("thankyou");
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <ModalWrapper
      onClose={onClose}
      className={styles.csatModalWrapper}
      disableEscClose={step !== "thankyou"}
      disableOutsideClick={step !== "thankyou"}
    >
      {step === "rating" ? (
        // STEP 1: Rating
        <div className={styles.csatContent}>
          {/* Ticket Icon */}
          <div className={styles.ticketIcon}>
            <MdConfirmationNumber size={64} color="#2563EB" />
          </div>

          {/* Heading */}
          <h2 className={styles.heading}>How was your experience?</h2>

          {/* Ticket Info */}
          <p className={styles.ticketInfo}>
            Ticket {ticket.ticketNumber || ticket.ticket_number} - {ticket.subject}
          </p>

          {/* Star Rating */}
          <div className={styles.starRating}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`${styles.star} ${
                  (hoveredRating || selectedRating) >= star ? styles.filled : ""
                }`}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(null)}
                onClick={() => handleRatingClick(star)}
                aria-label={`Rate ${star} stars`}
              >
                {(hoveredRating || selectedRating) >= star ? (
                  <AiFillStar size={48} />
                ) : (
                  <AiOutlineStar size={48} />
                )}
              </button>
            ))}
          </div>

          <p className={styles.ratingHint}>
            {selectedRating
              ? `You rated this ${selectedRating} star${selectedRating !== 1 ? "s" : ""}`
              : "Click a star to rate"}
          </p>
        </div>
      ) : step === "feedback" ? (
        // STEP 2: Feedback & Comment
        <div className={styles.feedbackContent}>
          {/* Progress */}
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: "66%" }}></div>
          </div>

          {/* Heading */}
          <h2 className={styles.feedbackHeading}>Help us improve</h2>
          <p className={styles.feedbackSubtext}>Your feedback helps us serve you better</p>

          {/* Quick Feedback Section */}
          <div className={styles.feedbackSection}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>💭</span>
              <span className={styles.sectionTitle}>Quick Feedback</span>
              <span className={styles.sectionBadge}>Optional</span>
            </div>
            <div className={styles.feedbackTags}>
              {feedbackOptions.map((feedback) => (
                <button
                  key={feedback}
                  type="button"
                  className={`${styles.feedbackTag} ${
                    selectedFeedback.includes(feedback) ? styles.selected : ""
                  }`}
                  onClick={() => handleFeedbackClick(feedback)}
                >
                  {feedback}
                </button>
              ))}
            </div>
          </div>

          {/* Structured Fields: Resolution + Follow-up + Reopen */}
          <div className={styles.structuredFields}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>✓</span>
              <span className={styles.sectionTitle}>Resolution Status</span>
              <span className={styles.sectionBadge}>Optional</span>
            </div>
            <div className={styles.sectionGroup}>
                <div className={styles.sectionLabel}>Was your issue resolved?</div>
                <div className={styles.sectionOptions}>
                  <button
                    type="button"
                    className={`${styles.feedbackTag} ${resolution === 'resolved' ? styles.selected : ''}`}
                    onClick={() => setResolution('resolved')}
                  >
                    Resolved
                  </button>
                  <button
                    type="button"
                    className={`${styles.feedbackTag} ${resolution === 'partial' ? styles.selected : ''}`}
                    onClick={() => setResolution('partial')}
                  >
                    Partially resolved
                  </button>
                  <button
                    type="button"
                    className={`${styles.feedbackTag} ${resolution === 'not_resolved' ? styles.selected : ''}`}
                    onClick={() => setResolution('not_resolved')}
                  >
                    Not resolved
                  </button>
                </div>
              </div>

            <div className={styles.sectionGroup}>
                <div className={styles.sectionLabel}>Would you like a follow-up?</div>
                <div className={styles.sectionOptions}>
                  <button
                    type="button"
                    className={`${styles.optionButton} ${wantsFollowUp === true ? styles.selected : ''}`}
                    onClick={() => setWantsFollowUp(true)}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={`${styles.optionButton} ${wantsFollowUp === false ? styles.selected : ''}`}
                    onClick={() => setWantsFollowUp(false)}
                  >
                    No
                  </button>
                </div>
              </div>

            <div className={styles.sectionGroup}>
                <div className={styles.sectionLabel}>Do you need to reopen this ticket?</div>
                <div className={styles.sectionOptions}>
                  <button
                    type="button"
                    className={`${styles.optionButton} ${wantsReopen === true ? styles.selected : ''}`}
                    onClick={() => setWantsReopen(true)}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={`${styles.optionButton} ${wantsReopen === false ? styles.selected : ''}`}
                    onClick={() => setWantsReopen(false)}
                  >
                    No
                  </button>
                </div>
            </div>
          </div>

          {/* Comment Field */}
          <div className={styles.commentSection}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>💬</span>
              <span className={styles.sectionTitle}>Additional Comments</span>
              <span className={styles.sectionBadge}>Optional</span>
            </div>
            <textarea
              id="comment"
              className={styles.commentInput}
              placeholder="Any additional details or suggestions?"
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 300))}
              rows={3}
            />
            <p className={styles.charCount}>{comment.length}/300</p>
          </div>

          {/* Action Buttons */}
          <div className={styles.actionButtons}>
            <button
              type="button"
              onClick={() => setStep("rating")}
              className={styles.backButton}
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className={styles.submitButton}
            >
              Submit Feedback
            </button>
          </div>
        </div>
      ) : (
        // STEP 3: Thank You
        <div className={styles.thankYouContent}>
          {/* Thumbs Up Icon */}
          <div className={styles.thumbsUpIcon}>
            <div className={styles.thumbsUpCircle}>
              <FiThumbsUp size={48} color="#10B981" strokeWidth={2.5} />
            </div>
          </div>

          {/* Thank You Message */}
          <h2 className={styles.thankYouHeading}>Thank you for your feedback!</h2>
          <p className={styles.thankYouSubtext}>
            We appreciate your time and will use this to improve our service.
          </p>

          {/* Close Button */}
          <button
            type="button"
            onClick={handleClose}
            className={styles.closeButton}
          >
            Close
          </button>
        </div>
      )}
    </ModalWrapper>
  );
};

export default EmployeeCSATModal;
