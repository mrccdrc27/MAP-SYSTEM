import React, { useState, useEffect } from 'react';
import styles from './TransitionEditPanel.module.css';
import { useWorkflowAPI } from '../../../api/useWorkflowAPI';

export default function TransitionEditPanel({ transition, onClose, onSave, onDelete }) {
  const [formData, setFormData] = useState({
    name: '',
    to: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { updateTransitionDetails } = useWorkflowAPI();

  useEffect(() => {
    if (transition) {
      setFormData({
        name: transition.label || transition.name || '',
        to: transition?.data?.to || transition?.target || '',
      });
    }
  }, [transition]);

  const handleChange = (e) => {
    if (!isEditing && !String(transition?.id).startsWith('temp-')) return;
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

    if (String(transition.id).startsWith('temp-')) {
      onSave({
        ...transition,
        label: formData.name,
        name: formData.name,
        target: formData.to,
        data: {
          ...transition.data,
          to: formData.to,
        },
      });
      return;
    }

    try {
      const updateData = {
        name: formData.name,
        to: formData.to,
      };

      await updateTransitionDetails(transition.id, updateData);
      onSave({
        ...transition,
        label: formData.name,
        target: formData.to,
        data: {
          ...transition.data,
          to: formData.to,
        },
        ...updateData,
      });
    } catch (err) {
      setError(err.message || 'Failed to update transition');
      console.error('Error updating transition:', err);
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
        <h3>Edit Transition</h3>
        <button className={styles.closeBtn} onClick={onClose}>
          ✕
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {showDeleteConfirm ? (
        <div className={styles.deleteConfirmation}>
          <p>Are you sure you want to delete this transition?</p>
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
              Delete Transition
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.info}>
            <div className={styles.infoItem}>
              <span>From Step ID:</span>
              <strong>{transition?.data?.from || transition?.source}</strong>
            </div>
            {transition?.data?.to_delete && (
              <div className={styles.deletedIndicator}>
                <span>✓ Marked for deletion</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Transition Name / Label</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Approved, Rejected, Needs Revision"
                disabled={!isEditing && !String(transition?.id).startsWith('temp-')}
              />
            </div>

            <div className={styles.formGroup}>
              <label>To Step ID</label>
              <input
                type="text"
                name="to"
                value={formData.to}
                onChange={handleChange}
                placeholder="e.g., 2, temp-n123"
                disabled={!isEditing && !String(transition?.id).startsWith('temp-')}
              />
            </div>

            <div className={styles.formActions}>
              {!isEditing && !String(transition?.id).startsWith('temp-') ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className={styles.editBtn}
                >
                  ✏️ Edit
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      onClose();
                    }}
                    className={styles.cancelBtn}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.saveBtn} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Transition'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className={styles.editBtn}
                  >
                    ✏️ Edit
                  </button>
                </>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className={styles.deleteBtn}
                >
                  Delete Transition
                </button>
              )}
            </div>
          </form>
        </>
      )}
    </div>
  );
}
