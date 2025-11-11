// styles
import styles from "./pending-task.module.css";
import general from '../../../../style/general.module.css';

import { Ticket } from "lucide-react";

export default function PendingTask({ tickets = [] }) {
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
          key={ticket.ticket_number || ticket.ticket_id}
          className={styles.pendingTask}
        >
          <div className={styles.ptWrapper}>
            <Ticket className={styles.ptIcon} />
            <div className={styles.ptDetails}>
              <h5>Ticket No. {ticket.ticket_number || ticket.ticket_id}</h5>
              <p>{ticket.subject || ticket.description || "No title"}</p>
            </div>
            <div
              className={
                general[`priority-${(ticket.priority || "Medium").toLowerCase()}`]
              }
            >
              {ticket.priority || "Medium"}
            </div>
          </div>
        </div>
      ))}

      {/* View All Button */}
      {hasMore && (
        <div className={styles.viewAllContainer}>
          <button className={styles.viewAllBtn}>View All</button>
        </div>
      )}
    </div>
  );
}
