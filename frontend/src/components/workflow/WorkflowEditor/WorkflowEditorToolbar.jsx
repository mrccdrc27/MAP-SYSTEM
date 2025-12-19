import React, { useState } from 'react';
import { Plus, BarChart3, Grid3x3, Zap } from 'lucide-react';
import styles from './WorkflowEditorLayout.module.css';

export default function WorkflowEditorToolbar({
  onAddStep,
  stepCount,
  transitionCount,
  isEditingGraph,
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStepLabel, setNewStepLabel] = useState('');

  const handleAddStep = () => {
    if (newStepLabel.trim()) {
      onAddStep(newStepLabel.trim());
      setNewStepLabel('');
      setShowAddForm(false);
    }
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
              autoFocus
            />
            <div className={styles.toolbarAddFormButtons}>
              <button onClick={handleAddStep} className={styles.btnPrimary}>
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewStepLabel('');
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
        <div className={styles.toolbarQuickAddGrid}>
          {quickAddTemplates.map((template) => (
            <button
              key={template.label}
              onClick={() => onAddStep(template.label)}
              disabled={!isEditingGraph}
              className={styles.toolbarQuickAddBtn}
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
