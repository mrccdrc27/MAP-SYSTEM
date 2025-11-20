// components/ActionLogList.jsx
import React, { useState } from "react";
import styles from "./ActionLogListBase.module.css";

const getStatusColor = (status) => {
  const statusMap = {
    new: "new",
    "in progress": "inProgress",
    resolved: "resolved",
    reassigned: "reassigned",
    escalated: "escalated",
    breached: "breached",
  };
  return statusMap[status] || "default";
};

const formatTimeAgo = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = diffMs / (1000 * 60);
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${Math.floor(diffMins)}m ago`;
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
  if (diffDays < 7) return `${Math.floor(diffDays)}d ago`;

  // Absolute date
  const nowYear = now.getFullYear();
  const dateYear = date.getFullYear();
  if (dateYear === nowYear) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else {
    return date.toLocaleDateString('en-US');
  }
};

const SimpleActionLogCard = ({ log }) => {
  const statusColor = getStatusColor(log.status);

  return (
    <li className={styles.logItem}>
      <div className={`${styles.timelineDot} ${styles[statusColor]}`}></div>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.actionInfo}>
            <div className={styles.actionName}>
              <div className={styles.userRoleSection}>
                <span className={styles.userName}>{log.user_full_name}</span>
                <span className={styles.role}>{log.role}</span>
              </div>
            </div>
          </div>
          <div className={styles.actionSub}>
            <div className={`${styles.actionType} ${styles[statusColor]}`}>{log.status}</div>
            <div className={styles.timestamp}>
              {log.acted_on
                ? formatTimeAgo(log.acted_on)
                : formatTimeAgo(log.assigned_on)}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};

const ActionLogCard = ({ log }) => {
  const statusColor = getStatusColor(log.status);

  return (
    <li className={styles.logItem}>
      <div className={`${styles.timelineDot} ${styles[statusColor]}`}></div>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.actionInfo}>
            <div className={styles.actionName}>
              <div className={styles.userRoleSection}>
                <span className={styles.userName}>{log.user_full_name}</span>
                <span className={styles.role}>{log.role}</span>
              </div>
            </div>
          </div>
          <div className={styles.actionSub}>
            <div className={`${styles.actionType} ${styles[statusColor]}`}>{log.status}</div>
            <div className={styles.timestamp}>
              {log.acted_on
                ? formatTimeAgo(log.acted_on)
                : formatTimeAgo(log.assigned_on)}
            </div>
          </div>
        </div>

        <div className={styles.stepInfo}>
          <span className={styles.stepName}>{log.assigned_on_step_name}</span>
        </div>

        <div className={styles.meta}>
          {log.notes && (
            <div className={styles.comment}>
              <strong>Notes:</strong> {log.notes}
            </div>
          )}

          {log.task_history && log.task_history.length > 0 && (
            <div className={styles.historyMeta}>
              <strong>Status Progression:</strong>
              <div className={styles.historyTimeline}>
                {[...log.task_history].reverse().map((history, idx) => (
                  <div key={history.task_item_history_id} className={styles.historyEntry}>
                    <div className={`${styles.historyBadge} ${styles[getStatusColor(history.status)]}`}>
                      {history.status}
                    </div>
                    <div className={styles.historyTime}>
                      {formatTimeAgo(history.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.metaTags}>
            {log.origin && (
              <span className={styles.tag}>Origin: {log.origin}</span>
            )}
            {log.target_resolution && (
              <span className={styles.tag}>
                Target: {new Date(log.target_resolution).toLocaleTimeString()}
              </span>
            )}
            {log.transferred_to_user_name && (
              <span className={styles.tag}>
                Transferred to: {log.transferred_to_user_name}
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
};

const ActionLogList = ({ logs, loading, error }) => {
  const [simpleView, setSimpleView] = useState(true);

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

  if (!logs || logs.length === 0) {
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
          <div className={styles.viewToggle}>
            <label className={styles.switchLabel}>
              {/* Switch "on" now represents Detailed View; default is Simple View (off) */}
              <input
                type="checkbox"
                checked={!simpleView}
                onChange={(e) => setSimpleView(!e.target.checked)}
                className={styles.switchInput}
              />
              <span className={styles.switchSlider}></span>
              <span className={styles.switchText}>
                {simpleView ? "Simple View" : "Detailed View"}
              </span>
            </label>
          </div>
      <ul className={styles.timeline}>
        {logs.map((log) =>
          simpleView ? (
            <SimpleActionLogCard key={log.task_item_id} log={log} />
          ) : (
            <ActionLogCard key={log.task_item_id} log={log} />
          )
        )}
      </ul>
    </div>
  );
};

export default ActionLogList;
