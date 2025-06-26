// components/ActionLogList.jsx
import React from "react";
import styles from "./ActionLogListBase.module.css";

const getActionType = (actionName) => {
  const name = actionName?.toLowerCase() || "";
  if (name.includes("create") || name.includes("add")) return "create";
  if (
    name.includes("update") ||
    name.includes("edit") ||
    name.includes("modify")
  )
    return "update";
  if (name.includes("delete") || name.includes("remove")) return "delete";
  if (name.includes("comment") || name.includes("note")) return "comment";
  return "default";
};

const getActionIcon = (actionName) => {
  const name = actionName?.toLowerCase() || "";
  if (name.includes("create") || name.includes("add")) return "✨";
  if (
    name.includes("update") ||
    name.includes("edit") ||
    name.includes("modify")
  )
    return "✏️";
  if (name.includes("delete") || name.includes("remove")) return "🗑️";
  if (name.includes("comment") || name.includes("note")) return "💬";
  return "📝";
};

const ActionLogCard = ({ log }) => {
  const actionType = getActionType(log.action?.name);
  const actionIcon = getActionIcon(log.action?.name);

  return (
    <li className={styles.logItem}>
      <div className={`${styles.timelineDot} ${styles[actionType]}`}></div>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.actionInfo}>
            <div className={styles.actionName}>
              <span className={styles.actionIcon}>{actionIcon}</span>
              <span>{log.action?.name || "Unknown Action"}</span>
            </div>
          </div>
          <div className={styles.actionSub}>
            <div className={styles.actionType}>{actionType}</div>
            <div className={styles.timestamp}>
              {new Date(log.created_at).toLocaleString()}
            </div>
          </div>
        </div>

        <div className={styles.meta}>
          <div className={styles.resolver}>
            <span>👤</span>
            <div className={styles.resolverBadge}>{log.user}</div>
          </div>

          {log.comment && <div className={styles.comment}>{log.comment}</div>}
        </div>
      </div>
    </li>
  );
};

const ActionLogList = ({ logs, loading, error }) => {
  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}></div>
        <div className={styles.loadingText}>Loading action logs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        ❌ Failed to load logs:{" "}
        {typeof error === "string" ? error : JSON.stringify(error)}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyText}>
          No action logs found for this task.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <ul className={styles.timeline}>
        {logs.map((log) => (
          <ActionLogCard key={log.id} log={log} />
        ))}
      </ul>
    </div>
  );
};

export default ActionLogList;
