import useEscalateTask from "../../../../api/useEscalateTask";
import styles from "./escalate-ticket.module.css";
import { useState, useEffect } from "react";

export default function EscalateTicket({
  closeEscalateModal,
  ticket,
  taskItemId,
}) {
  const [reason, setReason] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [errors, setErrors] = useState("");

  const { escalateTask, loading, error } = useEscalateTask();

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Handle successful response
  useEffect(() => {
    if (!loading && !error && reason && showConfirmation) {
      console.log("✅ Ticket escalated successfully");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  }, [loading, error, reason, showConfirmation]);

  const handleEscalate = () => {
    setErrors("");

    if (!reason.trim()) {
      setErrors("Please provide a reason for escalation.");
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    try {
      await escalateTask(taskItemId, reason);
    } catch (err) {
      console.error("Failed to escalate:", err);
    }
  };

  return (
    <>
      {!showConfirmation ? (
        <div
          className={styles.escalateOverlayWrapper}
          onClick={() => closeEscalateModal(false)}
        >
          <div
            className={styles.escalateTicketModal}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={styles.escalateModalHeader}>
              <div>
                <h2 className={styles.escalateHeaderTitle}>Escalate Ticket</h2>
                <p className={styles.escalateHeaderSubtitle}>
                  {ticket?.ticket_id} - {ticket?.ticket_subject || ticket?.ticket_number}
                </p>
              </div>
              <button
                onClick={() => closeEscalateModal(false)}
                className={styles.escalateCloseButton}
                aria-label="Close modal"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className={styles.escalateModalBody}>
              {/* Error Messages */}
              {(error || errors) && (
                <div className={styles.escalateErrorMessage}>
                  <i className="fa-solid fa-circle-exclamation"></i>
                  <p>{error || errors}</p>
                </div>
              )}

              {/* Description Section */}
              <div className={styles.escalateDescriptionCont}>
                <h3>Ticket Details</h3>
                <div className={styles.escalateDetailItem}>
                  <strong>Subject:</strong> {ticket?.ticket_subject}
                </div>
                <div className={styles.escalateDetailItem}>
                  <strong>Description:</strong> {ticket?.ticket_description}
                </div>
              </div>

              {/* Reason Section */}
              <div className={styles.escalateReasonCont}>
                <label className={styles.escalateLabel}>
                  Reason for Escalation <span className={styles.escalateRequired}>*</span>
                </label>
                <textarea
                  className={styles.escalateTextarea}
                  placeholder="Explain why this ticket needs to be escalated..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={loading}
                  rows="4"
                />
                <p className={styles.escalateCharCount}>{reason.length} characters</p>
                {errors && (
                  <p className={styles.escalateErrorText}>{errors}</p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className={styles.escalateModalFooter}>
              <button
                onClick={() => closeEscalateModal(false)}
                className={styles.escalateCancelButton}
              >
                Cancel
              </button>
              <button
                className={styles.escalateSubmitButton}
                onClick={handleEscalate}
                disabled={loading || !reason.trim()}
              >
                {loading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>Escalating...</span>
                  </>
                ) : (
                  "Escalate Ticket"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={styles.confirmOverlayWrapper}
          onClick={() => setShowConfirmation(false)}
        >
          <div
            className={styles.confirmModal}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Confirmation Header */}
            <div className={styles.confirmModalHeader}>
              <div>
                <h2 className={styles.confirmHeaderTitle}>Confirm Escalation</h2>
                <p className={styles.confirmHeaderSubtitle}>Please review the details</p>
              </div>
              <button
                onClick={() => setShowConfirmation(false)}
                className={styles.confirmCloseButton}
                aria-label="Close modal"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Confirmation Body */}
            <div className={styles.confirmModalBody}>
              {/* Warning Message */}
              <div className={styles.confirmWarningMessage}>
                <i className="fa-solid fa-triangle-exclamation"></i>
                <div>
                  <h3 className={styles.confirmWarningTitle}>Confirm Ticket Escalation</h3>
                  <p>Are you sure you want to escalate this ticket? This action will notify the appropriate team members.</p>
                </div>
              </div>

              {/* Confirmation Details */}
              <div className={styles.confirmDetails}>
                <div className={styles.confirmDetailRow}>
                  <span className={styles.confirmDetailLabel}>Ticket:</span>
                  <div className={styles.confirmDetailValue}>
                    <div className={styles.confirmDetailValueMain}>
                      {ticket?.ticket_id}
                    </div>
                    <div className={styles.confirmDetailValueSub}>
                      {ticket?.ticket_subject}
                    </div>
                  </div>
                </div>

                <hr className={styles.confirmDetailDivider} />

                <div className={styles.confirmDetailRow}>
                  <span className={styles.confirmDetailLabel}>Reason:</span>
                  <p className={styles.confirmDetailValue}>{reason}</p>
                </div>
              </div>
            </div>

            {/* Confirmation Footer */}
            <div className={styles.confirmModalFooter}>
              <button
                className={styles.confirmCancelButton}
                onClick={() => setShowConfirmation(false)}
                disabled={loading}
              >
                Back
              </button>
              <button
                className={styles.confirmSubmitButton}
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>Confirming...</span>
                  </>
                ) : (
                  "Yes, Escalate"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
