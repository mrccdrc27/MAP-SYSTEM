import useEscalateTask from "../../../../../api/useEscalateTask";
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
            <div
              className={styles.escalateExit}
              onClick={() => closeEscalateModal(false)}
            >
              <i className="fa-solid fa-xmark"></i>
            </div>

            <div className={styles.escalateHeader}>
              <h1>Escalate Ticket</h1>
              <div className={styles.escalateSubtitle}>
                Ticket No. {ticket?.ticket_id}
              </div>
            </div>

            <div className={styles.escalateValidation}>
              {error && <p style={{ color: "red" }}>❌ {error}</p>}
              {errors && <p style={{ color: "red" }}>❌ {errors}</p>}
            </div>

            <div className={styles.escalateBody}>
              <div className={styles.escalateDescriptionCont}>
                <h3>Ticket Details</h3>
                <p>
                  <strong>Subject:</strong> {ticket?.ticket_subject}
                </p>
                <p>
                  <strong>Description:</strong> {ticket?.ticket_description}
                </p>
              </div>

              <div className={styles.escalateReasonCont}>
                <label htmlFor="escalate-reason">
                  <h3>Reason for Escalation *</h3>
                </label>
                <textarea
                  id="escalate-reason"
                  className={styles.escalateReason}
                  placeholder="Explain why this ticket needs to be escalated..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={loading}
                  rows="5"
                />
              </div>

              <button
                className={styles.escalateButton}
                onClick={handleEscalate}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className={styles.spinner}></span> Escalating...
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
            <div className={styles.confirmHeader}>
              <i className="fa-solid fa-exclamation-triangle"></i>
              <h2>Confirm Escalation</h2>
            </div>

            <div className={styles.confirmBody}>
              <p>Are you sure you want to escalate this ticket?</p>
              <p className={styles.escalationReason}>
                <strong>Reason:</strong> {reason}
              </p>
            </div>

            <div className={styles.confirmActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowConfirmation(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className={styles.confirmButton}
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className={styles.spinner}></span> Confirming...
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
