import useTriggerAction from "../../../../api/useTriggerAction";
import styles from "./ticket-action.module.css";
import { useState, useEffect } from "react";
import ConfirmModal from '../../../../components/modal/ConfirmModal';

export default function TicketAction({
  closeTicketAction,
  ticket,
  action,
  instance,
  showToast,
}) {
  const [selectedActionIndex, setSelectedActionIndex] = useState(-1); // -1 means no selection
  const [notes, setNotes] = useState("");
  const [triggerNow, setTriggerNow] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [errors, setErrors] = useState({});

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Get the actual transition_id from the selected index
  const selectedActionId = selectedActionIndex >= 0 ? action?.[selectedActionIndex]?.transition_id : undefined;

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
      if (showToast) showToast("success", "Action triggered successfully!");

      setTimeout(() => {
        window.location.reload();
      }, 1000);

      closeTicketAction(false);
    }
  }, [response, loading, showToast, closeTicketAction]);

  // Handle errors
  useEffect(() => {
    if (error && !loading) {
      console.error("❌ Action failed:", error);
      setTriggerNow(false);
      const message =
        (error && (error.error || error.message)) ||
        "Action failed. Please try again.";
      if (showToast) showToast("error", message);
    }
  }, [error, loading, showToast]);

  const handleClick = () => {
    const newErrors = {};
    // Check if an action was actually selected (selectedActionIndex >= 0)
    if (selectedActionIndex < 0) {
      newErrors.action = "Please select an action.";
    }
    if (!notes.trim()) {
      newErrors.notes = "Notes are required.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      // Show a combined validation toast
      const msg = Object.values(newErrors).join(" ");
      if (showToast) showToast("error", msg || "Please fix validation errors.");
      return;
    }

    // Open confirm modal instead of triggering directly
    const selectedAction = action?.[selectedActionIndex];
    const actionName = selectedAction?.name || "the selected action";
    const message = `You are about to: ${actionName}.\nNotes: ${notes}`;
    setConfirmMessage(message);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    setTriggerNow(true);
  };

  const handleCancel = () => {
    setConfirmOpen(false);
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
                action.map((a, index) => (
                  <div
                    key={`action-${index}`}
                    onClick={() => setSelectedActionIndex(index)}
                    className={`${styles.taActionItem} ${
                      selectedActionIndex === index
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
                    {selectedActionIndex === index && (
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
            disabled={selectedActionIndex < 0 || !notes.trim() || loading}
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
        <ConfirmModal
          isOpen={confirmOpen}
          title="Confirm Push Changes"
          message={confirmMessage}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
