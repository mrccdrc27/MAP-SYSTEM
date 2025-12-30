import React, { memo, useState, useCallback } from 'react';
import {
  Play, CheckCircle, Pause, CircleDot, GitBranch, Users,
  ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import styles from './StepEditForm.module.css';

/**
 * Step type options
 */
const STEP_TYPES = [
  { value: 'initial', label: 'Initial', icon: Play, color: '#22c55e' },
  { value: 'standard', label: 'Standard', icon: CircleDot, color: '#3b82f6' },
  { value: 'hold', label: 'Hold', icon: Pause, color: '#f59e0b' },
  { value: 'decision', label: 'Decision', icon: GitBranch, color: '#8b5cf6' },
  { value: 'approval', label: 'Approval', icon: Users, color: '#06b6d4' },
  { value: 'terminal', label: 'Terminal', icon: CheckCircle, color: '#f43f5e' },
];

/**
 * Unified step edit form
 * Used in both Create and Edit workflow pages
 */
const StepEditForm = memo(function StepEditForm({
  step,
  roles = [],
  errors = {},
  onChange,
  showAdvanced = false,
  className = ''
}) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(showAdvanced);

  const handleChange = useCallback((field, value) => {
    if (onChange) {
      onChange({ ...step, [field]: value });
    }
  }, [step, onChange]);

  const selectedType = STEP_TYPES.find(t => t.value === step?.type) || STEP_TYPES[1];
  const TypeIcon = selectedType.icon;

  return (
    <div className={`${styles.form} ${className}`}>
      {/* Step Name */}
      <div className={styles.formGroup}>
        <label className={styles.label}>
          Step Name <span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          value={step?.name || step?.label || ''}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Enter step name..."
          className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
        />
        {errors.name && (
          <span className={styles.error}>
            <AlertCircle size={12} /> {errors.name}
          </span>
        )}
      </div>

      {/* Step Type */}
      <div className={styles.formGroup}>
        <label className={styles.label}>Step Type</label>
        <div className={styles.typeGrid}>
          {STEP_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = step?.type === type.value;
            return (
              <button
                key={type.value}
                type="button"
                className={`${styles.typeBtn} ${isSelected ? styles.typeBtnActive : ''}`}
                style={{
                  '--type-color': type.color,
                  '--type-bg': `${type.color}15`,
                  '--type-border': `${type.color}40`
                }}
                onClick={() => handleChange('type', type.value)}
              >
                <Icon size={16} />
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Assigned Role */}
      <div className={styles.formGroup}>
        <label className={styles.label}>
          Assigned Role <span className={styles.required}>*</span>
        </label>
        <select
          value={step?.assignedRole || step?.assigned_role || ''}
          onChange={(e) => handleChange('assignedRole', e.target.value)}
          className={`${styles.select} ${errors.assignedRole ? styles.inputError : ''}`}
        >
          <option value="">Select a role...</option>
          {roles.map((role) => (
            <option key={role.id || role} value={role.name || role}>
              {role.name || role}
            </option>
          ))}
        </select>
        {errors.assignedRole && (
          <span className={styles.error}>
            <AlertCircle size={12} /> {errors.assignedRole}
          </span>
        )}
      </div>

      {/* Description */}
      <div className={styles.formGroup}>
        <label className={styles.label}>Description</label>
        <textarea
          value={step?.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Optional description..."
          rows={3}
          className={styles.textarea}
        />
      </div>

      {/* Advanced Settings Toggle */}
      <button
        type="button"
        className={styles.advancedToggle}
        onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
      >
        Advanced Settings
        {isAdvancedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Advanced Settings */}
      {isAdvancedOpen && (
        <div className={styles.advancedPanel}>
          {/* Step SLA Override */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Step SLA Override (minutes)</label>
            <input
              type="number"
              min="0"
              value={step?.slaMinutes || ''}
              onChange={(e) => handleChange('slaMinutes', parseInt(e.target.value) || null)}
              placeholder="Use workflow default"
              className={styles.input}
            />
            <span className={styles.hint}>Leave empty to use workflow SLA</span>
          </div>

          {/* Auto-assign */}
          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={step?.autoAssign || false}
                onChange={(e) => handleChange('autoAssign', e.target.checked)}
              />
              <span>Auto-assign to role members</span>
            </label>
          </div>

          {/* Require comment */}
          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={step?.requireComment || false}
                onChange={(e) => handleChange('requireComment', e.target.checked)}
              />
              <span>Require comment on transition</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
});

export default StepEditForm;
