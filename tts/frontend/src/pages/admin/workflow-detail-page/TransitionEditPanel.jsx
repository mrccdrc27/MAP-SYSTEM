import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
// Use shared styles from CreateWorkflowPage for consistency
import styles from '../workflow-page/create-workflow.module.css';
import { validateTransitionName, VALIDATION_RULES } from '../../../utils/workflowValidation';

export default function TransitionEditPanel({ transition, onUpdate, onDelete }) {
  const [formData, setFormData] = useState({
    label: '',
  });
  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    if (transition) {
      setFormData({
        label: transition.label || transition.name || '',
      });
      setValidationError(null);
    }
  }, [transition]);

  const handleChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Validate
    const validation = validateTransitionName(value);
    setValidationError(validation.errors.length > 0 ? validation.errors[0] : null);
    
    if (onUpdate) {
      onUpdate({
        label: newFormData.label,
        name: newFormData.label,
      });
    }
  };

  if (!transition) return null;

  return (
    <div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Transition Label</label>
        <input
          type="text"
          value={formData.label}
          onChange={(e) => handleChange('label', e.target.value)}
          className={`${styles.formInput} ${validationError ? styles.formInputError : ''}`}
          placeholder="e.g., Approved, Rejected, Submit"
          maxLength={VALIDATION_RULES.TRANSITION_NAME_MAX_LENGTH}
        />
        {validationError && (
          <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
            {validationError}
          </p>
        )}
        <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
          {formData.label.length}/{VALIDATION_RULES.TRANSITION_NAME_MAX_LENGTH} characters (optional)
        </p>
      </div>

      {/* Transition Info using inline styles for simplicity */}
      <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: '0.8125rem', marginBottom: '8px' }}>
          <span style={{ color: 'var(--muted-text-color)' }}>From:</span>
          <span style={{ marginLeft: '8px', color: 'var(--text-color)' }}>Step {transition.source}</span>
        </div>
        <div style={{ fontSize: '0.8125rem' }}>
          <span style={{ color: 'var(--muted-text-color)' }}>To:</span>
          <span style={{ marginLeft: '8px', color: 'var(--text-color)' }}>Step {transition.target}</span>
        </div>
      </div>

      {onDelete && (
        <div className={styles.formDivider}>
          <button onClick={onDelete} className={styles.btnDelete}>
            <Trash2 className={styles.btnDeleteIcon} />
            Delete Transition
          </button>
        </div>
      )}
    </div>
  );
}
