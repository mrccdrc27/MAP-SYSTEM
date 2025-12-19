import React from 'react';
import { FiUser, FiUsers, FiTag, FiCheckCircle, FiInbox, FiClock } from 'react-icons/fi';
import styles from './LogsPanel.module.css';

// Props: logs: [{ id, user, action, text, timestamp, highlight }]
export default function LogsPanel({ logs = [] }) {
  const getLogIcon = (action) => {
    const a = (action || '').toLowerCase();
    if (a.includes('created')) return <FiInbox />;
    if (a.includes('assigned') || a.includes('assign')) return <FiUsers />;
    if (a.includes('status') || a.includes('updated') || a.includes('changed')) return <FiTag />;
    if (a.includes('resolved')) return <FiCheckCircle />;
    if (a.includes('closed')) return <FiClock />;
    return <FiUser />;
  };

  const renderLogText = (text, highlight) => {
    if (!text) return null;
    if (!highlight) return text;
    const hlStr = String(highlight);
    const lower = text.toLowerCase();
    const hl = hlStr.toLowerCase();
    const idx = lower.indexOf(hl);
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const matched = text.slice(idx, idx + hlStr.length);
    const after = text.slice(idx + hlStr.length);
    return (
      <>
        {before}
        <strong>{matched}</strong>
        {after}
      </>
    );
  };

  return (
    <div className={styles.logsRoot}>
      {logs && logs.length > 0 ? (
        logs.map((log) => (
          <div key={log.id} className={styles.logEntry}>
            <div className={styles.logAvatar} aria-hidden>
              {getLogIcon(log.action || log.text)}
            </div>
            <div className={styles.logBody}>
              <div className={styles.logText}>
                {log.user ? (
                  <>
                    <strong className={styles.logUserLabel}>{log.user}</strong>
                    {': '}
                    {renderLogText(log.text || log.action, log.highlight)}
                  </>
                ) : (
                  renderLogText(log.text || log.action, log.highlight)
                )}
              </div>
              <div className={styles.logTimestamp}>{log.timestamp}</div>
            </div>
          </div>
        ))
      ) : (
        <div className={styles.empty}>No activity recorded.</div>
      )}
    </div>
  );
}
