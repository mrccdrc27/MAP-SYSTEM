import React, { useEffect, useState } from 'react';
import styles from '../WorkflowEditor.module.css';
import { useWorkflowRefresh } from '../../../../components/workflow/WorkflowRefreshContext';

export default function TransitionModal({
  editTransitionModal,
  handleUpdateTransition,
  setEditTransitionModal,
  steps,
}) {
  const { triggerRefresh } = useWorkflowRefresh();
  const [previousTransition, setPreviousTransition] = useState(null);

  // Save backup on modal open
  useEffect(() => {
    if (editTransitionModal.isOpen && editTransitionModal.transition) {
      setPreviousTransition({ ...editTransitionModal.transition });
    }
  }, [editTransitionModal.isOpen]);

  if (!editTransitionModal.isOpen) return null;

  const updateField = (field, value) => {
    setEditTransitionModal(prev => ({
      ...prev,
      transition: { ...prev.transition, [field]: value },
    }));
  };

  const handleUndo = () => {
    if (previousTransition) {
      setEditTransitionModal({
        isOpen: true,
        transition: { ...previousTransition },
      });
    }
  };

  const handleSave = async () => {
    const t = editTransitionModal.transition;
    if (!t.transition_id || !t.from_step_id || !t.to_step_id || !t.action_name) return;

    await handleUpdateTransition();
    triggerRefresh();
    setEditTransitionModal({ isOpen: false, transition: null });
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Edit Transition</h3>
          <button
            onClick={() => setEditTransitionModal({ isOpen: false, transition: null })}
            className={styles.modalCloseButton}
          >×</button>
        </div>

        <div className={styles.modalContent}>
          {/* From Step */}
          <div className={styles.formField}>
            <label className={styles.label}>From Step</label>
            <select
              value={editTransitionModal.transition?.from_step_id || ''}
              onChange={(e) => updateField('from_step_id', e.target.value)}
              className={styles.select}
            >
              <option value="">Start Workflow</option>
              {steps.map(step => (
                <option key={step.step_id} value={step.step_id}>{step.name}</option>
              ))}
            </select>
          </div>

          {/* To Step */}
          <div className={styles.formField}>
            <label className={styles.label}>To Step</label>
            <select
              value={editTransitionModal.transition?.to_step_id || ''}
              onChange={(e) => updateField('to_step_id', e.target.value)}
              className={styles.select}
            >
              <option value="">End workflow</option>
              {steps
                .filter(step => step.step_id !== editTransitionModal.transition?.from_step_id)
                .map(step => (
                  <option key={step.step_id} value={step.step_id}>{step.name}</option>
              ))}
            </select>
          </div>

          {/* Action Name */}
          <div className={styles.formField}>
            <label className={styles.label}>Action Name</label>
            <input
              type="text"
              value={editTransitionModal.transition?.action_name || ''}
              onChange={(e) => updateField('action_name', e.target.value)}
              className={styles.input}
              placeholder="Action name"
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            onClick={() => setEditTransitionModal({ isOpen: false, transition: null })}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button onClick={handleUndo} className={styles.undoButton}>
            Undo Changes
          </button>
          <button onClick={handleSave} className={styles.saveButton}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
