import React, { useState, memo } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, AlertCircle } from 'lucide-react';
import styles from '../workflow-page/create-workflow.module.css';
import sidebarStyles from './WorkflowInfoSidebar.module.css';

/**
 * Helper function to parse Django DurationField format and display as readable time
 * Django format: "D HH:MM:SS" (e.g., "5 00:00:00" for 5 days) or "HH:MM:SS" (e.g., "08:00:00" for 8 hours)
 * Also handles numeric seconds for backward compatibility
 */
function formatDuration(duration) {
  if (!duration) return 'N/A';
  
  // If it's a number (seconds), convert directly
  if (typeof duration === 'number') {
    return formatSecondsToReadable(duration);
  }
  
  // If it's a string in Django's DurationField format
  if (typeof duration === 'string') {
    const trimmed = duration.trim();
    
    // Check for "D HH:MM:SS" format (days + time)
    const dayTimeMatch = trimmed.match(/^(\d+)\s+(\d{1,2}):(\d{2}):(\d{2})$/);
    if (dayTimeMatch) {
      const days = parseInt(dayTimeMatch[1], 10);
      const hours = parseInt(dayTimeMatch[2], 10);
      const mins = parseInt(dayTimeMatch[3], 10);
      const secs = parseInt(dayTimeMatch[4], 10);
      const totalSeconds = (days * 86400) + (hours * 3600) + (mins * 60) + secs;
      return formatSecondsToReadable(totalSeconds);
    }
    
    // Check for "HH:MM:SS" format (time only)
    const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const mins = parseInt(timeMatch[2], 10);
      const secs = parseInt(timeMatch[3], 10);
      const totalSeconds = (hours * 3600) + (mins * 60) + secs;
      return formatSecondsToReadable(totalSeconds);
    }
    
    // Try parsing as a plain number string
    const numericValue = parseFloat(trimmed);
    if (!isNaN(numericValue)) {
      return formatSecondsToReadable(numericValue);
    }
  }
  
  return 'N/A';
}

function formatSecondsToReadable(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return '< 1m';
  
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  
  return parts.length > 0 ? parts.join(' ') : '< 1m';
}

/**
 * Workflow Info Sidebar for the editor page
 * Displays workflow metadata and SLA configuration
 */
const WorkflowInfoSidebar = memo(function WorkflowInfoSidebar({ workflowData }) {
  const [infoExpanded, setInfoExpanded] = useState(true);
  
  const workflow = workflowData?.workflow || {};
  
  return (
    <aside className={styles.leftSidebar}>
      {/* Workflow Details Tab */}
      <div className={styles.sidebarSection}>
        <button 
          className={`${styles.ribbonToggle} ${sidebarStyles.toggleButton}`}
          onClick={() => setInfoExpanded(!infoExpanded)}
        >
          <span className={styles.sidebarTitle}>Workflow Details</span>
          {infoExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        
        {infoExpanded && (
          <div className={styles.compactForm}>
            <div className={styles.inputGroup}>
              <label>Name</label>
              <input 
                type="text" 
                value={workflow.name || ''} 
                readOnly 
                className={sidebarStyles.readOnlyInput}
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Category</label>
              <input 
                type="text" 
                value={workflow.category || 'N/A'} 
                readOnly 
                className={sidebarStyles.readOnlyInput}
              />
            </div>
            {workflow.sub_category && (
              <div className={styles.inputGroup}>
                <label>Sub-Category</label>
                <input 
                  type="text" 
                  value={workflow.sub_category} 
                  readOnly 
                  className={sidebarStyles.readOnlyInput}
                />
              </div>
            )}
            <div className={styles.inputGroup}>
              <label>Status</label>
              <div className={`${sidebarStyles.statusBadge} ${workflow.is_active ? sidebarStyles.statusActive : sidebarStyles.statusInactive}`}>
                {workflow.is_active ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                {workflow.is_active ? 'Active' : 'Inactive'}
              </div>
            </div>
            {workflow.description && (
              <div className={styles.inputGroup}>
                <label>Description</label>
                <textarea 
                  value={workflow.description} 
                  readOnly 
                  rows={3}
                  className={sidebarStyles.readOnlyTextarea}
                />
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* SLA Info */}
      <div className={styles.sidebarSection}>
        <span className={`${styles.sidebarTitle} ${sidebarStyles.slaTitle}`}>
          SLA Configuration
        </span>
        <div className={styles.slaCompact}>
          {[
            { label: 'Urgent', color: 'var(--critical-color)', value: workflow.urgent_sla },
            { label: 'High', color: 'var(--high-color)', value: workflow.high_sla },
            { label: 'Medium', color: 'var(--medium-color)', value: workflow.medium_sla },
            { label: 'Low', color: 'var(--success-color)', value: workflow.low_sla },
          ].map((sla) => (
            <div key={sla.label} className={styles.slaRow}>
              <div className={styles.slaLabel} style={{ borderColor: sla.color }}>
                <span className={styles.slaLabelText}>{sla.label}</span>
              </div>
              <span className={sidebarStyles.slaValue}>
                {formatDuration(sla.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
});

export default WorkflowInfoSidebar;
