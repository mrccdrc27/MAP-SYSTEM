import React, { useState, useEffect } from 'react';
import styles from './WorkflowEditorLayout.module.css';
import { useWorkflowAPI } from '../../../../api/useWorkflowAPI';

export default function WorkflowEditPanel({ workflow, onSave, readOnly = false }) {
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
  const [isEditing, setIsEditing] = useState(!readOnly);

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
      setIsEditing(!readOnly);
    }
  }, [workflow, readOnly]);

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
      if (onSave) {
        onSave({
          ...workflow,
          ...updateData,
        });
      }
      setIsEditing(false);
    } catch (err) {
      setError(err.message || 'Failed to update workflow');
      console.error('Error updating workflow:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!workflow) {
    return (
      <div className={styles.workflowPanelEmpty}>
        <p>Click on the canvas to view workflow properties</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className={styles.workflowPanelError}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.workflowPanelForm}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Workflow Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            disabled={!isEditing}
            className={styles.formInput}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            disabled={!isEditing}
            rows={3}
            className={styles.formTextarea}
          />
        </div>

        <div className={styles.workflowPanelGrid}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Category</label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              disabled={!isEditing}
              className={styles.formInput}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Sub-Category</label>
            <input
              type="text"
              name="sub_category"
              value={formData.sub_category}
              onChange={handleChange}
              disabled={!isEditing}
              className={styles.formInput}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Department</label>
          <input
            type="text"
            name="department"
            value={formData.department}
            onChange={handleChange}
            disabled={!isEditing}
            className={styles.formInput}
          />
        </div>

        {/* SLA Section */}
        <div className={styles.workflowPanelSlaSection}>
          <h4 className={styles.workflowPanelSlaTitle}>SLA Settings (seconds)</h4>
          <div className={styles.workflowPanelGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Urgent SLA</label>
              <input
                type="number"
                name="urgent_sla"
                value={formData.urgent_sla}
                onChange={handleChange}
                disabled={!isEditing}
                className={styles.formInput}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>High SLA</label>
              <input
                type="number"
                name="high_sla"
                value={formData.high_sla}
                onChange={handleChange}
                disabled={!isEditing}
                className={styles.formInput}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Medium SLA</label>
              <input
                type="number"
                name="medium_sla"
                value={formData.medium_sla}
                onChange={handleChange}
                disabled={!isEditing}
                className={styles.formInput}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Low SLA</label>
              <input
                type="number"
                name="low_sla"
                value={formData.low_sla}
                onChange={handleChange}
                disabled={!isEditing}
                className={styles.formInput}
              />
            </div>
          </div>
        </div>

        {!readOnly && (
          <div className={styles.workflowPanelActions}>
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className={styles.btnPrimary}
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    // Reset form data
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
                  }}
                  className={styles.btnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={styles.btnPrimary}
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
