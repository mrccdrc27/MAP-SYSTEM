// TicketSummary.jsx
import styles from "./Component.module.css";

const TicketSummary = ({ inProgressCount, resolvedTodayCount }) => {
  const summaryData1 = [
    { label: "In Progress", count: inProgressCount },
    { label: "Resolved Today", count: resolvedTodayCount },
  ];

  const summaryData = [
    { label: "Not Yet Acted", count: inProgressCount },
    { label: "Resolved Today", count: resolvedTodayCount },
  ];

  return (
    <div className={`${styles.card} ${styles.ticketSummary}`}>
      <h2>Ticket Summary</h2>
      <div className={styles.summaryItems}>
        {summaryData.map((item, index) => (
          <div key={index} className={styles.summaryItem}>
            <span className={styles.count}>{item.count}</span>
            <span className={styles.label}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TicketSummary;
