import React, { memo, useCallback, useState, useEffect } from 'react';
import { Edit3, Save, X, Clock, Tag, FileText, Building2, Layers, ChevronUp, ChevronDown, Sliders, Info } from 'lucide-react';
import { useWorkflowConfig } from './hooks/useWorkflowConfig';
import { useWorkflowAPI } from '../../../api/useWorkflowAPI';
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
 * SLA Number Input with increment/decrement controls
 */
const SLANumberInput = memo(function SLANumberInput({
  value,
  onChange,
  disabled,
  min = 0,
  max = 999,
  unit
}) {
  const handleIncrement = useCallback(() => {
    const current = parseInt(value, 10) || 0;
    if (current < max) {
      onChange(String(current + 1));
    }
  }, [value, max, onChange]);

  const handleDecrement = useCallback(() => {
    const current = parseInt(value, 10) || 0;
    if (current > min) {
      onChange(String(current - 1));
    }
  }, [value, min, onChange]);

  return (
    <div className={styles.slaInputGroup}>
      <div className={styles.slaInputWrapper}>
        <input
          type="number"
          min={min}
          max={max}
          value={value || 0}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={styles.slaInput}
        />
        {!disabled && (
          <div className={styles.slaControls}>
            <button
              type="button"
              onClick={handleIncrement}
              className={styles.slaControlBtn}
              tabIndex={-1}
            >
              <ChevronUp size={12} />
            </button>
            <button
              type="button"
              onClick={handleDecrement}
              className={styles.slaControlBtn}
              tabIndex={-1}
            >
              <ChevronDown size={12} />
            </button>
          </div>
        )}
      </div>
      <span className={styles.slaUnit}>{unit}</span>
    </div>
  );
});

/**
 * Compact SLA Time Input Component
 */
const SLATimeInput = memo(function SLATimeInput({ 
  label, 
  color, 
  value, 
  onChange, 
  disabled = false 
}) {
  return (
    <div className={styles.slaItem}>
      <div className={styles.slaLabel}>
        <span className={styles.slaDot} style={{ backgroundColor: color }} />
        <span>{label}</span>
      </div>
      <div className={styles.slaInputRow}>
        <SLANumberInput
          value={value.days}
          onChange={(v) => onChange('days', v)}
          disabled={disabled}
          min={0}
          max={365}
          unit="d"
        />
        <SLANumberInput
          value={value.hours}
          onChange={(v) => onChange('hours', v)}
          disabled={disabled}
          min={0}
          max={23}
          unit="h"
        />
        <SLANumberInput
          value={value.minutes}
          onChange={(v) => onChange('minutes', v)}
          disabled={disabled}
          min={0}
          max={59}
          unit="m"
        />
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
 * Workflow Configuration Panel - Compact Horizontal Layout
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
        <p style={{ color: 'var(--muted-text-color)', textAlign: 'center', padding: 40 }}>
          No workflow selected
        </p>
      </div>
    );
  }
  
  const canEdit = !readOnly && !isSaving;
  
  return (
    <div className={styles.configPanel}>
      {/* Header with Edit Button */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h2 className={styles.headerTitle}>{workflow.name || 'Untitled Workflow'}</h2>
          <StatusBadge status={workflow.status} />
        </div>
      </div>

      {/* Error Banner */}
      {error && <div className={styles.errorBanner}>{error}</div>}
      
      {/* Main Content - Grid Layout */}
      <div className={styles.content}>
        {/* Left Column */}
        <div className={styles.column}>
          {/* Basic Info Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader} style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={14} /> Basic Information
              </div>
              {canEdit && (
                <div className={styles.headerActions}>
                  {!isEditing ? (
                    <button type="button" onClick={startEdit} className={styles.btnPrimary} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                      <Edit3 size={12} /> Edit Configuration
                    </button>
                  ) : (
                    <>
                      <button type="button" onClick={cancelEdit} className={styles.btnSecondary} disabled={isSaving} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                        <X size={12} /> Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveConfig}
                        className={styles.btnPrimary}
                        disabled={isSaving || !hasChanges}
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        <Save size={12} /> {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className={styles.cardBody}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Workflow Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className={styles.input}
                    placeholder="Enter workflow name"
                  />
                ) : (
                  <div className={styles.fieldValue}>{workflow.name || 'Untitled'}</div>
                )}
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Description</label>
                {isEditing ? (
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className={styles.textarea}
                    placeholder="Enter description"
                    rows={2}
                  />
                ) : (
                  <div className={`${styles.fieldValue} ${!workflow.description ? styles.muted : ''}`}>
                    {workflow.description || 'No description'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Classification Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <Tag size={14} /> Classification
            </div>
            <div className={styles.cardBody}>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Category</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => handleChange('category', e.target.value)}
                      className={styles.input}
                      placeholder="e.g., IT Support"
                    />
                  ) : (
                    <div className={`${styles.fieldValue} ${!workflow.category ? styles.muted : ''}`}>
                      {workflow.category || 'Not set'}
                    </div>
                  )}
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Sub-Category</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.sub_category}
                      onChange={(e) => handleChange('sub_category', e.target.value)}
                      className={styles.input}
                      placeholder="e.g., Hardware"
                    />
                  ) : (
                    <div className={`${styles.fieldValue} ${!workflow.sub_category ? styles.muted : ''}`}>
                      {workflow.sub_category || 'Not set'}
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>
                    <Building2 size={12} style={{ marginRight: 4 }} /> Department
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => handleChange('department', e.target.value)}
                      className={styles.input}
                      placeholder="e.g., IT Department"
                    />
                  ) : (
                    <div className={`${styles.fieldValue} ${!workflow.department ? styles.muted : ''}`}>
                      {workflow.department || 'Not set'}
                    </div>
                  )}
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>
                    <Layers size={12} style={{ marginRight: 4 }} /> End Logic
                  </label>
                  {isEditing ? (
                    <select
                      value={formData.end_logic}
                      onChange={(e) => handleChange('end_logic', e.target.value)}
                      className={styles.select}
                    >
                      {END_LOGIC_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className={`${styles.fieldValue} ${!workflow.end_logic ? styles.muted : ''}`}>
                      {END_LOGIC_OPTIONS.find(o => o.value === workflow.end_logic)?.label || 'None'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SLA Configuration Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <Clock size={14} /> SLA Configuration
            </div>
            <div className={styles.cardBody}>
              <div className={styles.slaGrid}>
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
              </div>
              {isEditing && (
                <p className={styles.hint}>
                  SLA times must follow: Urgent &lt; High &lt; Medium &lt; Low
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Step Weight Distribution */}
        <div className={styles.column}>
          <StepWeightDistribution workflowId={workflowId} />
        </div>
      </div>
    </div>
  );
});

/**
 * Step Weight Distribution Component
 * Allows distributing SLA time across workflow steps
 */
const StepWeightDistribution = memo(function StepWeightDistribution({ workflowId }) {
  const [workflowData, setWorkflowData] = useState(null);
  const [weights, setWeights] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalWeights, setOriginalWeights] = useState({});

  const { getWeightData, updateStepWeights } = useWorkflowAPI();

  // Fetch weight data
  useEffect(() => {
    const fetchWeightData = async () => {
      if (!workflowId) return;
      try {
        setLoading(true);
        const data = await getWeightData(workflowId);
        setWorkflowData(data);

        // Initialize weights state
        const weightsMap = {};
        data.steps.forEach(step => {
          weightsMap[step.step_id] = parseFloat(step.weight) || 0.5;
        });
        setWeights(weightsMap);
        setOriginalWeights(weightsMap);
        setError(null);
      } catch (err) {
        console.error('Error fetching weight data:', err);
        setError(err.message || 'Failed to load weight data');
      } finally {
        setLoading(false);
      }
    };

    fetchWeightData();
  }, [workflowId, getWeightData]);

  const handleWeightChange = useCallback((stepId, newWeight) => {
    setWeights(prev => {
      const updated = { ...prev, [stepId]: newWeight };
      setHasChanges(JSON.stringify(updated) !== JSON.stringify(originalWeights));
      return updated;
    });
  }, [originalWeights]);

  const calculateStepSLA = useCallback((stepId, slaValue) => {
    if (!workflowData || !slaValue) return 'N/A';

    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    const stepWeight = weights[stepId] || 0;
    
    if (totalWeight === 0) return 'N/A';

    const seconds = parseFloat(slaValue);
    const stepSeconds = (seconds * stepWeight) / totalWeight;

    return formatDuration(stepSeconds);
  }, [weights, workflowData]);

  const formatDuration = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return 'N/A';

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0) parts.push(`${mins}m`);

    return parts.length > 0 ? parts.join(' ') : '< 1m';
  };

  const handleSaveWeights = useCallback(async () => {
    try {
      setIsSaving(true);
      setSaveStatus('saving');

      const stepsData = Object.entries(weights).map(([stepId, weight]) => ({
        step_id: parseInt(stepId, 10),
        weight: weight,
      }));

      await updateStepWeights(workflowId, stepsData);
      setOriginalWeights(weights);
      setHasChanges(false);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      console.error('Error saving weights:', err);
      setSaveStatus('error');
      setError(err.message || 'Failed to save weights');
    } finally {
      setIsSaving(false);
    }
  }, [weights, workflowId, updateStepWeights]);

  const handleReset = useCallback(() => {
    setWeights(originalWeights);
    setHasChanges(false);
  }, [originalWeights]);

  if (loading) {
    return (
      <div className={styles.stepWeightSection}>
        <div className={styles.stepWeightHeader}>
          <div className={styles.stepWeightTitle}>
            <Sliders size={16} />
            <span>SLA Step Distribution</span>
          </div>
        </div>
        <div className={styles.stepWeightLoading}>
          <div className={styles.loadingSpinner} />
          <span>Loading step weights...</span>
        </div>
      </div>
    );
  }

  if (error && !workflowData) {
    return (
      <div className={styles.stepWeightSection}>
        <div className={styles.stepWeightHeader}>
          <div className={styles.stepWeightTitle}>
            <Sliders size={16} />
            <span>SLA Step Distribution</span>
          </div>
        </div>
        <div className={styles.stepWeightError}>
          <span>⚠️ {error}</span>
        </div>
      </div>
    );
  }

  if (!workflowData?.steps?.length) {
    return (
      <div className={styles.stepWeightSection}>
        <div className={styles.stepWeightHeader}>
          <div className={styles.stepWeightTitle}>
            <Sliders size={16} />
            <span>SLA Step Distribution</span>
          </div>
        </div>
        <div className={styles.stepWeightEmpty}>
          <span>No steps defined in this workflow yet.</span>
        </div>
      </div>
    );
  }

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

  return (
    <div className={styles.stepWeightSection}>
      {/* Header */}
      <div className={styles.stepWeightHeader}>
        <div className={styles.stepWeightTitle}>
          <Sliders size={16} />
          <span>SLA Step Distribution</span>
          <span className={styles.stepWeightCount}>{workflowData?.steps?.length} steps</span>
        </div>
        <div className={styles.stepWeightActions}>
          {saveStatus === 'success' && (
            <span className={styles.saveSuccess}>✓ Saved</span>
          )}
          {saveStatus === 'error' && (
            <span className={styles.saveError}>✕ Error</span>
          )}
          {hasChanges && (
            <>
              <button onClick={handleReset} className={styles.btnSecondary} disabled={isSaving}>
                Reset
              </button>
              <button onClick={handleSaveWeights} className={styles.btnPrimary} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Weights'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className={styles.stepWeightInfo}>
        <Info size={14} />
        <span>Adjust weights to distribute SLA time across steps. Higher weight = more time allocated.</span>
      </div>

      {/* Steps List */}
      <div className={styles.stepWeightList}>
        {workflowData?.steps?.map((step) => {
          const stepWeight = weights[step.step_id] || 0;
          const percentage = totalWeight > 0 ? (stepWeight / totalWeight) * 100 : 0;

          return (
            <div key={step.step_id} className={styles.stepWeightCard}>
              <div className={styles.stepWeightCardHeader}>
                <div className={styles.stepWeightCardInfo}>
                  <span className={styles.stepWeightCardName}>{step.name}</span>
                  <span className={styles.stepWeightCardMeta}>{step.role_name} • Step {step.order}</span>
                </div>
                <div className={styles.stepWeightCardPercent}>
                  <span className={styles.stepWeightCardPercentValue}>{percentage.toFixed(0)}%</span>
                </div>
              </div>
              
              <div className={styles.stepWeightCardSlider}>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.01"
                  value={stepWeight}
                  onChange={(e) => handleWeightChange(step.step_id, parseFloat(e.target.value))}
                  className={styles.weightSlider}
                />
                <input
                  type="number"
                  min="0.1"
                  max="1"
                  step="0.01"
                  value={stepWeight.toFixed(2)}
                  onChange={(e) => handleWeightChange(step.step_id, parseFloat(e.target.value) || 0.1)}
                  className={styles.weightInput}
                />
              </div>

              {/* SLA Breakdown for this step */}
              <div className={styles.stepWeightCardSLA}>
                {[
                  { label: 'Urg', value: workflowData?.slas?.urgent_sla, color: 'var(--critical-color, #ef4444)' },
                  { label: 'High', value: workflowData?.slas?.high_sla, color: 'var(--high-color, #f97316)' },
                  { label: 'Med', value: workflowData?.slas?.medium_sla, color: 'var(--medium-color, #eab308)' },
                  { label: 'Low', value: workflowData?.slas?.low_sla, color: 'var(--success-color, #22c55e)' },
                ].map((sla) => (
                  <div key={sla.label} className={styles.stepWeightCardSLAItem}>
                    <span className={styles.stepWeightCardSLADot} style={{ backgroundColor: sla.color }} />
                    <span className={styles.stepWeightCardSLALabel}>{sla.label}</span>
                    <span className={styles.stepWeightCardSLAValue}>{calculateStepSLA(step.step_id, sla.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default WorkflowConfigPanel;
