import React from 'react';
import { AlertTriangle } from 'lucide-react';
import styles from './WorkflowEditorLayout.module.css';

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
}) {
  return (
    <div className={styles.dialogOverlay}>
      <div className={styles.dialogBox}>
        <div className={styles.dialogContent}>
          <div className={styles.dialogHeader}>
            <div className={variant === 'danger' ? styles.dialogIconDanger : styles.dialogIconWarning}>
              <AlertTriangle className={styles.dialogIcon} />
            </div>
            <div className={styles.dialogBody}>
              <h3 className={styles.dialogTitle}>{title}</h3>
              <p className={styles.dialogMessage}>{message}</p>
            </div>
          </div>
        </div>

        <div className={styles.dialogFooter}>
          <button onClick={onCancel} className={styles.btnCancel}>
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={variant === 'danger' ? styles.btnDanger : styles.btnWarning}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
