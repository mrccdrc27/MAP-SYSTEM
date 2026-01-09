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
          {/* <div className={styles.thtWrapper}>
          </div> */}
          <div className={styles.ticketTitle}>
            <h2>{matchedTicket.ticket_subject || matchedTicket.subject}</h2>
            <div
              className={
                general[
                  `priority-${
                    matchedTicket
                      ? matchedTicket.ticket_priority.toLowerCase()
                      : "unknown"
                  }`
                ]
              }
            >
              {matchedTicket.ticket_priority || "N/A"}
            </div>
          </div>
          <div className={styles.layoutFlex}>
            <div className={styles.ticketID}>
              {matchedTicket.ticket_number || matchedTicket.ticket_id}
            </div>
            <div
              className={
                general[
                  `status-${matchedTicket?.status
                    ?.toLowerCase()
                    .replace(/\s+/g, "-")}`
                ]
              }
            >
              {matchedTicket.status || "Unknown"}
            </div>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className={styles.ticketProgress}>
          <h3>Current Progress</h3>
          <WorkflowVisualizer2 workflowData={tracker} ticketStatus={matchedTicket?.status} />
        </div>

        {/* Ticket Details */}
        <div className={styles.ticketDetails}>
          <div className={styles.detailCard}>
            <h3>Workflow Process</h3>
            <p>{matchedTicket.workflow_name || "N/A"}</p>
          </div>

          <div className={styles.detailCard}>
            <h3>Current Ticket Holder</h3>
            <p>{matchedTicket.user_full_name || "N/A"}</p>
          </div>
          <div className={styles.detailCard}>
            <h3>Requester Role</h3>
            <p>{matchedTicket.role || "N/A"}</p>
          </div>
          <div className={styles.detailCard}>
            <h3>Origin</h3>
            <p>{matchedTicket.origin || "N/A"}</p>
          </div>
          <div className={styles.detailCard}>
            <h3>Status</h3>
            <p>{matchedTicket.status || "N/A"}</p>
          </div>
          <div className={styles.detailCard}>
            <h3>Current Step</h3>
            <p>{matchedTicket.current_step_name || "N/A"}</p>
          </div>
          <div className={styles.detailCard}>
            <h3>Step Role</h3>
            <p>{matchedTicket.current_step_role || "N/A"}</p>
          </div>
          <div className={styles.detailCard}>
            <h3>Assigned On</h3>
            <p>
              {matchedTicket.assigned_on
                ? new Date(matchedTicket.assigned_on).toLocaleString()
                : "N/A"}
            </p>
          </div>
          <div className={styles.detailCard}>
            <h3>Assigned To</h3>
            <p>{matchedTicket.transferred_to_user_name || "Unassigned"}</p>
          </div>
          <div className={styles.detailCard}>
            <h3>Target Resolution</h3>
            <p>
              {matchedTicket.target_resolution
                ? new Date(matchedTicket.target_resolution).toLocaleString()
                : "N/A"}
            </p>
          </div>
          <div className={styles.detailCard}>
            <h3>Resolution Time</h3>
            <p>
              {matchedTicket.resolution_time
                ? new Date(matchedTicket.resolution_time).toLocaleString()
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

        {/* Ticket Description + Notes */}
        <div className={styles.ticketDescription}>
          <h3>Description</h3>
          <p>
            {matchedTicket.ticket_description ||
              matchedTicket.description ||
              ""}
          </p>

          <h3 style={{ marginTop: "1rem" }}>Notes</h3>
          <p>{matchedTicket.notes || "No notes available."}</p>

          {matchedTicket.transferred_to_user_name ||
          matchedTicket.transferred_by ? (
            <>
              <h3 style={{ marginTop: "1rem" }}>Transfer</h3>
              <p>
                {matchedTicket.transferred_to_user_name
                  ? `Transferred to: ${matchedTicket.transferred_to_user_name}`
                  : ""}
                {matchedTicket.transferred_by
                  ? ` | By: ${matchedTicket.transferred_by}`
                  : ""}
              </p>
            </>
          ) : null}
        </div>
      </div>
    )
  );
};

export default TrackResult;
