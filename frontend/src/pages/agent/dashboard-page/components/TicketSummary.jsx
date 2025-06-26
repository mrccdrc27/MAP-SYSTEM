// TicketSummary.jsx
import styles from './Component.module.css';

const TicketSummary = () => {
  const summaryData = [
    { label: 'In Progress', count: 8 },
    { label: 'Resolved Today', count: 4 },
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
