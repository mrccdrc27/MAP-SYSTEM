import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import styles from './WorkflowEditorLayout.module.css';

export default function TransitionEditPanel({ transition, onUpdate, onDelete }) {
  const [formData, setFormData] = useState({
    label: '',
  });

  useEffect(() => {
    if (transition) {
      setFormData({
        label: transition.label || transition.name || '',
      });
    }
  }, [transition]);

  const handleChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
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
          className={styles.formInput}
          placeholder="e.g., Approved, Rejected, Submit"
        />
      </div>

      <div className={styles.transitionInfo}>
        <div className={styles.transitionInfoItem}>
          <span className={styles.transitionInfoLabel}>From:</span>
          <span className={styles.transitionInfoValue}>Step {transition.source}</span>
        </div>
        <div className={styles.transitionInfoItem}>
          <span className={styles.transitionInfoLabel}>To:</span>
          <span className={styles.transitionInfoValue}>Step {transition.target}</span>
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
