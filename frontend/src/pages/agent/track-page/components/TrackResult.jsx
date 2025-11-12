// components/TrackResult.jsx
import styles from "./track-result.module.css";
import general from "../../../../style/general.module.css";

// visual
import WorkflowVisualizer2 from "../../../../components/ticket/WorkflowVisualizer2";

const TrackResult = ({ matchedTicket, notFound, searchTerm, tracker }) => {
  if (notFound) {
    return (
      <div className={styles.SearchImageContainer}>
        <img
          src="../../../../public/notfound.svg"
          alt="Search placeholder"
          className={styles.SearchImage}
        />
        <p>
          Sorry, we couldn't find a ticket with that ID. Please check and try
          again.
        </p>
      </div>
    );
  }

  if (!matchedTicket && searchTerm.trim() === "") {
    return (
      <div className={styles.SearchImageContainer}>
        <img
          src="../../../../public/searching.svg"
          alt="Search placeholder"
          className={styles.SearchImage}
        />
        <p>Enter a ticket number to start tracking.</p>
      </div>
    );
  }

  return (
    matchedTicket && (
      <div className={styles.resultsContainer}>
        {/* Ticket Header */}
        <div className={styles.ticketHeader}>
          <div className={styles.ticketTitle}>
            <h2>{matchedTicket.ticket_subject || matchedTicket.subject}</h2>
            <div className={styles.ticketID}>
              {matchedTicket.ticket_number || matchedTicket.ticket_id}
            </div>
          </div>
          <div
            className={
              general[
                `status-${matchedTicket?.status?.toLowerCase?.() || ""}`
              ]
            }
          >
            {matchedTicket.status || "Unknown"}
          </div>
        </div>

        {/* Progress Tracker */}
        <div className={styles.ticketProgress}>
          <h3>Current Progress</h3>
          <WorkflowVisualizer2 workflowData={tracker} />
        </div>

        {/* Ticket Details */}
        <div className={styles.ticketDetails}>
          <div className={styles.detailCard}>
            <h3>Workflow</h3>
            <p>{matchedTicket.workflow_name || "N/A"}</p>
          </div>
          <div className={styles.detailCard}>
            <h3>Task ID</h3>
            <p>{matchedTicket.task_id || "N/A"}</p>
          </div>
          <div className={styles.detailCard}>
            <h3>Status</h3>
            <p>{matchedTicket.status || "N/A"}</p>
          </div>
          <div className={styles.detailCard}>
            <h3>Created On</h3>
            <p>
              {matchedTicket.created_at
                ? new Date(matchedTicket.created_at).toLocaleString()
                : "N/A"}
            </p>
          </div>
          <div className={styles.detailCard}>
            <h3>Last Updated</h3>
            <p>
              {matchedTicket.updated_at
                ? new Date(matchedTicket.updated_at).toLocaleString()
                : "N/A"}
            </p>
          </div>
        </div>

        {/* Ticket Description */}
        <div className={styles.ticketDescription}>
          <h3>Description</h3>
          <p>
            {matchedTicket.ticket_description || matchedTicket.description || ""}
          </p>
        </div>
      </div>
    )
  );
};

export default TrackResult;
