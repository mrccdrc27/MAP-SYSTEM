// style
import useTriggerAction from "../../../../api/useTriggerAction";
import styles from "./ticket-action.module.css";

// hooks
import { useState } from "react";

export default function TicketAction({
  closeTicketAction,
  ticket,
  action,
  instance,
}) {
  const [selectedActionId, setSelectedActionId] = useState("");
  const [triggerNow, setTriggerNow] = useState(false);
  const [comment, setComment] = useState("");

  // Use the custom hook to trigger an action
  const { loading, error, response } = useTriggerAction({
    uuid: instance,
    action_id: selectedActionId,
    method: "post",
    comment,
    trigger: triggerNow,
  });

  // OLD
  // const handleClick = () => {
  //   if (!selectedActionId) {
  //     alert("Please select an action first.");
  //     return;
  //   }
  //   setTriggerNow(true);
  // };

  // NEW
  const handleClick = () => {
    if (!selectedActionId) {
      alert("Please select an action first.");
      return;
    }

    setTriggerNow(true); // Trigger the action

    // Reload the page after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 1000); // adjust the delay if needed
  };

  // Reset the trigger after the action is completed
  if (triggerNow && !loading && (error || response)) {
    setTimeout(() => setTriggerNow(false), 500); // Reset after 0.5s
  }

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

        <div className={styles.tdValidation}>
          {error && error.comment && (
            <p style={{ color: "red" }}>
              {`Comment: ${error.comment.join(", ")}`}
            </p>
          )}
          {response && (
            <p style={{ color: "green" }}>Action triggered successfully!</p>
          )}
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
            >
              <option value="" disabled>
                Please select an option
              </option>
              {action?.map((a) => (
                <option key={a.action_id} value={a.action_id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.taCommentCont}>
            <h3>Comment</h3>
            <textarea
              className={styles.actionStatus}
              placeholder="Enter a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
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
      </div>
    </div>
  );
}
