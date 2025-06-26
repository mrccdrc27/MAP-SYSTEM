import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, User, Calendar, Tag } from 'lucide-react';

import styles from './TicketTrackingVisual.module.css';

export default function TicketTrackingVisual({ ticketData }) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  const defaultTicket = {
    id: 'TK-2024-001',
    title: 'Critical System Performance Issue',
    priority: 'High',
    status: 'In Progress',
    assignee: 'Sarah Johnson',
    createdDate: '2024-06-20',
    category: 'Technical',
    currentStage: 2,
    progress: 65,
  };

  const ticket = ticketData || defaultTicket;

  const stages = [
    { id: 1, name: 'Created', icon: Tag },
    { id: 2, name: 'Assigned', icon: User },
    { id: 3, name: 'In Progress', icon: Clock },
    { id: 4, name: 'Review', icon: AlertCircle },
    { id: 5, name: 'Resolved', icon: CheckCircle },
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(ticket.progress);
    }, 300);
    return () => clearTimeout(timer);
  }, [ticket.progress]);

  const getStageStatus = (stageId) => {
    if (stageId < ticket.currentStage) return 'completed';
    if (stageId === ticket.currentStage) return 'active';
    return 'pending';
  };

  const getPriorityStyle = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return `${styles.priority} ${styles.priorityHigh}`;
      case 'medium':
        return `${styles.priority} ${styles.priorityMedium}`;
      case 'low':
        return `${styles.priority} ${styles.priorityLow}`;
      default:
        return `${styles.priority} ${styles.priorityMedium}`;
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'open':
        return `${styles.statusBadge} ${styles.statusOpen}`;
      case 'in progress':
        return `${styles.statusBadge} ${styles.statusInProgress}`;
      case 'resolved':
        return `${styles.statusBadge} ${styles.statusResolved}`;
      case 'closed':
        return `${styles.statusBadge} ${styles.statusClosed}`;
      default:
        return `${styles.statusBadge} ${styles.statusOpen}`;
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className={styles.ticketId}>#{ticket.id}</span>
          <span className={getPriorityStyle(ticket.priority)}>{ticket.priority} Priority</span>
        </div>
        <span className={getStatusStyle(ticket.status)}>{ticket.status}</span>
      </div>

      {/* Title */}
      <h2 className={styles.title}>{ticket.title}</h2>

      {/* Progress Section */}
      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <span className={styles.progressTitle}>Overall Progress</span>
          <span className={styles.progressPercentage}>{ticket.progress}%</span>
        </div>

        {/* Progress Bar */}
        <div className={styles.progressTrack}>
          <div
            className={styles.progressBar}
            style={{ width: `${animatedProgress}%` }}
          >
            <div className={styles.progressShine}></div>
          </div>
        </div>

        {/* Stages */}
        <div className={styles.stagesContainer}>
          <div className={styles.stageLine}></div>
          <div
            className={styles.stageLineActive}
            style={{ width: `${(ticket.currentStage - 1) * 25}%` }}
          ></div>

          {stages.map((stage) => {
            const status = getStageStatus(stage.id);
            const IconComponent = stage.icon;

            return (
              <div key={stage.id} className={styles.stage}>
                <div
                  className={`${styles.stageIcon} ${
                    status === 'pending'
                      ? styles.stageIconPending
                      : status === 'active'
                      ? styles.stageIconActive
                      : styles.stageIconCompleted
                  }`}
                >
                  <IconComponent size={20} />
                </div>
                <span
                  className={`${styles.stageLabel} ${
                    status === 'pending'
                      ? styles.stageLabelPending
                      : status === 'active'
                      ? styles.stageLabelActive
                      : styles.stageLabelCompleted
                  }`}
                >
                  {stage.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Details Grid */}
      <div className={styles.detailsGrid}>
        <div className={styles.detailCard}>
          <User className={styles.detailIcon} />
          <div>
            <div className={styles.detailLabel}>Assignee</div>
            <div className={styles.detailText}>{ticket.assignee}</div>
          </div>
        </div>

        <div className={styles.detailCard}>
          <Calendar className={styles.detailIcon} />
          <div>
            <div className={styles.detailLabel}>Created</div>
            <div className={styles.detailText}>{ticket.createdDate}</div>
          </div>
        </div>

        <div className={styles.detailCard}>
          <Tag className={styles.detailIcon} />
          <div>
            <div className={styles.detailLabel}>Category</div>
            <div className={styles.detailText}>{ticket.category}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
