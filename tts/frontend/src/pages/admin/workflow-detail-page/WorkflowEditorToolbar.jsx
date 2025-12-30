import React, { useState } from 'react';
import { Plus, BarChart3, Grid3x3, Zap, AlertCircle } from 'lucide-react';
import styles from '../workflow-page/create-workflow.module.css';
import { getDefaultRole, VALIDATION_RULES } from '../../../utils/workflowValidation';

export default function WorkflowEditorToolbar({
  onAddStep,
  stepCount,
  transitionCount,
  isEditingGraph,
  roles = [],
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStepLabel, setNewStepLabel] = useState('');
  const [newStepRole, setNewStepRole] = useState('');

  const handleAddStep = () => {
    if (newStepLabel.trim()) {
      const selectedRole = newStepRole || getDefaultRole(roles);
      if (!selectedRole && roles.length > 0) {
        alert('Please select a role for the step');
        return;
      }
      onAddStep(newStepLabel.trim(), selectedRole);
      setNewStepLabel('');
      setNewStepRole('');
      setShowAddForm(false);
    }
  };

  const handleQuickAdd = (label) => {
    const defaultRole = getDefaultRole(roles);
    if (!defaultRole) {
      alert('Cannot add step: No roles available. Please configure roles first.');
      return;
    }
    onAddStep(label, defaultRole);
  };

  const quickAddTemplates = [
    { label: 'Review', icon: '📋' },
    { label: 'Approval', icon: '✓' },
    { label: 'Processing', icon: '⚙️' },
    { label: 'Notification', icon: '🔔' },
  ];

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarSection}>
        <h3 className={styles.toolbarTitle}>Tools</h3>
        
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            disabled={!isEditingGraph}
            className={styles.btnPrimary}
            style={{ width: '100%' }}
          >
            <Plus style={{ width: '16px', height: '16px' }} />
            Add Step
          </button>
        ) : (
          <div className={styles.toolbarAddForm}>
            <input
              type="text"
              value={newStepLabel}
              onChange={(e) => setNewStepLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddStep()}
              placeholder="Step name..."
              className={styles.formInput}
              maxLength={VALIDATION_RULES.STEP_NAME_MAX_LENGTH}
              autoFocus
            />
            {roles.length > 0 ? (
              <select
                value={newStepRole}
                onChange={(e) => setNewStepRole(e.target.value)}
                className={styles.formSelect}
                style={{ marginTop: '8px' }}
              >
                <option value="">-- Select Role --</option>
                {roles.map((role) => (
                  <option key={role.role_id || role.id || role.name} value={role.name}>
                    {role.name}
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ 
                marginTop: '8px',
                padding: '8px', 
                backgroundColor: '#fef3c7', 
                borderRadius: '4px',
                fontSize: '11px',
                color: '#92400e'
              }}>
                <AlertCircle style={{ width: '12px', height: '12px', display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                No roles available
              </div>
            )}
            <div className={styles.toolbarAddFormButtons}>
              <button 
                onClick={handleAddStep} 
                className={styles.btnPrimary}
                disabled={!newStepLabel.trim() || (roles.length > 0 && !newStepRole && !getDefaultRole(roles))}
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewStepLabel('');
                  setNewStepRole('');
                }}
                className={styles.btnSecondary}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Add Templates */}
      <div className={styles.toolbarSection}>
        <div className={styles.toolbarQuickAdd}>
          <Zap className={styles.toolbarQuickAddIcon} />
          <span className={styles.toolbarQuickAddText}>Quick Add</span>
        </div>
        {roles.length === 0 && (
          <div style={{ 
            marginBottom: '8px',
            padding: '6px 8px', 
            backgroundColor: '#fef3c7', 
            borderRadius: '4px',
            fontSize: '10px',
            color: '#92400e'
          }}>
            Quick add disabled - no roles available
          </div>
        )}
        <div className={styles.toolbarQuickAddGrid}>
          {quickAddTemplates.map((template) => (
            <button
              key={template.label}
              onClick={() => handleQuickAdd(template.label)}
              disabled={!isEditingGraph || roles.length === 0}
              className={styles.toolbarQuickAddBtn}
              title={roles.length === 0 ? 'No roles available' : `Add ${template.label} step`}
            >
              <span>{template.icon}</span>
              <span>{template.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.toolbarSection}>
        <div className={styles.toolbarStats}>
          <BarChart3 className={styles.toolbarStatsIcon} />
          <span className={styles.toolbarStatsTitle}>Workflow Stats</span>
        </div>
        <div className={styles.toolbarStatsList}>
          <div className={styles.toolbarStatsItem}>
            <span className={styles.toolbarStatsLabel}>Total Steps:</span>
            <span className={styles.toolbarStatsValue}>{stepCount}</span>
          </div>
          <div className={styles.toolbarStatsItem}>
            <span className={styles.toolbarStatsLabel}>Transitions:</span>
            <span className={styles.toolbarStatsValue}>{transitionCount}</span>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className={styles.toolbarShortcuts}>
        <div className={styles.toolbarShortcutsHeader}>
          <Grid3x3 className={styles.toolbarShortcutsIcon} />
          <span className={styles.toolbarShortcutsTitle}>Shortcuts</span>
        </div>
        <div className={styles.toolbarShortcutsList}>
          <div className={styles.toolbarShortcutItem}>
            <span>Save</span>
            <kbd className={styles.toolbarShortcutKey}>Ctrl+S</kbd>
          </div>
          <div className={styles.toolbarShortcutItem}>
            <span>Undo</span>
            <kbd className={styles.toolbarShortcutKey}>Ctrl+Z</kbd>
          </div>
          <div className={styles.toolbarShortcutItem}>
            <span>Redo</span>
            <kbd className={styles.toolbarShortcutKey}>Ctrl+Y</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
