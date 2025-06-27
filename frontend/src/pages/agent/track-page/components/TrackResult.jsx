// components/TrackResult.jsx
import styles from "./track-result.module.css";
import general from "../../../../style/general.module.css";

// hooks
import { useWorkflowProgress } from "../../../../api/workflow-graph/useWorkflowProgress";

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

  // const { tracker } = useWorkflowProgress(matchedTicket);

  return (
    matchedTicket && (
      <div className={styles.resultsContainer}>
        <div className={styles.ticketHeader}>
          <div className={styles.ticketTitle}>
            <h2>{matchedTicket.subject}</h2>
            <div className={styles.ticketID}>{matchedTicket.ticket_id}</div>
          </div>
          <div
            className={
              general[
                `status-${matchedTicket.status
                  .replace(/\s+/g, "-")
                  .toLowerCase()}`
              ]
            }
          >
            {matchedTicket.status}
          </div>
        </div>

        {/* Progress Tracker */}
        {/* <div className={styles.ticketProgress}>
          <h3>Current Progress</h3>
          <ProgressTracker currentStatus={matchedTicket.status} />
          <WorkflowTracker2 workflowData={tracker} />
        </div> */}
        <div className={styles.ticketProgress}>
          <h3>Current Progress</h3>
          <WorkflowVisualizer2 workflowData={tracker} />
        </div>

        <div className={styles.ticketDetails}>
          <div className={styles.detailCard}>
            <h3>Priority</h3>
            <p
              className={
                general[`priority-${matchedTicket.priority.toLowerCase()}`]
              }
            >
              {matchedTicket.priority}
            </p>
          </div>
          <div className={styles.detailCard}>
            <h3>Category</h3>
            <p>{matchedTicket.category}</p>
          </div>
          <div className={styles.detailCard}>
            <h3>Department</h3>
            <p>{matchedTicket.department}</p>
          </div>
          <div className={styles.detailCard}>
            <h3>Created On</h3>
            <p>{new Date(matchedTicket.submit_date).toLocaleString()}</p>
          </div>
        </div>

        <div className={styles.ticketDescription}>
          <h3>Description</h3>
          <p>{matchedTicket.description}</p>
        </div>
      </div>
    )
  );
};

export default TrackResult;
