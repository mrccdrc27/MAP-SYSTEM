import { useState, useEffect } from "react";
import { AiOutlineStar, AiFillStar } from "react-icons/ai";
import { FiThumbsUp } from "react-icons/fi";
import { MdConfirmationNumber } from "react-icons/md";
import ModalWrapper from "../../../../shared/modals/ModalWrapper";
import styles from "./EmployeeCSATModal.module.css";

const EmployeeCSATModal = ({ ticket, onClose }) => {
  const [step, setStep] = useState("rating"); // 'rating' or 'thankyou'
  const [selectedRating, setSelectedRating] = useState(null);
  const [hoveredRating, setHoveredRating] = useState(null);
  const [selectedFeedback, setSelectedFeedback] = useState([]);
  const [countdown, setCountdown] = useState(12);

  // Auto-close countdown on thank you screen — submit CSAT then close
  useEffect(() => {
    if (step === "thankyou") {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // ensure we call the submission handler so rating/feedback get saved
            try {
              handleClose();
            } catch (e) {
              // fallback to simple close if submission handler fails
              onClose();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [step]);

  const handleRatingClick = (rating) => {
    setSelectedRating(rating);
    // Auto-advance to thank you screen after selecting rating
    setTimeout(() => {
      setStep("thankyou");
    }, 500);
  };

  const handleFeedbackClick = (feedback) => {
    setSelectedFeedback((prev) =>
      prev.includes(feedback)
        ? prev.filter((f) => f !== feedback)
        : [...prev, feedback]
    );
  };

  const handleClose = () => {
    // Save CSAT data to backend
    const ticketId = ticket.id || ticket.ticketId;
    const feedbackString = selectedFeedback.join(', ');
    
    if (selectedRating && ticketId) {
      // Call backend API to submit CSAT rating
      fetch(`http://localhost:8000/api/tickets/${ticketId}/csat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        credentials: 'include',
        body: JSON.stringify({
          rating: selectedRating,
          feedback: feedbackString
        })
      })
      .then(response => {
        if (!response.ok) {
          console.error('Failed to submit CSAT rating');
        }
        return response.json();
      })
      .then(data => {
        console.log('CSAT submitted:', data);
      })
      .catch(error => {
        console.error('Error submitting CSAT:', error);
      });
    }
    
    onClose();
  };

  return (
    <ModalWrapper onClose={onClose} className={styles.csatModalWrapper}>
      {step === "rating" ? (
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
        </div>
      ) : (
        <div className={styles.thankYouContent}>
          {/* Thumbs Up Icon */}
          <div className={styles.thumbsUpIcon}>
            <div className={styles.thumbsUpCircle}>
              <FiThumbsUp size={48} color="#10B981" strokeWidth={2.5} />
            </div>
          </div>

          {/* Thank You Message */}
          <h2 className={styles.thankYouHeading}>Thank you!</h2>
          <p className={styles.thankYouSubtext}>
            Your feedback helps us improve our service.
          </p>

          {/* Quick Feedback Section */}
          <div className={styles.quickFeedback}>
            <p className={styles.quickFeedbackLabel}>
              <strong>Quick feedback?</strong> What did we do well?
            </p>
            <div className={styles.feedbackButtons}>
              {["Fast response", "Very helpful", "Professional", "Problem solved"].map(
                (feedback) => (
                  <button
                    key={feedback}
                    type="button"
                    className={`${styles.feedbackButton} ${
                      selectedFeedback.includes(feedback) ? styles.selected : ""
                    }`}
                    onClick={() => handleFeedbackClick(feedback)}
                  >
                    {feedback}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={handleClose}
            className={styles.closeButton}
          >
            Close
          </button>

          {/* Auto-close Message */}
          <p className={styles.autoCloseText}>
            Closing automatically in {countdown} seconds...
          </p>
        </div>
      )}
    </ModalWrapper>
  );
};

export default EmployeeCSATModal;
