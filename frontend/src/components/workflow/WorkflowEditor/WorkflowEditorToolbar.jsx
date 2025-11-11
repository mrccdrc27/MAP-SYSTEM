import React from 'react';
import styles from './WorkflowEditorLayout.module.css';

const WorkflowEditorToolbar = ({
  handleAddStep,
  handleSaveAll,
  hasUnsavedChanges,
  saveStatus,
  workflowData,
  isEditingGraph,
  onToggleEditMode,
}) => {
  return (
    <aside className={styles.leftToolbar}>
      <div className={styles.toolbarSection}>
        <h4 className={styles.toolbarTitle}>Add</h4>
        <button
          className={styles.actionBtn}
          onClick={handleAddStep}
          disabled={!isEditingGraph}
          title="Add a new step to the workflow"
        >
          <span className={styles.btnIcon}>➕</span>
          <span className={styles.btnText}>Step</span>
        </button>
      </div>

      <div className={styles.toolbarSection}>
        <h4 className={styles.toolbarTitle}>Actions</h4>
        <button
          className={`${styles.modeToggle} ${isEditingGraph ? styles.modeActive : styles.modeLocked}`}
          onClick={onToggleEditMode}
          title={isEditingGraph ? 'Click to lock editing' : 'Click to enable editing'}
        >
          {isEditingGraph ? 'Editing' : 'Locked'}
        </button>
      </div>

      <div className={styles.toolbarSection}>
        <h4 className={styles.toolbarTitle}>Info</h4>
        <div className={styles.infoBox}>
          <p className={styles.infoLabel}>Steps</p>
          <p className={styles.infoValue}>{workflowData.graph?.nodes?.length || 0}</p>
        </div>
        <div className={styles.infoBox}>
          <p className={styles.infoLabel}>Transitions</p>
          <p className={styles.infoValue}>{workflowData.graph?.edges?.length || 0}</p>
        </div>
      </div>
    </aside>
  );
};

export default WorkflowEditorToolbar;