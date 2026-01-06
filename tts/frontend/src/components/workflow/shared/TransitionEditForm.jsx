import React, { memo, useState, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import styles from './TransitionEditForm.module.css';

/**
 * Unified transition edit form
 * Used in both Create and Edit workflow pages
 */
const TransitionEditForm = memo(function TransitionEditForm({
  transition,
  steps = [],
  errors = {},
  onChange,
  className = ''
}) {
  const handleChange = (field, value) => {
    if (onChange) {
      onChange({ ...transition, [field]: value });
    }
  };

  // Get available steps for from/to dropdowns
  const stepOptions = useMemo(() => {
    return steps.map(s => ({
      id: s.id,
      name: s.name || s.label || 'Untitled Step'
    }));
  }, [steps]);

  return (
    <div className={`${styles.form} ${className}`}>
      {/* From Step */}
      <div className={styles.formGroup}>
        <label className={styles.label}>
          From Step <span className={styles.required}>*</span>
        </label>
        <select
          value={transition?.source || transition?.from_step || ''}
          onChange={(e) => handleChange('source', e.target.value)}
          className={`${styles.select} ${errors.source ? styles.inputError : ''}`}
        >
          <option value="">Select source step...</option>
          {stepOptions.map((step) => (
            <option key={step.id} value={step.id}>
              {step.name}
            </option>
          ))}
        </select>
        {errors.source && (
          <span className={styles.error}>
            <AlertCircle size={12} /> {errors.source}
          </span>
        )}
      </div>

      {/* To Step */}
      <div className={styles.formGroup}>
        <label className={styles.label}>
          To Step <span className={styles.required}>*</span>
        </label>
        <select
          value={transition?.target || transition?.to_step || ''}
          onChange={(e) => handleChange('target', e.target.value)}
          className={`${styles.select} ${errors.target ? styles.inputError : ''}`}
        >
          <option value="">Select target step...</option>
          {stepOptions.map((step) => (
            <option key={step.id} value={step.id}>
              {step.name}
            </option>
          ))}
        </select>
        {errors.target && (
          <span className={styles.error}>
            <AlertCircle size={12} /> {errors.target}
          </span>
        )}
      </div>

      {/* Label/Name */}
      <div className={styles.formGroup}>
        <label className={styles.label}>Transition Label</label>
        <input
          type="text"
          value={transition?.label || transition?.name || ''}
          onChange={(e) => handleChange('label', e.target.value)}
          placeholder="e.g., Approve, Reject, Escalate..."
          className={styles.input}
        />
        <span className={styles.hint}>
          Optional label shown on the transition arrow
        </span>
      </div>

      {/* Conditions (Advanced) */}
      <div className={styles.formGroup}>
        <label className={styles.label}>Conditions</label>
        <textarea
          value={transition?.conditions || ''}
          onChange={(e) => handleChange('conditions', e.target.value)}
          placeholder="Optional conditions for this transition..."
          rows={2}
          className={styles.textarea}
        />
        <span className={styles.hint}>
          Define when this transition is allowed
        </span>
      </div>

      {/* Visual Preview */}
      {transition?.source && transition?.target && (
        <div className={styles.preview}>
          <span className={styles.previewStep}>
            {stepOptions.find(s => s.id === transition.source)?.name || 'Source'}
          </span>
          <div className={styles.previewArrow}>
            →
            {transition.label && (
              <span className={styles.previewLabel}>{transition.label}</span>
            )}
          </div>
          <span className={styles.previewStep}>
            {stepOptions.find(s => s.id === transition.target)?.name || 'Target'}
          </span>
        </div>
      )}
    </div>
  );
});

export default TransitionEditForm;
