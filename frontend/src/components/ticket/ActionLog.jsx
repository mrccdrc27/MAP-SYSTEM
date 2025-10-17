// styles
import styles from "./action-log.module.css";

export default function ActionLog({ log }) {
  // log shape expected: { action: { name }, user, created_at, comment }
  const actionName = log?.action?.name || "Unknown Action";
  const userName = log?.user || "Unknown User";
  const timestamp = log?.created_at
    ? new Date(log.created_at).toLocaleString()
    : "";
  const comment = log?.comment || "";

  return (
    <div className={styles.actionLogComponent}>
      <div className={styles.logRow}>
        <div className={styles.timeline}>
          <div className={styles.dot} />
          <div className={styles.line} />
        </div>

        <div className={styles.content}>
          <div className={styles.layoutColumn}>
            <div className={styles.layoutFlex}>
              <div className={styles.alTaskName}>{actionName}</div>
            </div>
            <div className={styles.layoutFlex}>
              <div className={styles.alUserName}>{userName}</div>
              <div className={styles.alTimestamp}>{timestamp}</div>
            </div>
            {comment && (
              <div className={styles.alComment}>
                <p>{comment}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
