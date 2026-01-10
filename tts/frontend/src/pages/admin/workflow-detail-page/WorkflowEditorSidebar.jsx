import React, { useMemo } from 'react';
import StepEditPanel from './StepEditPanel';
import TransitionEditPanel from './TransitionEditPanel';
import { EditPanel } from '../../../components/workflow/shared';
import { EmptySelection } from './components';

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
    
    // Prefer selectedElement.data as it contains the most up-to-date state
    const elementData = selectedElement.data || {};
    
    // Only fall back to workflowData if we don't have current data
    const step = workflowData?.graph?.nodes?.find((s) => String(s.id) === String(selectedElement.id));
    
    return {
      id: elementData.id ?? step?.id ?? selectedElement.id,
      name: elementData.name ?? elementData.label ?? step?.name,
      label: elementData.label ?? elementData.name ?? step?.name,
      role: elementData.role ?? step?.role,
      assignedRole: elementData.role ?? step?.role,
      type: (elementData.is_start ?? step?.is_start) ? 'initial' : 
            (elementData.is_end ?? step?.is_end) ? 'terminal' : 'standard',
      description: elementData.description ?? step?.description,
      instruction: elementData.instruction ?? step?.instruction,
      is_start: elementData.is_start ?? step?.is_start ?? false,
      is_end: elementData.is_end ?? step?.is_end ?? false,
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
    return <EmptySelection />;
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
