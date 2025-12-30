import React, { memo } from 'react';
import { Check, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';
import styles from './ValidationPanel.module.css';

/**
 * Unified validation panel for workflow creation/editing
 * Can be used as a sidebar panel or inline component
 */
const ValidationPanel = memo(function ValidationPanel({
  errors = [],
  isCollapsible = false,
  defaultExpanded = true,
  onErrorClick,
  className = ''
}) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  
  const hasErrors = errors.length > 0;
  const isValid = !hasErrors;

  const handleErrorClick = (error) => {
    if (onErrorClick) {
      onErrorClick(error);
    }
  };

  const content = (
    <div className={styles.content}>
      {isValid ? (
        <div className={styles.validState}>
          <div className={styles.validIcon}>
            <Check size={20} />
          </div>
          <span className={styles.validText}>Workflow is valid and ready to save</span>
        </div>
      ) : (
        <ul className={styles.errorList}>
          {errors.map((error, idx) => (
            <li
              key={error.id || idx}
              className={`${styles.errorItem} ${onErrorClick ? styles.clickable : ''}`}
              onClick={() => handleErrorClick(error)}
            >
              <AlertCircle size={14} className={styles.errorIcon} />
              <span className={styles.errorText}>{error.message || error}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (!isCollapsible) {
    return (
      <div className={`${styles.panel} ${className}`}>
        <div className={styles.header}>
          <h4 className={styles.title}>
            {isValid ? (
              <span className={styles.valid}>✓ Valid</span>
            ) : (
              <span className={styles.invalid}>⚠ {errors.length} Issue{errors.length !== 1 ? 's' : ''}</span>
            )}
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
          Validation
          {hasErrors && (
            <span className={styles.badge}>{errors.length}</span>
          )}
        </h4>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isExpanded && content}
    </div>
  );
});

export default ValidationPanel;
