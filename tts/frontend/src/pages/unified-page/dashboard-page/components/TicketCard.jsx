// style
import styles from "./ticket-card.module.css";

export default function TicketCard(props) {
  const statusClassMap = {
    "New Tickets": styles.newTickets,
    "Open Tickets": styles.open,
    "Rejected Tickets": styles.rejected,
    "Resolved Tickets": styles.resolved,
    "In Progress": styles.inProgress,
    "On Hold Tickets": styles.onHold,
    "Critical": styles.critical,
  };

  return (
    <div
      className={`${styles.statusCard} ${statusClassMap[props.label] || ""}`}
    >
      <div className={styles.contentWrapper}>
        <div
          className={`${styles.statusNumber} ${
            statusClassMap[props.label] || ""
          }`}
        >
          {props.number}
        </div>
        <div className={styles.statusTitle}>{props.label}</div>
      </div>
    </div>
  );
}
