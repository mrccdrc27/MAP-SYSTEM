import React from 'react';
import { useParams } from 'react-router-dom';
import WorkflowEditorLayout from '../../components/workflow/WorkflowEditor/WorkflowEditorLayout';
import styles from './WorkflowEditorPage.module.css';
 
export default function WorkflowEditorPage() {
  const { workflowId } = useParams();
 
  if (!workflowId) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <h2>No Workflow ID Provided</h2>
          <p>Please provide a valid workflow ID in the URL: /test/workflow/:workflowId</p>
        </div>
      </div>
    );
  }
 
  return (
    <div className={styles.page}>
      <WorkflowEditorLayout workflowId={workflowId} />
    </div>
  );
}