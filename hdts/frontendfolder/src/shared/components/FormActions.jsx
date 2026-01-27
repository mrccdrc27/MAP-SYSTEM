import React from 'react';
import Button from './Button';
import styles from '../styles/formActions.module.css';

/**
 * FormActions
 * Props:
 * - onCancel: function to call when cancel clicked
 * - cancelLabel: label for cancel button (default: 'Cancel')
 * - onSubmit: submit handler - called when submit button clicked
 * - submitLabel: label for submit button
 * - submitDisabled: boolean
 * - submitVariant: 'primary'|'secondary' (default: 'primary')
 * - cancelSize: button size for cancel button
 * - submitSize: button size for submit button
 */
export default function FormActions({
  onCancel,
  cancelLabel = 'Cancel',
  onSubmit,
  submitLabel = 'Submit',
  submitDisabled = false,
  submitVariant = 'primary',
  cancelSize,
  submitSize
}) {
  const handleSubmitClick = (e) => {
    e.preventDefault();
    if (onSubmit && !submitDisabled) {
      onSubmit(e);
    }
  };

  return (
    <div className={styles.actionContainer}>
      <div className={styles.actionFlexChild}>
        <Button
          type="button"
          variant="outline"
          className={styles.formAction}
          onClick={onCancel}
          size={cancelSize}
        >
          {cancelLabel}
        </Button>
      </div>

      <div className={styles.actionFlexChild}>
        <Button
          type="button"
          variant={submitVariant}
          className={styles.formAction}
          disabled={submitDisabled}
          onClick={handleSubmitClick}
          size={submitSize}
        >
          {submitDisabled ? 'Please wait...' : submitLabel}
        </Button>
      </div>
    </div>
  );
}
