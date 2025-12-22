import { X } from 'lucide-react';
import StepEditPanel from './StepEditPanel';
import TransitionEditPanel from './TransitionEditPanel';
import WorkflowEditPanel from './WorkflowEditPanel';
import { WorkflowData, WorkflowStep, WorkflowTransition } from './WorkflowEditorLayout';

interface WorkflowEditorSidebarProps {
  selectedElement: { type: 'step' | 'transition' | 'workflow'; id?: string } | null;
  workflowData: WorkflowData;
  onUpdateStep: (stepId: string, updates: Partial<WorkflowStep>) => void;
  onUpdateTransition: (transitionId: string, updates: Partial<WorkflowTransition>) => void;
  onUpdateWorkflow: (updates: Partial<WorkflowData>) => void;
  onDeleteStep?: (stepId: string) => void;
  onDeleteTransition?: (transitionId: string) => void;
  onClose: () => void;
}

export default function WorkflowEditorSidebar({
  selectedElement,
  workflowData,
  onUpdateStep,
  onUpdateTransition,
  onUpdateWorkflow,
  onDeleteStep,
  onDeleteTransition,
  onClose,
}: WorkflowEditorSidebarProps) {
  if (!selectedElement) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm mb-2">No selection</p>
          <p className="text-xs text-gray-400">Click on a step, transition, or the canvas to edit properties</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-gray-900">
          {selectedElement.type === 'step' && 'Edit Step'}
          {selectedElement.type === 'transition' && 'Edit Transition'}
          {selectedElement.type === 'workflow' && 'Workflow Properties'}
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Close panel"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {selectedElement.type === 'step' && selectedElement.id && (
          <StepEditPanel
            step={workflowData.steps.find((s) => s.id === selectedElement.id)!}
            onUpdate={(updates) => onUpdateStep(selectedElement.id!, updates)}
            onDelete={onDeleteStep ? () => onDeleteStep(selectedElement.id!) : undefined}
          />
        )}

        {selectedElement.type === 'transition' && selectedElement.id && (
          <TransitionEditPanel
            transition={workflowData.transitions.find((t) => t.id === selectedElement.id)!}
            onUpdate={(updates) => onUpdateTransition(selectedElement.id!, updates)}
            onDelete={onDeleteTransition ? () => onDeleteTransition(selectedElement.id!) : undefined}
          />
        )}

        {selectedElement.type === 'workflow' && (
          <WorkflowEditPanel
            workflow={workflowData}
            onUpdate={onUpdateWorkflow}
          />
        )}
      </div>
    </div>
  );
}