import React, { memo } from 'react';
import { Clock } from 'lucide-react';
import { SLA_PRIORITIES } from '../constants/workflowTemplates';
import { parseDuration, createDuration } from '../hooks/useWorkflowValidation';
import styles from '../create-workflow.module.css';

/**
 * SLA Configuration component for workflow creation
 */
const SLAConfiguration = memo(function SLAConfiguration({ workflowMetadata, setWorkflowMetadata }) {
  const handleTimeChange = (key, type, value) => {
    const { hours, minutes } = parseDuration(workflowMetadata[`${key}_sla`]);
    const newHours = type === 'hours' ? value : hours;
    const newMinutes = type === 'minutes' ? value : minutes;
    const duration = createDuration(newHours, newMinutes);
    setWorkflowMetadata(prev => ({ ...prev, [`${key}_sla`]: duration }));
  };

  return (
    <div className={styles.previewBox}>
      <h3 className={styles.previewTitle}><Clock size={16} /> SLA Configuration</h3>
      <div className={styles.previewContent}>
        <div className={styles.slaHintInline} style={{ marginBottom: '12px', fontSize: '12px', color: '#666' }}>
          Set response time limits (Urgent &lt; High &lt; Medium &lt; Low)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {SLA_PRIORITIES.map(({ key, label, color }) => {
            const { hours, minutes } = parseDuration(workflowMetadata[`${key}_sla`]);
            return (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: color,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{
                    width: '3px',
                    height: '14px',
                    backgroundColor: color,
                    borderRadius: '2px'
                  }} />
                  {label}
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div className={styles.slaTimeGroup}>
                    <input
                      type="number"
                      value={hours}
                      onChange={(e) => handleTimeChange(key, 'hours', e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                      className={styles.slaTimeInput}
                    />
                    <span className={styles.slaTimeUnit}>h</span>
                  </div>
                  <div className={styles.slaTimeGroup}>
                    <input
                      type="number"
                      value={minutes}
                      onChange={(e) => handleTimeChange(key, 'minutes', e.target.value)}
                      placeholder="0"
                      min="0"
                      max="59"
                      step="1"
                      className={styles.slaTimeInput}
                    />
                    <span className={styles.slaTimeUnit}>m</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default SLAConfiguration;
