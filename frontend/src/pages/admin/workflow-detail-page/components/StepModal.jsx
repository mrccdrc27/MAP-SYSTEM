import React from 'react';
import styles from '../WorkflowEditor.module.css';

export default function StepModal({ editStepModal, setEditStepModal, role, handleUpdateStep }) {
  if (!editStepModal.isOpen) return null;

  const updateField = (field, value) => {
    setEditStepModal(prev => ({
      ...prev,
      step: { ...prev.step, [field]: value },
    }));
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Edit Step</h3>
          <button 
            onClick={() => setEditStepModal({ isOpen: false, step: null })}
            className={styles.modalCloseButton}
          >×</button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.formField}>
            <label className={styles.label}>Step Name</label>
            <input
              type="text"
              value={editStepModal.step?.name || ''}
              onChange={(e) => updateField('name', e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.label}>Role</label>
            <select
              value={editStepModal.step?.role_id || ''}
              onChange={(e) => updateField('role_id', e.target.value)}
              className={styles.select}
            >
              <option value="">Select Role</option>
              {role.map(r => (
                <option key={r.role_id} value={r.role_id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            onClick={() => setEditStepModal({ isOpen: false, step: null })}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button onClick={handleUpdateStep} className={styles.saveButton}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
