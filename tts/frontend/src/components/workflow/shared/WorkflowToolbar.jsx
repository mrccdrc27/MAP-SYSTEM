import React, { memo } from 'react';
import { Save, RefreshCw, Settings, ArrowLeft, HelpCircle, X, Layout, Edit3 } from 'lucide-react';
import styles from './WorkflowToolbar.module.css';

/**
 * Unified toolbar for workflow creation and editing
 * @param {object} props
 * @param {string} props.title - Workflow title
 * @param {string} props.subtitle - Category/subcategory info
 * @param {string} props.mode - 'create' or 'edit'
 * @param {boolean} props.isSaving - Loading state for save
 * @param {boolean} props.hasUnsavedChanges - Whether there are pending changes
 * @param {boolean} props.isEditingGraph - Graph editing mode
 * @param {number} props.validationErrorCount - Number of validation errors
 * @param {number} props.stepCount - Number of steps
 * @param {number} props.transitionCount - Number of transitions
 * @param {function} props.onSave - Save handler
 * @param {function} props.onBack - Back navigation handler
 * @param {function} props.onToggleEditing - Toggle graph editing mode
 * @param {function} props.onOpenSLAModal - Open SLA configuration modal
 * @param {string} props.activeTab - Current active tab ('editor' or 'config')
 * @param {function} props.onTabChange - Tab change handler
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
  isEditingGraph = false,
  validationErrorCount = 0,
  stepCount = 0,
  transitionCount = 0,
  onSave,
  onBack,
  onToggleEditing,
  onOpenSLAModal,
  activeTab = 'editor',
  onTabChange,
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

        {/* SLA Modal removed - SLA config is now in Configure tab */}

        {/* Tab Switcher (edit mode) - Editor / Configure */}
        {!isCreateMode && onTabChange && (
          <div className={styles.tabGroup}>
            <button
              onClick={() => onTabChange('editor')}
              className={`${styles.tabBtn} ${activeTab === 'editor' ? styles.tabBtnActive : ''}`}
              title="Workflow Editor"
            >
              <Edit3 size={14} /> Editor
            </button>
            <button
              onClick={() => onTabChange('config')}
              className={`${styles.tabBtn} ${activeTab === 'config' ? styles.tabBtnActive : ''}`}
              title="Configure workflow settings"
            >
              <Settings size={14} /> Configure
            </button>
          </div>
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

        {/* Save button - only shown in create mode, edit mode has save inside canvas */}
        {isCreateMode && (
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
            {isSaving ? 'Saving...' : 'Create Workflow'}
          </button>
        )}
      </div>
    </div>
  );
});

export default WorkflowToolbar;
