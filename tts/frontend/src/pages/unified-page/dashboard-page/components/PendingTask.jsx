// styles
import styles from "./pending-task.module.css";
import general from '../../../../style/general.module.css';

import { Ticket } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PendingTask({ tickets = [] }) {

  const truncate = (text, length = 20) =>
  text.length > length ? text.slice(0, length) + "…" : text;

  const navigate = useNavigate();
  if (!tickets.length) {
    return (
      <div className={styles.pendingTask}>
        <div className={styles.ptWrapper}>
          <p>No pending tasks.</p>
        </div>
      </div>
    );
  }

  // Show only the first 3
  const visibleTickets = tickets.slice(0, 3);
  const hasMore = tickets.length > 3;

  return (
    <div>
      {visibleTickets.map((ticket) => (
        <div
          key={ticket.ticket_no || ticket.ticket_id}
          className={styles.pendingTask}
        >
          <div className={styles.ptWrapper}>
            <Ticket className={styles.ptIcon} />
            <div className={styles.ptDetails}>
              <h5>Ticket No. {ticket.ticket_no || ticket.ticket_id}</h5>
              <p title={ticket.title || ticket.subject}>{truncate(ticket.title || ticket.subject)}</p>
              {/* <p>{ticket.title || ticket.subject}</p> */}
            </div>
            <div
              className={general[`priority-${ticket.priority?.toLowerCase?.()}`]}

            >
              {ticket.priority}
            </div>
          </div>
        </div>
      ))}

      {/* View All Button */}
      {hasMore && (
        <div className={styles.viewAllContainer}>
          <button
            className={styles.viewAllBtn}
            type="button"
            title="Navigate to pending task"
            onClick={() => navigate(`/ticket?tab=${encodeURIComponent("All")}`)}
          >
            View All
          </button>
        </div>
      )}
    </div>
  );
}