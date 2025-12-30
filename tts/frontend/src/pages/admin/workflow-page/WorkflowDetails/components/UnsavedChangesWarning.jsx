import React, { memo } from 'react';
import { AlertCircle } from 'lucide-react';
import styles from '../WorkflowEditorLayout.module.css';

/**
 * Unsaved changes warning banner
 */
const UnsavedChangesWarning = memo(function UnsavedChangesWarning({ onSave }) {
  return (
    <div className={styles.unsavedWarning}>
      <div className={styles.warningContent}>
        <AlertCircle className={styles.warningIcon} />
        <span>You have unsaved changes</span>
      </div>
      <button onClick={onSave} className={styles.saveNowBtn}>
        Save now
      </button>
    </div>
  );
});

export default UnsavedChangesWarning;
