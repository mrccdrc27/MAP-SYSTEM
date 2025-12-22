// styles
import styles from "./action-log.module.css";

export default function ActionLog({ log }) {
  // Handle both old format (single log object) and new format (logs array)
  const logs = Array.isArray(log) ? log : [log];

  return (
    <div className={styles.actionLogComponent}>
      {logs.map((item, index) => (
        <div key={`log-${item.task_item_id}-${index}`}>
          {/* Task Item Header */}
          <div className={styles.taskItemHeader}>
            <div className={styles.headerContent}>
              <div className={styles.userSection}>
                <h3 className={styles.userName}>{item.user_full_name}</h3>
                <span className={styles.role}>{item.role}</span>
              </div>
              <div className={styles.stepsSection}>
                <span className={styles.stepName}>{item.assigned_on_step_name}</span>
              </div>
            </div>
            <div className={styles.statusBadge} data-status={item.status}>
              {item.status}
            </div>
          </div>

          {/* Task Item Timeline */}
          <div className={styles.logRow}>
            <div className={styles.timeline}>
              <div className={styles.dot} data-status={item.status} />
              <div className={styles.line} />
            </div>

            <div className={styles.content}>
              <div className={styles.layoutColumn}>
                {/* Assigned On */}
                <div className={styles.layoutFlex}>
                  <div className={styles.alLabel}>Assigned on:</div>
                  <div className={styles.alTimestamp}>
                    {new Date(item.assigned_on).toLocaleString()}
                  </div>
                </div>

                {/* Acted On */}
                {item.acted_on && (
                  <div className={styles.layoutFlex}>
                    <div className={styles.alLabel}>Acted on:</div>
                    <div className={styles.alTimestamp}>
                      {new Date(item.acted_on).toLocaleString()}
                    </div>
                  </div>
                )}

                {/* Notes/Comment */}
                {item.notes && (
                  <div className={styles.alComment}>
                    <p>{item.notes}</p>
                  </div>
                )}

                {/* Task History - Status Timeline */}
                {item.task_history && item.task_history.length > 0 && (
                  <div className={styles.historySection}>
                    <div className={styles.historyTitle}>Status History:</div>
                    <div className={styles.historyTimeline}>
                      {item.task_history.map((history, historyIndex) => (
                        <div
                          key={`history-${history.task_item_history_id}`}
                          className={styles.historyItem}
                        >
                          <span className={styles.historyStatus} data-status={history.status}>
                            {history.status}
                          </span>
                          <span className={styles.historyTime}>
                            {new Date(history.created_at).toLocaleString()}
                          </span>
                          {historyIndex < item.task_history.length - 1 && (
                            <span className={styles.historyArrow}>→</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Info */}
                <div className={styles.metaInfo}>
                  {item.origin && (
                    <span className={styles.metaTag}>Origin: {item.origin}</span>
                  )}
                  {item.target_resolution && (
                    <span className={styles.metaTag}>
                      Target: {new Date(item.target_resolution).toLocaleString()}
                    </span>
                  )}
                  {item.transferred_to_user_name && (
                    <span className={styles.metaTag}>
                      Transferred to: {item.transferred_to_user_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
