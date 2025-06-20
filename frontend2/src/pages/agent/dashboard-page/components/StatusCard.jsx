// style
import styles from "./status-card.module.css";

export default function StatusCard(props) {

    const priorityClassMap = {
    'Open Tickets': styles.openTickets,
    'Critical': styles.critical,
    'High': styles.high,
    'Medium': styles.medium,
    'Low': styles.low,
  }
  
  return (
    <div className={`${styles.statusCard} ${priorityClassMap[props.label] || ''}`}>
      <div className={styles.contentWrapper}>
        <div className={`${styles.statusNumber} ${priorityClassMap[props.label] || ''}`}>{props.number}</div>
        <div className={styles.statusTitle}>{props.label}</div>
      </div>
    </div>
  );
}
