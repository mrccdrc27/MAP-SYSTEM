import React, { memo, useState } from 'react';
import { Clock, ChevronDown, ChevronUp, HelpCircle, AlertCircle } from 'lucide-react';
import styles from './SLAPanel.module.css';

/**
 * Unified SLA configuration panel
 * Used in both Create and Edit workflow pages
 */
const SLAPanel = memo(function SLAPanel({
  responseSLA = { hours: 0, minutes: 0 },
  resolutionSLA = { hours: 0, minutes: 0 },
  onResponseSLAChange,
  onResolutionSLAChange,
  isCollapsible = false,
  defaultExpanded = true,
  readOnly = false,
  className = ''
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleResponseChange = (field, value) => {
    if (readOnly || !onResponseSLAChange) return;
    const numValue = parseInt(value) || 0;
    onResponseSLAChange({
      ...responseSLA,
      [field]: Math.max(0, numValue)
    });
  };

  const handleResolutionChange = (field, value) => {
    if (readOnly || !onResolutionSLAChange) return;
    const numValue = parseInt(value) || 0;
    onResolutionSLAChange({
      ...resolutionSLA,
      [field]: Math.max(0, numValue)
    });
  };

  // Calculate total minutes for display
  const responseTotal = (responseSLA.hours * 60) + responseSLA.minutes;
  const resolutionTotal = (resolutionSLA.hours * 60) + resolutionSLA.minutes;
  const isValidSLA = responseTotal <= resolutionTotal || resolutionTotal === 0;

  const content = (
    <div className={styles.content}>
      {/* Response SLA */}
      <div className={styles.slaGroup}>
        <label className={styles.slaLabel}>
          <span className={styles.labelText}>Response Time</span>
          <span className={styles.labelHint}>
            <HelpCircle size={12} />
            Time to first response
          </span>
        </label>
        <div className={styles.timeInputs}>
          <div className={styles.timeInput}>
            <input
              type="number"
              min="0"
              max="999"
              value={responseSLA.hours}
              onChange={(e) => handleResponseChange('hours', e.target.value)}
              className={styles.input}
              disabled={readOnly}
            />
            <span className={styles.unit}>hrs</span>
          </div>
          <div className={styles.timeInput}>
            <input
              type="number"
              min="0"
              max="59"
              value={responseSLA.minutes}
              onChange={(e) => handleResponseChange('minutes', e.target.value)}
              className={styles.input}
              disabled={readOnly}
            />
            <span className={styles.unit}>min</span>
          </div>
        </div>
      </div>

      {/* Resolution SLA */}
      <div className={styles.slaGroup}>
        <label className={styles.slaLabel}>
          <span className={styles.labelText}>Resolution Time</span>
          <span className={styles.labelHint}>
            <HelpCircle size={12} />
            Total time to resolve
          </span>
        </label>
        <div className={styles.timeInputs}>
          <div className={styles.timeInput}>
            <input
              type="number"
              min="0"
              max="999"
              value={resolutionSLA.hours}
              onChange={(e) => handleResolutionChange('hours', e.target.value)}
              className={styles.input}
              disabled={readOnly}
            />
            <span className={styles.unit}>hrs</span>
          </div>
          <div className={styles.timeInput}>
            <input
              type="number"
              min="0"
              max="59"
              value={resolutionSLA.minutes}
              onChange={(e) => handleResolutionChange('minutes', e.target.value)}
              className={styles.input}
              disabled={readOnly}
            />
            <span className={styles.unit}>min</span>
          </div>
        </div>
      </div>

      {/* Warning */}
      {!isValidSLA && (
        <div className={styles.warning}>
          <AlertCircle size={14} />
          <span>Response time should not exceed resolution time</span>
        </div>
      )}

      {/* Info */}
      <div className={styles.info}>
        <Clock size={14} className={styles.infoIcon} />
        <span>SLA times apply to all steps in this workflow</span>
      </div>
    </div>
  );

  if (!isCollapsible) {
    return (
      <div className={`${styles.panel} ${className}`}>
        <div className={styles.header}>
          <h4 className={styles.title}>
            <Clock size={16} />
            SLA Configuration
          </h4>
        </div>
        {content}
      </div>
    );
  }

  return (
    <div className={`${styles.panel} ${styles.collapsible} ${className}`}>
      <button
        className={styles.headerBtn}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h4 className={styles.title}>
          <Clock size={16} />
          SLA Configuration
        </h4>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isExpanded && content}
    </div>
  );
});

export default SLAPanel;
