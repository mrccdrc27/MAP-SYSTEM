import React, { useState, useEffect } from 'react';
import styles from './WorkflowEditPanel.module.css';
import { useWorkflowAPI } from '../../../api/useWorkflowAPI';

export default function WorkflowEditPanel({ workflow, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    sub_category: '',
    department: '',
    end_logic: '',
    low_sla: '',
    medium_sla: '',
    high_sla: '',
    urgent_sla: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const { updateWorkflowDetails } = useWorkflowAPI();

  useEffect(() => {
    if (workflow) {
      setFormData({
        name: workflow.name || '',
        description: workflow.description || '',
        category: workflow.category || '',
        sub_category: workflow.sub_category || '',
        department: workflow.department || '',
        end_logic: workflow.end_logic || '',
        low_sla: workflow.low_sla || '',
        medium_sla: workflow.medium_sla || '',
        high_sla: workflow.high_sla || '',
        urgent_sla: workflow.urgent_sla || '',
      });
    }
  }, [workflow]);

  const handleChange = (e) => {
    if (!isEditing) return;
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

    try {
      const updateData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        sub_category: formData.sub_category,
        department: formData.department,
        end_logic: formData.end_logic,
        low_sla: formData.low_sla ? parseInt(formData.low_sla) : null,
        medium_sla: formData.medium_sla ? parseInt(formData.medium_sla) : null,
        high_sla: formData.high_sla ? parseInt(formData.high_sla) : null,
        urgent_sla: formData.urgent_sla ? parseInt(formData.urgent_sla) : null,
      };

      await updateWorkflowDetails(workflow.workflow_id, updateData);
      onSave({
        ...workflow,
        ...updateData,
      });
    } catch (err) {
      setError(err.message || 'Failed to update workflow');
      console.error('Error updating workflow:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>Edit Workflow</h3>
        <button className={styles.closeBtn} onClick={onClose}>
          ✕
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.section}>
          <h4>Basic Information</h4>
          
          <div className={styles.formGroup}>
            <label>Workflow Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter workflow name"
              disabled={!isEditing}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter workflow description"
              rows="3"
              disabled={!isEditing}
            />
          </div>
        </div>

        <div className={styles.section}>
          <h4>Classification</h4>

          <div className={styles.formGroup}>
            <label>Category</label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              placeholder="e.g., Support, Sales, HR"
              disabled={!isEditing}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Sub-Category</label>
            <input
              type="text"
              name="sub_category"
              value={formData.sub_category}
              onChange={handleChange}
              placeholder="e.g., Technical, Billing"
              disabled={!isEditing}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Department</label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="e.g., Engineering, Operations"
              disabled={!isEditing}
            />
          </div>
        </div>

        <div className={styles.section}>
          <h4>SLA Times (in hours)</h4>

          <div className={styles.slaGrid}>
            <div className={styles.formGroup}>
              <label>Low Priority</label>
              <input
                type="number"
                name="low_sla"
                value={formData.low_sla}
                onChange={handleChange}
                placeholder="e.g., 48"
                min="0"
                disabled={!isEditing}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Medium Priority</label>
              <input
                type="number"
                name="medium_sla"
                value={formData.medium_sla}
                onChange={handleChange}
                placeholder="e.g., 24"
                min="0"
                disabled={!isEditing}
              />
            </div>

            <div className={styles.formGroup}>
              <label>High Priority</label>
              <input
                type="number"
                name="high_sla"
                value={formData.high_sla}
                onChange={handleChange}
                placeholder="e.g., 12"
                min="0"
                disabled={!isEditing}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Urgent Priority</label>
              <input
                type="number"
                name="urgent_sla"
                value={formData.urgent_sla}
                onChange={handleChange}
                placeholder="e.g., 4"
                min="0"
                disabled={!isEditing}
              />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h4>End Logic</h4>

          <div className={styles.formGroup}>
            <label>End Logic (Optional)</label>
            <textarea
              name="end_logic"
              value={formData.end_logic}
              onChange={handleChange}
              placeholder="Define the logic for workflow completion"
              rows="3"
              disabled={!isEditing}
            />
          </div>
        </div>

        <div className={styles.formActions}>
          {!isEditing ? (
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
                onClick={() => setIsEditing(false)}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
              <button type="submit" className={styles.saveBtn} disabled={loading}>
                {loading ? 'Saving...' : 'Save Workflow'}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
