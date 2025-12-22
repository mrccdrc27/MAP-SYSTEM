import React from 'react';
import styles from './integration-status-card.module.css';

const IntegrationStatusCard = () => {
  const integrations = [
    {
      name: 'Helpdesk and Ticketing System',
      status: 'Connected',
      lastSynced: '2025-09-10 09:00 AM',
    },
    {
      name: 'Asset Management System',
      status: 'Error',
      lastSynced: '2025-09-09 11:15 PM',
    },
    {
      name: 'Budget Management System',
      status: 'Disconnected',
      lastSynced: null,
    },
  ];

  // Maps status to a className in the module
  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'connected':
        return styles.statusConnected;
      case 'error':
        return styles.statusError;
      case 'disconnected':
        return styles.statusDisconnected;
      default:
        return '';
    }
  };

  return (
    <div className={styles.container}>
      <table className={styles.table}>
        <thead>
          <tr className={styles.headerRow}>
            <th className={styles.headerCell}>Integrated System</th>
            <th className={styles.headerCell}>Status</th>
            <th className={styles.headerCell}>Last Synced</th>
          </tr>
        </thead>
        <tbody>
          {integrations.map((integration, index) => (
            <tr key={index}>
              <td className={styles.cell}>{integration.name}</td>
              <td className={styles.cell}>
                <span className={`${styles.status} ${getStatusClass(integration.status)}`}>
                  {integration.status}
                </span>
              </td>
              <td className={styles.cell}>
                {integration.lastSynced || 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default IntegrationStatusCard;
