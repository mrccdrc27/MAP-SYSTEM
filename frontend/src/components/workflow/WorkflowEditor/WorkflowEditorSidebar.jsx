import React from 'react';
import { X } from 'lucide-react';
import styles from './WorkflowEditorLayout.module.css';
import StepEditPanel from './StepEditPanel';
import TransitionEditPanel from './TransitionEditPanel';
import WorkflowEditPanel from './WorkflowEditPanel';

export default function WorkflowEditorSidebar({
  selectedElement,
  workflowData,
  roles,
  onUpdateStep,
  onUpdateTransition,
  onDeleteStep,
  onDeleteTransition,
  onClose,
}) {
  // No selection state
  if (!selectedElement) {
    return (
      <div className={styles.sidebarEmpty}>
        <div className={styles.sidebarEmptyContent}>
          <div className={styles.sidebarEmptyIcon}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          </div>
          <p className={styles.sidebarEmptyTitle}>No selection</p>
          <p className={styles.sidebarEmptySubtitle}>Click on a step, transition, or the canvas to edit properties</p>
        </div>
      </div>
    );
  }

  // Get selected step or transition data
  const getStepData = () => {
    if (selectedElement.type !== 'step') return null;
    const step = workflowData?.graph?.nodes?.find((s) => String(s.id) === String(selectedElement.id));
    if (!step) return selectedElement.data || null;
    return {
      id: step.id,
      label: step.name,
      role: step.role,
      description: step.description,
      instruction: step.instruction,
      is_start: step.is_start,
      is_end: step.is_end,
      ...selectedElement.data,
    };
  };

  const getTransitionData = () => {
    if (selectedElement.type !== 'transition') return null;
    const transition = workflowData?.graph?.edges?.find((t) => String(t.id) === String(selectedElement.id));
    if (!transition) return selectedElement.data || null;
    return {
      id: transition.id,
      label: transition.name,
      source: transition.from,
      target: transition.to,
      ...selectedElement.data,
    };
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <h3 className={styles.sidebarTitle}>
          {selectedElement.type === 'step' && 'Edit Step'}
          {selectedElement.type === 'transition' && 'Edit Transition'}
          {selectedElement.type === 'workflow' && 'Workflow Properties'}
        </h3>
        <button onClick={onClose} className={styles.sidebarCloseBtn} title="Close panel">
          <X />
        </button>
      </div>

      <div className={styles.sidebarContent}>
        {selectedElement.type === 'step' && selectedElement.id && (
          <StepEditPanel
            step={getStepData()}
            roles={roles}
            onUpdate={(updates) => onUpdateStep(selectedElement.id, updates)}
            onDelete={onDeleteStep ? () => onDeleteStep(selectedElement.id) : undefined}
          />
        )}

        {selectedElement.type === 'transition' && selectedElement.id && (
          <TransitionEditPanel
            transition={getTransitionData()}
            onUpdate={(updates) => onUpdateTransition(selectedElement.id, updates)}
            onDelete={onDeleteTransition ? () => onDeleteTransition(selectedElement.id) : undefined}
          />
        )}

        {selectedElement.type === 'workflow' && (
          <WorkflowEditPanel
            workflow={workflowData?.workflow}
            readOnly={true}
          />
        )}
      </div>
    </div>
  );
}
