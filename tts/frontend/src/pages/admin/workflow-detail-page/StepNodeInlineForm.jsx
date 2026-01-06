import React, { memo, useCallback } from 'react';
import { Check, X, Trash2 } from 'lucide-react';
import styles from '../workflow-page/create-workflow.module.css';

/**
 * Inline edit form for StepNode
 * Extracted to reduce StepNode complexity
 */
const StepNodeInlineForm = memo(function StepNodeInlineForm({
  formData,
  roles = [],
  hasChanges,
  isStartNode,
  isEndNode,
  onChange,
  onSave,
  onCancel,
  onDelete,
  onMouseDown,
}) {
  const handleCheckboxChange = useCallback((field, checked) => {
    onChange(field, checked);
    // Mutually exclusive: if setting one, unset the other
    if (field === 'is_start' && checked && formData.is_end) {
      onChange('is_end', false);
    }
    if (field === 'is_end' && checked && formData.is_start) {
      onChange('is_start', false);
    }
  }, [onChange, formData.is_start, formData.is_end]);

  return (
    <div 
      className={styles.stepNodeEditForm} 
      onMouseDown={onMouseDown}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Step Name */}
      <div className={styles.stepNodeFormGroup}>
        <label className={styles.stepNodeFormLabel}>Name</label>
        <input
          type="text"
          value={formData.label}
          onChange={(e) => onChange('label', e.target.value)}
          onMouseDown={onMouseDown}
          className={styles.stepNodeFormInput}
          placeholder="Step name"
        />
      </div>
      
      {/* Role Select */}
      <div className={styles.stepNodeFormGroup}>
        <label className={styles.stepNodeFormLabel}>Role</label>
        {roles.length > 0 ? (
          <select
            value={formData.role}
            onChange={(e) => onChange('role', e.target.value)}
            onMouseDown={onMouseDown}
            className={styles.stepNodeFormSelect}
          >
            <option value="">-- Select Role --</option>
            {roles.map((role) => (
              <option key={role.role_id || role.id || role.name} value={role.name}>
                {role.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={formData.role}
            onChange={(e) => onChange('role', e.target.value)}
            onMouseDown={onMouseDown}
            className={styles.stepNodeFormInput}
            placeholder="Role name"
          />
        )}
      </div>
      
      {/* Description */}
      <div className={styles.stepNodeFormGroup}>
        <label className={styles.stepNodeFormLabel}>Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => onChange('description', e.target.value)}
          onMouseDown={onMouseDown}
          className={styles.stepNodeFormTextarea}
          placeholder="Step description"
          rows={2}
        />
      </div>
      
      {/* Instruction */}
      <div className={styles.stepNodeFormGroup}>
        <label className={styles.stepNodeFormLabel}>Instruction</label>
        <textarea
          value={formData.instruction}
          onChange={(e) => onChange('instruction', e.target.value)}
          onMouseDown={onMouseDown}
          className={styles.stepNodeFormTextarea}
          placeholder="Instructions for users"
          rows={2}
        />
      </div>
      
      {/* Start/End Toggles */}
      <div className={styles.stepNodeFormGroup}>
        <label className={styles.stepNodeFormCheckbox}>
          <input
            type="checkbox"
            checked={formData.is_start}
            onChange={(e) => handleCheckboxChange('is_start', e.target.checked)}
            onMouseDown={onMouseDown}
          />
          <span>Mark as START</span>
        </label>
        <label className={styles.stepNodeFormCheckbox}>
          <input
            type="checkbox"
            checked={formData.is_end}
            onChange={(e) => handleCheckboxChange('is_end', e.target.checked)}
            onMouseDown={onMouseDown}
          />
          <span>Mark as END</span>
        </label>
      </div>
      
      {/* Action Buttons */}
      <div className={styles.stepNodeFormActions}>
        {hasChanges && (
          <>
            <button
              onClick={onSave}
              onMouseDown={onMouseDown}
              className={styles.stepNodeFormBtnSave}
              title="Save changes"
            >
              <Check size={14} />
              Save
            </button>
            <button
              onClick={onCancel}
              onMouseDown={onMouseDown}
              className={styles.stepNodeFormBtnCancel}
              title="Cancel changes"
            >
              <X size={14} />
              Cancel
            </button>
          </>
        )}
        {onDelete && !isStartNode && !isEndNode && (
          <button
            onClick={onDelete}
            onMouseDown={onMouseDown}
            className={styles.stepNodeFormBtnDelete}
            title="Delete step"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
});

export default StepNodeInlineForm;
