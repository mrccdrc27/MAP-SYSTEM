import React, { memo, useEffect } from 'react';
import { X, Settings } from 'lucide-react';
import WorkflowConfigPanel from './WorkflowConfigPanel';
import styles from './WorkflowConfigModal.module.css';

/**
 * Modal wrapper for WorkflowConfigPanel
 * Opens when user clicks the "Configure" button on the toolbar
 */
const WorkflowConfigModal = memo(function WorkflowConfigModal({
  workflow,
  workflowId,
  onUpdate,
  onClose,
}) {
  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <Settings size={20} className={styles.headerIcon} />
            <div>
              <h2 className={styles.title}>Workflow Configuration</h2>
              {workflow?.name && (
                <span className={styles.subtitle}>{workflow.name}</span>
              )}
            </div>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <WorkflowConfigPanel
            workflow={workflow}
            workflowId={workflowId}
            onUpdate={(data) => {
              onUpdate?.(data);
              // Optionally close modal after save - uncomment if desired
              // onClose?.();
            }}
          />
        </div>
      </div>
    </div>
  );
});

export default WorkflowConfigModal;
