import React, { memo } from 'react';
import { Save, RefreshCw, Undo, Redo, Settings, ArrowLeft, HelpCircle, X, Layout } from 'lucide-react';
import styles from './WorkflowToolbar.module.css';

/**
 * Unified toolbar for workflow creation and editing
 * @param {object} props
 * @param {string} props.title - Workflow title
 * @param {string} props.subtitle - Category/subcategory info
 * @param {string} props.mode - 'create' or 'edit'
 * @param {boolean} props.isSaving - Loading state for save
 * @param {boolean} props.hasUnsavedChanges - Whether there are pending changes
 * @param {boolean} props.canUndo - Undo available
 * @param {boolean} props.canRedo - Redo available
 * @param {boolean} props.isEditingGraph - Graph editing mode
 * @param {number} props.validationErrorCount - Number of validation errors
 * @param {number} props.stepCount - Number of steps
 * @param {number} props.transitionCount - Number of transitions
 * @param {function} props.onSave - Save handler
 * @param {function} props.onUndo - Undo handler
 * @param {function} props.onRedo - Redo handler
 * @param {function} props.onBack - Back navigation handler
 * @param {function} props.onToggleEditing - Toggle graph editing mode
 * @param {function} props.onOpenSLAModal - Open SLA configuration modal
 * @param {function} props.onOpenDiagram - Open sequence diagram (create mode only)
 * @param {function} props.onToggleHelp - Toggle help panel
 * @param {boolean} props.showHelp - Help panel visible state
 */
const WorkflowToolbar = memo(function WorkflowToolbar({
  title,
  subtitle,
  mode = 'edit',
  isSaving = false,
  hasUnsavedChanges = false,
  canUndo = false,
  canRedo = false,
  isEditingGraph = false,
  validationErrorCount = 0,
  stepCount = 0,
  transitionCount = 0,
  onSave,
  onUndo,
  onRedo,
  onBack,
  onToggleEditing,
  onOpenSLAModal,
  onOpenDiagram,
  onToggleHelp,
  showHelp = false,
}) {
  const isCreateMode = mode === 'create';
  const canSave = isCreateMode 
    ? validationErrorCount === 0 
    : hasUnsavedChanges;

  return (
    <div className={styles.toolbar}>
      {/* Left Section - Back button + Title */}
      <div className={styles.toolbarLeft}>
        {onBack && (
          <button
            className={styles.backBtn}
            onClick={onBack}
            title={isCreateMode ? 'Back to Workflows' : 'Back'}
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div className={styles.titleGroup}>
          <h2 className={styles.title}>
            {isCreateMode ? 'Create Workflow' : (title || 'Edit Workflow')}
          </h2>
          {subtitle && (
            <span className={styles.subtitle}>{subtitle}</span>
          )}
        </div>
      </div>

      {/* Center Section - Stats */}
      <div className={styles.toolbarCenter}>
        <span className={styles.stats}>
          {stepCount} steps • {transitionCount} transitions
        </span>
      </div>

      {/* Right Section - Actions */}
      <div className={styles.toolbarRight}>
        {/* Diagram button (create mode) */}
        {isCreateMode && onOpenDiagram && (
          <button
            className={styles.secondaryBtn}
            onClick={onOpenDiagram}
            disabled={stepCount === 0}
            title="View as Sequence Diagram"
          >
            <Layout size={16} /> Diagram
          </button>
        )}

        {/* Help toggle (create mode) */}
        {isCreateMode && onToggleHelp && (
          <button
            className={styles.iconBtn}
            onClick={onToggleHelp}
            title={showHelp ? 'Hide Help' : 'Show Help'}
          >
            {showHelp ? <X size={16} /> : <HelpCircle size={16} />}
          </button>
        )}

        {/* Undo/Redo (edit mode) */}
        {!isCreateMode && (
          <>
            <div className={styles.divider} />
            <button
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className={styles.iconBtn}
            >
              <Undo size={18} />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className={styles.iconBtn}
            >
              <Redo size={18} />
            </button>
          </>
        )}

        {/* SLA Modal (edit mode) */}
        {!isCreateMode && onOpenSLAModal && (
          <>
            <div className={styles.divider} />
            <button
              onClick={onOpenSLAModal}
              className={styles.secondaryBtn}
            >
              <Settings size={16} /> Manage SLA
            </button>
          </>
        )}

        {/* Edit/Lock toggle (edit mode) */}
        {!isCreateMode && onToggleEditing && (
          <button
            onClick={onToggleEditing}
            className={`${styles.toggleBtn} ${isEditingGraph ? styles.toggleBtnActive : styles.toggleBtnInactive}`}
          >
            {isEditingGraph ? '🔓 Editing' : '🔒 Locked'}
          </button>
        )}

        <div className={styles.divider} />

        {/* Cancel (create mode) */}
        {isCreateMode && onBack && (
          <button
            className={styles.cancelBtn}
            onClick={onBack}
          >
            Cancel
          </button>
        )}

        {/* Save button */}
        <button
          onClick={onSave}
          disabled={isSaving || !canSave}
          className={styles.primaryBtn}
          title={validationErrorCount > 0 ? `Cannot save: ${validationErrorCount} validation error(s)` : ''}
        >
          {isSaving ? (
            <RefreshCw className={styles.spinner} size={16} />
          ) : (
            <Save size={16} />
          )}
          {isSaving ? 'Saving...' : (isCreateMode ? 'Create Workflow' : 'Save Changes')}
        </button>
      </div>
    </div>
  );
});

export default WorkflowToolbar;
