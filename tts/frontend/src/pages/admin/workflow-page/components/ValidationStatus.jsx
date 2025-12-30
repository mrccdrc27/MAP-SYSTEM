import React, { memo } from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import styles from '../create-workflow.module.css';

/**
 * Validation status display component
 */
const ValidationStatus = memo(function ValidationStatus({ errors }) {
  const hasErrors = errors.length > 0;
  
  return (
    <div className={`${styles.validationBox} ${hasErrors ? styles.validationError : styles.validationOk}`}>
      <div className={styles.validationHeader}>
        {hasErrors ? (
          <><AlertTriangle size={16} /> {errors.length} Issue(s)</>
        ) : (
          <><CheckCircle size={16} /> Ready to Create</>
        )}
      </div>
      {hasErrors && (
        <ul className={styles.validationList}>
          {errors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default ValidationStatus;
