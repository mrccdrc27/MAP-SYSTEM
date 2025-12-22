// style
import styles from "./kpi-card.module.css";

export default function KPICard(props) {
  const statusClassMap = {
    "New Tickets": styles.newTickets,
    Critical: styles.critical,
    High: styles.high,
    Medium: styles.medium,
    Low: styles.low,
  };

  return (
    <div
      role={props.onClick ? "button" : undefined}
      tabIndex={props.onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (!props.onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          props.onClick();
        }
      }}
      onClick={props.onClick}
      className={`${styles.statusCard} ${statusClassMap[props.label] || ""} ${
        props.onClick ? styles.clickable : ""
      }`}
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
