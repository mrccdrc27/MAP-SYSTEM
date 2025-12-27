import React from 'react';
import SLAStatus from './SLAStatus';
import styles from './SLADemo.module.css';

const SLADemo = () => {
  // Mock ticket data for demonstration
  const mockTickets = [
    {
      ticket_id: 'TCK-2025-001',
      ticket_subject: 'Critical Server Outage',
      priority: 'Critical',
      status: 'In Progress',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      target_resolution: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
    },
    {
      ticket_id: 'TCK-2025-002',
      ticket_subject: 'Software Installation Request',
      priority: 'Medium',
      status: 'Open',
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      target_resolution: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(), // 20 hours from now
    },
    {
      ticket_id: 'TCK-2025-003',
      ticket_subject: 'Overdue Password Reset',
      priority: 'High',
      status: 'Open',
      created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
      target_resolution: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour overdue
    },
    {
      ticket_id: 'TCK-2025-004',
      ticket_subject: 'Resolved Network Issue',
      priority: 'High',
      status: 'Resolved',
      created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 48 hours ago
      target_resolution: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(), // Target was 36 hours ago
      resolved_at: new Date(Date.now() - 40 * 60 * 60 * 1000).toISOString(), // Resolved 40 hours ago (within SLA)
    },
    {
      ticket_id: 'TCK-2025-005',
      ticket_subject: 'Low Priority Documentation Update',
      priority: 'Low',
      status: 'Open',
      created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
      target_resolution: new Date(Date.now() + 60 * 60 * 60 * 1000).toISOString(), // 60 hours from now
    }
  ];

  return (
    <div className={styles.demoContainer}>
      <h2>SLA Status Component Demo</h2>
      <p className={styles.demoDescription}>
        This demo shows how the SLA component displays different ticket states and priorities.
      </p>
      
      <div className={styles.demoGrid}>
        {mockTickets.map((ticket) => (
          <div key={ticket.ticket_id} className={styles.ticketCard}>
            <div className={styles.ticketHeader}>
              <h3>{ticket.ticket_id}</h3>
              <span className={`${styles.statusBadge} ${styles[ticket.status.toLowerCase().replace(' ', '')]}`}>
                {ticket.status}
              </span>
            </div>
            <p className={styles.ticketSubject}>{ticket.ticket_subject}</p>
            
            <SLAStatus 
              ticket={ticket} 
              targetResolution={ticket.target_resolution}
            />
          </div>
        ))}
      </div>
      
      <div className={styles.legend}>
        <h3>SLA Status Legend</h3>
        <div className={styles.legendGrid}>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.success}`}></span>
            <span>On Track - Less than 50% of SLA time elapsed</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.caution}`}></span>
            <span>In Progress - 50-80% of SLA time elapsed</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.warning}`}></span>
            <span>Due Soon - More than 80% of SLA time elapsed</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.danger}`}></span>
            <span>Overdue - Past SLA deadline</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SLADemo;