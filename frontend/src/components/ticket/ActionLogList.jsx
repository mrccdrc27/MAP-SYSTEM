import React from 'react';
import styles from './ActionLogList.module.css';

const ActionLogCard = ({ log }) => (
  <li className={styles.card}>
    <div className={styles.meta}>
      <div><strong>📝 Action:</strong> {log.action?.name || 'Unknown'}</div>
      <div><strong>⏱️ Timestamp:</strong> {new Date(log.created_at).toLocaleString()}</div>
      <div><strong>📍 Resolver:</strong> {log.user}</div>
      {log.comment && (
        <div><strong>💬 Comment:</strong> {log.comment}</div>
      )}
    </div>
  </li>
);

const ActionLogList = ({ logs, loading, error }) => {
  if (loading) return <p>Loading action logs...</p>;
  if (error) return <p className={styles.error}>Failed to load logs: {JSON.stringify(error)}</p>;
  if (logs.length === 0) return <p>No action logs found for this task.</p>;

  return (
    <ul className={styles.list}>
      {logs.map(log => (
        <ActionLogCard key={log.id} log={log} />
      ))}
    </ul>
  );
};

export default ActionLogList;
