// style
import useTriggerAction from "../../../../api/usetriggeraction";
import styles from "./ticket-action.module.css";

// hooks
import { useState } from "react";


export default function TicketAction({ closeTicketAction, ticket, action, instance }) {
  const [selectedActionId, setSelectedActionId] = useState("");
  const [triggerNow, setTriggerNow] = useState(false);

  // Use the custom hook to trigger an action
  const { loading, error, response } = useTriggerAction({
    uuid: instance,
    action_id: selectedActionId,
    method: "post",
    trigger: triggerNow,
  });

  const handleClick = () => {
    if (!selectedActionId) {
      alert("Please select an action first.");
      return;
    }
    setTriggerNow(true); // Trigger the action
  };

  // Reset the trigger after the action is completed
  if (triggerNow && !loading && (error || response)) {
    setTimeout(() => setTriggerNow(false), 500); // Reset after 0.5s
  }

  return (
    <div className={styles.taOverlayWrapper} onClick={() => closeTicketAction(false)}>
      <div className={styles.ticketActionModal} onClick={(e) => e.stopPropagation()}>
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

          <button
            className={styles.taActionButton}
            onClick={handleClick}
            disabled={loading}
          >
            {loading ? "Sending..." : "Push Changes"}
          </button>

          {error && <p style={{ color: "red" }}>{JSON.stringify(error)}</p>}
          {response && <p style={{ color: "green" }}>Action triggered successfully!</p>}
        </div>
      </div>
    </div>
  );
}