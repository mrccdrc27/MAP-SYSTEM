import React, { useMemo } from 'react';
import styles from './SLAStatus.module.css';

const SLAStatus = ({ ticket, targetResolution, className }) => {
  const slaData = useMemo(() => {
    if (!ticket) return null;

    const now = new Date();
    const createdAt = new Date(ticket.created_at);
    const targetDate = targetResolution ? new Date(targetResolution) : null;
    const resolvedAt = ticket.resolved_at ? new Date(ticket.resolved_at) : null;

    // If ticket is resolved, calculate if it was resolved within SLA
    if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
      if (resolvedAt && targetDate) {
        const resolvedWithinSLA = resolvedAt <= targetDate;
        const timeDiff = Math.abs(resolvedAt - targetDate);
        const diffHours = Math.round(timeDiff / (1000 * 60 * 60));
        const diffDays = Math.round(diffHours / 24);
        
        return {
          status: resolvedWithinSLA ? 'Met' : 'Breached',
          statusType: resolvedWithinSLA ? 'success' : 'danger',
          message: resolvedWithinSLA 
            ? `Resolved ${diffHours < 24 ? `${diffHours}h` : `${diffDays}d`} before SLA deadline`
            : `Resolved ${diffHours < 24 ? `${diffHours}h` : `${diffDays}d`} after SLA deadline`,
          timeRemaining: null,
          progress: resolvedWithinSLA ? 100 : null
        };
      }
      return {
        status: 'Resolved',
        statusType: 'success',
        message: 'Ticket resolved',
        timeRemaining: null,
        progress: 100
      };
    }

    // For active tickets, calculate remaining time
    if (targetDate) {
      const timeDiff = targetDate - now;
      const isOverdue = timeDiff < 0;
      const totalSLATime = targetDate - createdAt;
      const elapsedTime = now - createdAt;
      const progress = Math.min(Math.max((elapsedTime / totalSLATime) * 100, 0), 100);

      // Calculate time remaining/overdue
      const absDiff = Math.abs(timeDiff);
      const diffMinutes = Math.round(absDiff / (1000 * 60));
      const diffHours = Math.round(absDiff / (1000 * 60 * 60));
      const diffDays = Math.round(absDiff / (1000 * 60 * 60 * 24));

      let timeText;
      if (diffDays > 0) {
        timeText = `${diffDays}d`;
      } else if (diffHours > 0) {
        timeText = `${diffHours}h`;
      } else {
        timeText = `${diffMinutes}m`;
      }

      // Determine status based on time remaining
      let statusType;
      let status;
      if (isOverdue) {
        statusType = 'danger';
        status = 'Overdue';
      } else if (progress >= 80) {
        statusType = 'warning';
        status = 'Due Soon';
      } else if (progress >= 50) {
        statusType = 'caution';
        status = 'In Progress';
      } else {
        statusType = 'success';
        status = 'On Track';
      }

      return {
        status,
        statusType,
        message: isOverdue 
          ? `Overdue by ${timeText}`
          : `${timeText} remaining`,
        timeRemaining: timeText,
        progress,
        isOverdue
      };
    }

    return {
      status: 'Unknown',
      statusType: 'neutral',
      message: 'SLA target not available',
      timeRemaining: null,
      progress: 0
    };
  }, [ticket, targetResolution]);

  if (!slaData) return null;

  const getUrgencyIcon = () => {
    switch (slaData.statusType) {
      case 'danger':
        return 'fa-exclamation-triangle';
      case 'warning':
        return 'fa-clock';
      case 'caution':
        return 'fa-clock';
      case 'success':
        return 'fa-check-circle';
      default:
        return 'fa-info-circle';
    }
  };

  const getPriorityWeight = (priority) => {
    const weights = {
      'Critical': 4,
      'High': 3,
      'Medium': 2,
      'Low': 1
    };
    return weights[priority] || 2;
  };

  return (
    <div className={`${styles.slaContainer} ${className || ''}`}>
      <div className={styles.slaHeader}>
        <div className={styles.slaTitle}>
          <i className={`fa ${getUrgencyIcon()}`}></i>
          <span>SLA Status</span>
        </div>
        <div className={`${styles.slaBadge} ${styles[slaData.statusType]}`}>
          {slaData.status}
        </div>
      </div>

      {slaData.progress !== null && ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
        <div className={styles.slaProgress}>
          <div className={styles.progressBar}>
            <div 
              className={`${styles.progressFill} ${styles[slaData.statusType]}`}
              style={{ width: `${slaData.progress}%` }}
            />
          </div>
          <div className={styles.progressText}>
            {Math.round(slaData.progress)}% of SLA time elapsed
          </div>
        </div>
      )}

      <div className={styles.slaDetails}>
        <div className={styles.slaMessage}>
          <i className={`fa ${getUrgencyIcon()}`}></i>
          {slaData.message}
        </div>
        
        {ticket.priority && (
          <div className={styles.priorityInfo}>
            <span className={styles.priorityLabel}>Priority:</span>
            <span className={`${styles.priorityBadge} ${styles[`priority-${ticket.priority.toLowerCase()}`]}`}>
              {ticket.priority}
            </span>
            <div className={styles.priorityIndicator}>
              {Array.from({ length: 4 }, (_, i) => (
                <div 
                  key={i} 
                  className={`${styles.priorityDot} ${
                    i < getPriorityWeight(ticket.priority) ? styles.active : styles.inactive
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {targetResolution && (
        <div className={styles.slaTimestamps}>
          <div className={styles.timestampRow}>
            <span className={styles.timestampLabel}>Target Resolution:</span>
            <span className={styles.timestampValue}>
              {new Date(targetResolution).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
          {ticket.created_at && (
            <div className={styles.timestampRow}>
              <span className={styles.timestampLabel}>Created:</span>
              <span className={styles.timestampValue}>
                {new Date(ticket.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* SLA Performance Indicator */}
      <div className={styles.slaFooter}>
        <div className={styles.slaPerformance}>
          {slaData.statusType === 'success' && !slaData.isOverdue && (
            <span className={styles.performanceGood}>
              <i className="fa fa-thumbs-up"></i>
              Meeting SLA expectations
            </span>
          )}
          {slaData.statusType === 'warning' && (
            <span className={styles.performanceWarning}>
              <i className="fa fa-exclamation"></i>
              Requires attention
            </span>
          )}
          {slaData.statusType === 'danger' && (
            <span className={styles.performancePoor}>
              <i className="fa fa-exclamation-triangle"></i>
              SLA at risk
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SLAStatus;