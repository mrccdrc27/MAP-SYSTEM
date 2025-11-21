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
  const [selectedActionId, setSelectedActionId] = useState("");
  const [notes, setNotes] = useState("");
  const [triggerNow, setTriggerNow] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
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
    if (!selectedActionId) {
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
    const selectedAction = action?.find((a) => a.transition_id === selectedActionId);
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
    <div
      className={styles.taOverlayWrapper}
      onClick={() => closeTicketAction(false)}
    >
      <div
        className={styles.ticketActionModal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.taExit} onClick={() => closeTicketAction(false)}>
          <i className="fa-solid fa-xmark"></i>
        </div>

        <div className={styles.taHeader}>
          <h1>Ticket No. {ticket?.ticket_id}</h1>
          <div className={styles.taSubject}>{ticket?.subject}</div>
        </div>

        <div className={styles.tdMetaData}>
          <p className={styles.tdDateOpened}>Opened On: {ticket?.opened_on}</p>
          <p className={styles.tdDateResolution}>Expected Resolution: </p>
        </div>

        <div className={styles.taBody}>
          <div className={styles.taDescriptionCont}>
            <h3>Description</h3>
            <p>{ticket?.description}</p>
          </div>

          <div className={styles.taActionStatusCont}>
            <select
              name="ticket-action-status"
              className={styles.actionStatus}
              value={selectedActionId}
              onChange={(e) => setSelectedActionId(e.target.value)}
              disabled={loading}
            >
              <option value="" disabled>
                Please select an option
              </option>
              {action?.map((a) => (
                <option key={a.transition_id} value={a.transition_id}>
                  {a.name}
                </option>
              ))}
            </select>
            {errors.action && (
              <p className={styles.errorText}>{errors.action}</p>
            )}
          </div>

          <div className={styles.taCommentCont}>
            <h3>Notes</h3>
            <textarea
              className={styles.actionStatus}
              placeholder="Enter notes for this action..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
            />
            {errors.notes && <p className={styles.errorText}>{errors.notes}</p>}
          </div>

          <button
            className={styles.taActionButton}
            onClick={handleClick}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className={styles.spinner}></span> Sending...
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
