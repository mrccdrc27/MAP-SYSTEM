import React, { useState, useEffect } from 'react';
import styles from './StepEditPanel.module.css';
import { useWorkflowAPI } from '../../../api/useWorkflowAPI';

export default function StepEditPanel({ step, roles, onClose, onSave, onDelete, onChange }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    instruction: '',
    role: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { updateStepDetails } = useWorkflowAPI();

  useEffect(() => {
    if (step) {
      setFormData({
        name: step.label || step.name || '',
        description: step.description || '',
        instruction: step.instruction || '',
        role: step.role || '',
      });
    }
  }, [step]);

  // Call onChange when formData changes for real-time updates
  useEffect(() => {
    if (onChange && String(step?.id).startsWith('temp-')) {
      onChange({
        name: formData.name,
        role: formData.role,
        description: formData.description,
        instruction: formData.instruction,
      });
    }
  }, [formData, onChange, step?.id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (String(step.id).startsWith('temp-')) {
      onSave({
        ...step,
        name: formData.name,
        role: formData.role,
        description: formData.description,
        instruction: formData.instruction,
      });
      return;
    }

    try {
      const updateData = {
        name: formData.name,
        description: formData.description,
        instruction: formData.instruction,
        role: formData.role,
      };

      await updateStepDetails(step.id, updateData);
      onSave({
        ...step,
        label: formData.name,
        ...updateData,
      });
    } catch (err) {
      setError(err.message || 'Failed to update step');
      console.error('Error updating step:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete();
    onClose();
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>Edit Step</h3>
        <button className={styles.closeBtn} onClick={onClose}>
          ✕
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {showDeleteConfirm ? (
        <div className={styles.deleteConfirmation}>
          <p>Are you sure you want to delete this step?</p>
          <p className={styles.warning}>This action cannot be undone.</p>
          <div className={styles.confirmActions}>
            <button
              className={styles.cancelBtn}
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </button>
            <button
              className={styles.deleteConfirmBtn}
              onClick={confirmDelete}
            >
              Delete Step
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Step Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter step name"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option key="default" value="">Select a role</option>
              {roles.map((role) => (
                <option key={role.role_id} value={role.name}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter step description"
              rows="3"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Instruction</label>
            <textarea
              name="instruction"
              value={formData.instruction}
              onChange={handleChange}
              placeholder="Enter step instruction"
              rows="3"
            />
          </div>

          <div className={styles.formActions}>
            <button type="button" onClick={onClose} className={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={loading}>
              {loading ? 'Saving...' : 'Save Step'}
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className={styles.deleteBtn}
              >
                Delete Step
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
