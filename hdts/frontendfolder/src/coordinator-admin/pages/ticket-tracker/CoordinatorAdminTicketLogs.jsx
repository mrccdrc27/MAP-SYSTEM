import React from 'react';
import styles from './CoordinatorAdminTicketLogs.module.css';
import LogsPanel from '../../../shared/components/LogsPanel';

export default function CoordinatorAdminTicketLogs({ ticketLogs }) {
  return (
    <div className={styles.panelRoot}>
      <div className={styles.panelContent}>
        <div className={styles.logsPanel}>
          {ticketLogs && ticketLogs.length > 0 ? (
            <LogsPanel logs={ticketLogs} />
          ) : (
            <div className={styles.noLogs}>No logs available.</div>
          )}
        </div>
      </div>
    </div>
  );
}
