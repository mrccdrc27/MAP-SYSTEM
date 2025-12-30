import React, { memo } from 'react';
import { Edit3, Save, X, Clock, Tag, FileText, Building2, Layers } from 'lucide-react';
import { useWorkflowConfig } from './hooks/useWorkflowConfig';
import styles from './WorkflowConfigPanel.module.css';

// End logic options matching Django model
const END_LOGIC_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'asset', label: 'Asset Management' },
  { value: 'budget', label: 'Budget Management' },
  { value: 'notification', label: 'Send Notification' },
];

// SLA configuration with colors
const SLA_CONFIG = [
  { key: 'urgent_sla', label: 'Urgent', color: 'var(--critical-color, #ef4444)' },
  { key: 'high_sla', label: 'High', color: 'var(--high-color, #f97316)' },
  { key: 'medium_sla', label: 'Medium', color: 'var(--medium-color, #eab308)' },
  { key: 'low_sla', label: 'Low', color: 'var(--success-color, #22c55e)' },
];

/**
 * SLA Time Input Component
 * Provides days, hours, minutes inputs for SLA configuration
 */
const SLATimeInput = memo(function SLATimeInput({ 
  label, 
  color, 
  value, 
  onChange, 
  disabled = false 
}) {
  return (
    <div className={styles.slaGroup}>
      <div className={styles.slaLabel}>
        <span className={styles.slaDot} style={{ backgroundColor: color }} />
        <span>{label}</span>
      </div>
      <div className={styles.slaInputRow}>
        <div className={styles.slaInputWrapper}>
          <input
            type="number"
            min="0"
            max="365"
            value={value.days || 0}
            onChange={(e) => onChange('days', e.target.value)}
            disabled={disabled}
            className={styles.slaInput}
            placeholder="0"
          />
          <span className={styles.slaUnit}>d</span>
        </div>
        <div className={styles.slaInputWrapper}>
          <input
            type="number"
            min="0"
            max="23"
            value={value.hours || 0}
            onChange={(e) => onChange('hours', e.target.value)}
            disabled={disabled}
            className={styles.slaInput}
            placeholder="0"
          />
          <span className={styles.slaUnit}>h</span>
        </div>
        <div className={styles.slaInputWrapper}>
          <input
            type="number"
            min="0"
            max="59"
            value={value.minutes || 0}
            onChange={(e) => onChange('minutes', e.target.value)}
            disabled={disabled}
            className={styles.slaInput}
            placeholder="0"
          />
          <span className={styles.slaUnit}>m</span>
        </div>
      </div>
    </div>
  );
});

/**
 * Status Badge Component
 */
const StatusBadge = memo(function StatusBadge({ status }) {
  const statusClass = {
    draft: styles.statusDraft,
    deployed: styles.statusDeployed,
    paused: styles.statusPaused,
    initialized: styles.statusInitialized,
  }[status] || styles.statusDraft;
  
  return (
    <span className={`${styles.statusBadge} ${statusClass}`}>
      {status || 'draft'}
    </span>
  );
});

/**
 * Workflow Configuration Panel
 * Allows viewing and editing workflow properties
 */
const WorkflowConfigPanel = memo(function WorkflowConfigPanel({ 
  workflow, 
  workflowId, 
  onUpdate,
  readOnly = false 
}) {
  const {
    formData,
    isEditing,
    isSaving,
    hasChanges,
    error,
    handleChange,
    handleSLAChange,
    saveConfig,
    cancelEdit,
    startEdit,
  } = useWorkflowConfig(workflow, workflowId, onUpdate);
  
  if (!workflow) {
    return (
      <div className={styles.configPanel}>
        <div className={styles.formSection}>
          <p style={{ color: 'var(--muted-text-color)', textAlign: 'center' }}>
            No workflow selected
          </p>
        </div>
      </div>
    );
  }
  
  const canEdit = !readOnly && !isSaving;
  
  return (
    <div className={styles.configPanel}>
      {/* Error Banner */}
      {error && (
        <div className={styles.errorBanner}>
          {error}
        </div>
      )}
      
      <form className={styles.form} onSubmit={(e) => { e.preventDefault(); saveConfig(); }}>
        {/* Basic Information Section */}
        <div className={styles.formSection}>
          <div className={styles.sectionTitle}>
            <FileText size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Basic Information
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Workflow Name *</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={styles.formInput}
                placeholder="Enter workflow name"
                required
              />
            ) : (
              <div className={styles.displayValue}>{workflow.name || 'Untitled'}</div>
            )}
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Description</label>
            {isEditing ? (
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className={styles.formTextarea}
                placeholder="Enter workflow description"
                rows={3}
              />
            ) : (
              <div className={`${styles.displayValue} ${!workflow.description ? styles.muted : ''}`}>
                {workflow.description || 'No description'}
              </div>
            )}
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Status</label>
            <StatusBadge status={workflow.status} />
          </div>
        </div>
        
        {/* Category Section */}
        <div className={styles.formSection}>
          <div className={styles.sectionTitle}>
            <Tag size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Classification
          </div>
          
          <div className={styles.gridTwo}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Category</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className={styles.formInput}
                  placeholder="e.g., IT Support"
                />
              ) : (
                <div className={`${styles.displayValue} ${!workflow.category ? styles.muted : ''}`}>
                  {workflow.category || 'Not set'}
                </div>
              )}
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Sub-Category</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.sub_category}
                  onChange={(e) => handleChange('sub_category', e.target.value)}
                  className={styles.formInput}
                  placeholder="e.g., Hardware"
                />
              ) : (
                <div className={`${styles.displayValue} ${!workflow.sub_category ? styles.muted : ''}`}>
                  {workflow.sub_category || 'Not set'}
                </div>
              )}
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <Building2 size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Department
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.department}
                onChange={(e) => handleChange('department', e.target.value)}
                className={styles.formInput}
                placeholder="e.g., IT Department"
              />
            ) : (
              <div className={`${styles.displayValue} ${!workflow.department ? styles.muted : ''}`}>
                {workflow.department || 'Not set'}
              </div>
            )}
          </div>
        </div>
        
        {/* End Logic Section */}
        <div className={styles.formSection}>
          <div className={styles.sectionTitle}>
            <Layers size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Completion Behavior
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>End Logic</label>
            {isEditing ? (
              <select
                value={formData.end_logic}
                onChange={(e) => handleChange('end_logic', e.target.value)}
                className={styles.formSelect}
              >
                {END_LOGIC_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className={`${styles.displayValue} ${!workflow.end_logic ? styles.muted : ''}`}>
                {END_LOGIC_OPTIONS.find(o => o.value === workflow.end_logic)?.label || 'None'}
              </div>
            )}
          </div>
        </div>
        
        {/* SLA Configuration Section */}
        <div className={styles.formSection}>
          <div className={styles.sectionTitle}>
            <Clock size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            SLA Configuration
          </div>
          
          {SLA_CONFIG.map(sla => (
            <SLATimeInput
              key={sla.key}
              label={sla.label}
              color={sla.color}
              value={formData[sla.key] || { days: 0, hours: 0, minutes: 0 }}
              onChange={(unit, value) => handleSLAChange(sla.key, unit, value)}
              disabled={!isEditing}
            />
          ))}
          
          {isEditing && (
            <p style={{ 
              fontSize: '0.75rem', 
              color: 'var(--muted-text-color)', 
              marginTop: 12,
              fontStyle: 'italic'
            }}>
              SLA times must follow: Urgent &lt; High &lt; Medium &lt; Low
            </p>
          )}
        </div>
        
        {/* Action Buttons */}
        {canEdit && (
          <div className={styles.actions}>
            {!isEditing ? (
              <button
                type="button"
                onClick={startEdit}
                className={styles.btnPrimary}
              >
                <Edit3 size={14} style={{ marginRight: 6 }} />
                Edit Configuration
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className={styles.btnSecondary}
                  disabled={isSaving}
                >
                  <X size={14} style={{ marginRight: 4 }} />
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={isSaving || !hasChanges}
                >
                  <Save size={14} style={{ marginRight: 4 }} />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        )}
      </form>
    </div>
  );
});

export default WorkflowConfigPanel;
