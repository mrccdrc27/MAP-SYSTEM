import React from 'react';
import styles from './workflow-creation-confirmation.module.css';
import { Check } from 'lucide-react';

export default function WorkflowCreationConfirmation({
  workflow,
  onClose,
  onEditWorkflow,
}) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.successIcon}>
            <Check size={32} strokeWidth={3} />
          </div>
          <h2>Workflow Created Successfully</h2>
        </div>

        <div className={styles.content}>
          <div className={styles.workflowDetails}>
            <div className={styles.detailRow}>
              <span className={styles.label}>Workflow ID:</span>
              <span className={styles.value}>{workflow.workflow_id}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Name:</span>
              <span className={styles.value}>{workflow.name}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Category:</span>
              <span className={styles.value}>
                {workflow.category} / {workflow.sub_category}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Department:</span>
              <span className={styles.value}>{workflow.department}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Status:</span>
              <span className={`${styles.value} ${styles.statusBadge}`}>
                {workflow.status}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Created:</span>
              <span className={styles.value}>{formatDate(workflow.created_at)}</span>
            </div>
          </div>

          <p className={styles.message}>
            Your workflow has been successfully created. You can now edit the
            workflow steps, configure transitions, and set up SLA weights.
          </p>
        </div>

        <div className={styles.actions}>
          <button className={styles.btnSecondary} onClick={onClose}>
            Back to Workflows
          </button>
          <button className={styles.btnPrimary} onClick={() => onEditWorkflow(workflow.workflow_id, workflow.name)}>
            Edit Workflow
          </button>
        </div>
      </div>
    </div>
  );
}
