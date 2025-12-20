import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, AlertCircle } from 'lucide-react';
import styles from './WorkflowEditorLayout.module.css';
import {
  validateStepName,
  validateStepRole,
  validateStepDescription,
  VALIDATION_RULES,
} from '../../../utils/workflowValidation';

export default function StepEditPanel({ step, roles = [], onUpdate, onDelete }) {
  const [formData, setFormData] = useState({
    label: '',
    role: '',
    description: '',
    instruction: '',
    is_start: false,
    is_end: false,
  });
  
  const [validationErrors, setValidationErrors] = useState({});
  const [touched, setTouched] = useState({});

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
      // Reset validation state when step changes
      setValidationErrors({});
      setTouched({});
    }
  }, [step]);

  // Validate a single field
  const validateField = useCallback((field, value) => {
    switch (field) {
      case 'label':
        return validateStepName(value);
      case 'role':
        return validateStepRole(value, roles);
      case 'description':
        return validateStepDescription(value);
      default:
        return { isValid: true, errors: [] };
    }
  }, [roles]);

  const handleChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Mark field as touched
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Validate the changed field
    const validation = validateField(field, value);
    setValidationErrors(prev => ({
      ...prev,
      [field]: validation.errors
    }));
    
    // Always update parent - let parent handle validation on save
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

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const validation = validateField(field, formData[field]);
    setValidationErrors(prev => ({
      ...prev,
      [field]: validation.errors
    }));
  };

  const getFieldError = (field) => {
    if (!touched[field]) return null;
    const errors = validationErrors[field];
    return errors && errors.length > 0 ? errors[0] : null;
  };

  const getFieldStatus = (field) => {
    if (!touched[field]) return 'neutral';
    const errors = validationErrors[field];
    return errors && errors.length > 0 ? 'error' : 'valid';
  };

  if (!step) return null;

  const hasRoles = roles && roles.length > 0;
  const currentRoleValid = !formData.role || roles.some(r => r.name === formData.role);

  return (
    <div>
      {/* Step Name Field */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          Step Name <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={formData.label}
            onChange={(e) => handleChange('label', e.target.value)}
            onBlur={() => handleBlur('label')}
            className={`${styles.formInput} ${
              getFieldStatus('label') === 'error' ? styles.formInputError : ''
            }`}
            placeholder="Enter step name"
            maxLength={VALIDATION_RULES.STEP_NAME_MAX_LENGTH}
          />
          {getFieldStatus('label') === 'error' && (
            <AlertCircle 
              style={{ 
                position: 'absolute', 
                right: '10px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: '#ef4444',
                width: '16px',
                height: '16px'
              }} 
            />
          )}
        </div>
        {getFieldError('label') && (
          <p className={styles.formError} style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
            {getFieldError('label')}
          </p>
        )}
        <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
          {formData.label.length}/{VALIDATION_RULES.STEP_NAME_MAX_LENGTH} characters
        </p>
      </div>

      {/* Role Field */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          Assigned Role <span style={{ color: '#ef4444' }}>*</span>
        </label>
        {hasRoles ? (
          <div style={{ position: 'relative' }}>
            <select
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              onBlur={() => handleBlur('role')}
              className={`${styles.formSelect} ${
                getFieldStatus('role') === 'error' ? styles.formInputError : ''
              } ${!currentRoleValid && formData.role ? styles.formInputWarning : ''}`}
              style={!currentRoleValid && formData.role ? { borderColor: '#f59e0b' } : {}}
            >
              <option value="">-- Select a role --</option>
              {roles.map((role) => (
                <option key={role.role_id || role.id || role.name} value={role.name}>
                  {role.name}
                </option>
              ))}
            </select>
            {!currentRoleValid && formData.role && (
              <div style={{ 
                marginTop: '4px', 
                padding: '8px', 
                backgroundColor: '#fef3c7', 
                borderRadius: '4px',
                fontSize: '12px',
                color: '#92400e'
              }}>
                <AlertCircle style={{ width: '14px', height: '14px', display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                Role "{formData.role}" is not in available roles. Please select a valid role.
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#fef2f2', 
              borderRadius: '6px',
              border: '1px solid #fecaca'
            }}>
              <p style={{ color: '#dc2626', fontSize: '14px', margin: 0 }}>
                <AlertCircle style={{ width: '16px', height: '16px', display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                No roles available from the backend.
              </p>
              <p style={{ color: '#7f1d1d', fontSize: '12px', marginTop: '8px', marginBottom: 0 }}>
                Please ensure roles are configured in the system.
              </p>
            </div>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              className={styles.formInput}
              placeholder="Role name (roles not loaded)"
              style={{ marginTop: '8px' }}
              disabled
            />
          </div>
        )}
        {getFieldError('role') && (
          <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
            {getFieldError('role')}
          </p>
        )}
      </div>

      {/* Description Field */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          onBlur={() => handleBlur('description')}
          rows={3}
          className={`${styles.formTextarea} ${
            getFieldStatus('description') === 'error' ? styles.formInputError : ''
          }`}
          placeholder="Enter step description"
          maxLength={VALIDATION_RULES.STEP_DESCRIPTION_MAX_LENGTH}
        />
        {getFieldError('description') && (
          <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
            {getFieldError('description')}
          </p>
        )}
        <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
          {formData.description.length}/{VALIDATION_RULES.STEP_DESCRIPTION_MAX_LENGTH} characters
        </p>
      </div>

      {/* Instruction Field */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Instruction</label>
        <textarea
          value={formData.instruction}
          onChange={(e) => handleChange('instruction', e.target.value)}
          rows={3}
          className={styles.formTextarea}
          placeholder="Enter step instruction for users"
        />
      </div>

      {/* Start/End Checkboxes */}
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
          <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', marginLeft: '24px' }}>
            Workflows must have exactly one start step
          </p>

          <label className={styles.formCheckboxLabel} style={{ marginTop: '8px' }}>
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

      {/* Delete Button */}
      {onDelete && !formData.is_start && !formData.is_end && (
        <div className={styles.formDivider}>
          <button onClick={onDelete} className={styles.btnDelete}>
            <Trash2 className={styles.btnDeleteIcon} />
            Delete Step
          </button>
        </div>
      )}

      {/* Validation Summary */}
      {Object.keys(validationErrors).some(k => validationErrors[k]?.length > 0) && (
        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          backgroundColor: '#fef2f2', 
          borderRadius: '6px',
          border: '1px solid #fecaca'
        }}>
          <p style={{ color: '#dc2626', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
            Please fix the following issues before saving:
          </p>
          <ul style={{ margin: 0, paddingLeft: '16px', color: '#7f1d1d', fontSize: '12px' }}>
            {Object.keys(validationErrors).map(field => 
              validationErrors[field]?.map((error, idx) => (
                <li key={`${field}-${idx}`}>{error}</li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
