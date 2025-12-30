import React, { useMemo } from 'react';
import { MousePointer } from 'lucide-react';
import StepEditPanel from './StepEditPanel';
import TransitionEditPanel from './TransitionEditPanel';
import { EditPanel } from '../../../components/workflow/shared';

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
  // Get selected step or transition data
  const stepData = useMemo(() => {
    if (selectedElement?.type !== 'step') return null;
    const step = workflowData?.graph?.nodes?.find((s) => String(s.id) === String(selectedElement.id));
    if (!step) return selectedElement.data || null;
    return {
      id: step.id,
      name: step.name,
      label: step.name,
      role: step.role,
      assignedRole: step.role,
      type: step.is_start ? 'initial' : step.is_end ? 'terminal' : 'standard',
      description: step.description,
      instruction: step.instruction,
      is_start: step.is_start,
      is_end: step.is_end,
      ...selectedElement.data,
    };
  }, [selectedElement, workflowData]);

  const transitionData = useMemo(() => {
    if (selectedElement?.type !== 'transition') return null;
    const transition = workflowData?.graph?.edges?.find((t) => String(t.id) === String(selectedElement.id));
    if (!transition) return selectedElement.data || null;
    return {
      id: transition.id,
      label: transition.name,
      source: transition.from,
      target: transition.to,
      ...selectedElement.data,
    };
  }, [selectedElement, workflowData]);

  // No selection state OR workflow selection (clicking on canvas)
  if (!selectedElement || selectedElement.type === 'workflow') {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        textAlign: 'center',
        background: 'var(--bg1-color)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: 'var(--bg-content-color)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px'
        }}>
          <MousePointer size={32} style={{ color: 'var(--muted-text-color)' }} />
        </div>
        <p style={{ 
          color: 'var(--muted-text-color)', 
          fontSize: '0.875rem',
          margin: '0 0 8px 0'
        }}>No selection</p>
        <p style={{ 
          fontSize: '0.75rem', 
          color: 'var(--muted-text-color)',
          margin: 0
        }}>Click on a step or transition to edit</p>
      </div>
    );
  }

  // Get panel title and subtitle
  const getPanelTitle = () => {
    if (selectedElement.type === 'step') return 'Edit Step';
    if (selectedElement.type === 'transition') return 'Edit Transition';
    return 'Properties';
  };

  const getPanelSubtitle = () => {
    if (selectedElement.type === 'step' && stepData?.name) {
      return stepData.name;
    }
    if (selectedElement.type === 'transition' && transitionData?.label) {
      return transitionData.label;
    }
    return null;
  };

  return (
    <EditPanel
      title={getPanelTitle()}
      subtitle={getPanelSubtitle()}
      isOpen={true}
      showCloseButton={true}
      onClose={onClose}
    >
      {selectedElement.type === 'step' && selectedElement.id && (
        <StepEditPanel
          step={stepData}
          roles={roles}
          onUpdate={(updates) => onUpdateStep(selectedElement.id, updates)}
          onDelete={onDeleteStep ? () => onDeleteStep(selectedElement.id) : undefined}
        />
      )}

      {selectedElement.type === 'transition' && selectedElement.id && (
        <TransitionEditPanel
          transition={transitionData}
          onUpdate={(updates) => onUpdateTransition(selectedElement.id, updates)}
          onDelete={onDeleteTransition ? () => onDeleteTransition(selectedElement.id) : undefined}
        />
      )}
    </EditPanel>
  );
}
