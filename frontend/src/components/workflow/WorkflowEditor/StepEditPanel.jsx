import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import styles from './WorkflowEditorLayout.module.css';

export default function StepEditPanel({ step, roles = [], onUpdate, onDelete }) {
  const [formData, setFormData] = useState({
    label: '',
    role: '',
    description: '',
    instruction: '',
    is_start: false,
    is_end: false,
  });

  useEffect(() => {
    if (step) {
      setFormData({
        label: step.label || step.name || '',
        role: step.role || '',
        description: step.description || '',
        instruction: step.instruction || '',
        is_start: step.is_start || step.isStart || false,
        is_end: step.is_end || step.isEnd || false,
      });
    }
  }, [step]);

  const handleChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    if (onUpdate) {
      onUpdate({
        name: newFormData.label,
        label: newFormData.label,
        role: newFormData.role,
        description: newFormData.description,
        instruction: newFormData.instruction,
        is_start: newFormData.is_start,
        is_end: newFormData.is_end,
      });
    }
  };

  if (!step) return null;

  return (
    <div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Step Name</label>
        <input
          type="text"
          value={formData.label}
          onChange={(e) => handleChange('label', e.target.value)}
          className={styles.formInput}
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Assigned Role</label>
        {roles.length > 0 ? (
          <select
            value={formData.role}
            onChange={(e) => handleChange('role', e.target.value)}
            className={styles.formSelect}
          >
            <option value="">Select a role</option>
            {roles.map((role) => (
              <option key={role.role_id || role.id} value={role.name}>
                {role.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={formData.role}
            onChange={(e) => handleChange('role', e.target.value)}
            className={styles.formInput}
            placeholder="e.g., Admin, Manager, Customer"
          />
        )}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
          className={styles.formTextarea}
          placeholder="Enter step description"
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Instruction</label>
        <textarea
          value={formData.instruction}
          onChange={(e) => handleChange('instruction', e.target.value)}
          rows={3}
          className={styles.formTextarea}
          placeholder="Enter step instruction"
        />
      </div>

      <div className={styles.formDivider}>
        <div className={styles.formCheckboxGroup}>
          <label className={styles.formCheckboxLabel}>
            <input
              type="checkbox"
              checked={formData.is_start}
              onChange={(e) => handleChange('is_start', e.target.checked)}
              className={styles.formCheckbox}
            />
            <span className={styles.formCheckboxText}>Mark as START step</span>
          </label>

          <label className={styles.formCheckboxLabel}>
            <input
              type="checkbox"
              checked={formData.is_end}
              onChange={(e) => handleChange('is_end', e.target.checked)}
              className={styles.formCheckbox}
            />
            <span className={styles.formCheckboxText}>Mark as END step</span>
          </label>
        </div>
      </div>

      {onDelete && !formData.is_start && !formData.is_end && (
        <div className={styles.formDivider}>
          <button onClick={onDelete} className={styles.btnDelete}>
            <Trash2 className={styles.btnDeleteIcon} />
            Delete Step
          </button>
        </div>
      )}
    </div>
  );
}
