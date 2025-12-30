import React from 'react';
import { useParams } from 'react-router-dom';
import WorkflowEditorLayout from '../admin/workflow-detail-page/WorkflowEditorLayout';
import styles from './WorkflowEditorPage.module.css';
import { slugToWorkflowName } from '../../api/useWorkflowAPI';
 
export default function WorkflowEditorPage() {
  const { workflowName, workflowId } = useParams();
  
  // Support both name-based and ID-based routing for backward compatibility
  const identifier = workflowName || workflowId;
  const isNameBased = !!workflowName;
 
  if (!identifier) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <h2>No Workflow Identifier Provided</h2>
          <p>Please provide a valid workflow name in the URL: /admin/workflow/:workflowName</p>
        </div>
      </div>
    );
  }
 
  return (
    <div className={styles.page}>
      <WorkflowEditorLayout 
        workflowIdentifier={identifier} 
        isNameBased={isNameBased}
      />
    </div>
  );
}
