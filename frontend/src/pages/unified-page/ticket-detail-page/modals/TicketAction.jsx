import useTriggerAction from "../../../../api/useTriggerAction";
import styles from "./ticket-action.module.css";
import { useState, useEffect } from "react";

export default function TicketAction({
  closeTicketAction,
  ticket,
  action,
  instance,
}) {
  const [selectedActionId, setSelectedActionId] = useState("");
  const [notes, setNotes] = useState("");
  const [triggerNow, setTriggerNow] = useState(false);
  const [errors, setErrors] = useState({});

  const { loading, error, response } = useTriggerAction({
    task_id: instance,
    transition_id: selectedActionId,
    method: "post",
    notes,
    trigger: triggerNow,
  });

  // Handle successful response
  useEffect(() => {
    if (response && !loading) {
      console.log("✅ Action completed successfully");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  }, [response, loading]);

  // Handle errors
  useEffect(() => {
    if (error && !loading) {
      console.error("❌ Action failed:", error);
      setTriggerNow(false);
    }
  }, [error, loading]);

  const handleClick = () => {
    const newErrors = {};
    if (!selectedActionId) {
      newErrors.action = "Please select an action.";
    }
    if (!notes.trim()) {
      newErrors.notes = "Notes are required.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    console.log("🔄 Triggering action...");
    setTriggerNow(true);
  };

  return (
    <div className={styles.taOverlayWrapper} onClick={() => closeTicketAction(false)}>
      <div className={styles.ticketActionModal} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.taModalHeader}>
          <div>
            <h2 className={styles.taHeaderTitle}>Make an Action</h2>
            <p className={styles.taHeaderSubtitle}>
              {ticket?.ticket_id} - {ticket?.ticket_subject || ticket?.subject}
            </p>
          </div>
          <button
            onClick={() => closeTicketAction(false)}
            className={styles.taCloseButton}
            aria-label="Close modal"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.taModalBody}>
          {/* Error Messages */}
          {error && error.error && (
            <div className={styles.taErrorMessage}>
              <i className="fa-solid fa-circle-exclamation"></i>
              <p>{error.error}</p>
            </div>
          )}

          {/* Success Messages */}
          {response && (
            <div className={styles.taSuccessMessage}>
              <i className="fa-solid fa-circle-check"></i>
              <p>✅ Action triggered successfully!</p>
            </div>
          )}

          {/* Description Section */}
          <div className={styles.taDescriptionCont}>
            <h3>Description</h3>
            <p>{ticket?.description}</p>
          </div>

          {/* Actions Section */}
          <div className={styles.taActionsContainer}>
            <label className={styles.taLabel}>
              Select Action <span className={styles.taRequired}>*</span>
            </label>
            <div className={styles.taActionsList}>
              {action && action.length > 0 ? (
                action.map((a) => (
                  <div
                    key={a.transition_id}
                    onClick={() => setSelectedActionId(a.transition_id)}
                    className={`${styles.taActionItem} ${
                      selectedActionId === a.transition_id
                        ? styles.taActionItemSelected
                        : ""
                    }`}
                  >
                    <div className={styles.taActionContent}>
                      <div className={styles.taActionName}>{a.name}</div>
                      {a.description && (
                        <div className={styles.taActionDescription}>
                          {a.description}
                        </div>
                      )}
                    </div>
                    {selectedActionId === a.transition_id && (
                      <div className={styles.taCheckmark}>
                        <i className="fa-solid fa-check"></i>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className={styles.taNoActions}>No actions available</p>
              )}
            </div>
            {errors.action && (
              <p className={styles.taErrorText}>{errors.action}</p>
            )}
          </div>

          {/* Notes Section */}
          <div className={styles.taNotesContainer}>
            <label className={styles.taLabel}>
              Notes <span className={styles.taRequired}>*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter notes for this action..."
              rows="4"
              className={styles.taTextarea}
              disabled={loading}
            />
            <p className={styles.taCharCount}>{notes.length} characters</p>
            {errors.notes && (
              <p className={styles.taErrorText}>{errors.notes}</p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className={styles.taModalFooter}>
          <button
            onClick={() => closeTicketAction(false)}
            className={styles.taCancelButton}
          >
            Cancel
          </button>
          <button
            onClick={handleClick}
            disabled={!selectedActionId || !notes.trim() || loading}
            className={styles.taSubmitButton}
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                <span>Sending...</span>
              </>
            ) : (
              "Push Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
