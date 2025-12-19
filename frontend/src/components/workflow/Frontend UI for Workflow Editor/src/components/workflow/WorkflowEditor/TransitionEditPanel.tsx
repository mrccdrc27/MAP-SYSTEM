import { WorkflowTransition } from './WorkflowEditorLayout';
import { Trash2 } from 'lucide-react';

interface TransitionEditPanelProps {
  transition: WorkflowTransition;
  onUpdate: (updates: Partial<WorkflowTransition>) => void;
  onDelete?: () => void;
}

export default function TransitionEditPanel({ transition, onUpdate, onDelete }: TransitionEditPanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-700 mb-1">Transition Label</label>
        <input
          type="text"
          value={transition.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
          placeholder="e.g., Approved, Rejected, Submit"
        />
      </div>

      <div className="pt-4 border-t border-gray-200 space-y-2">
        <div className="text-sm">
          <span className="text-gray-600">From:</span>
          <span className="ml-2 text-gray-900">Step {transition.source}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-600">To:</span>
          <span className="ml-2 text-gray-900">Step {transition.target}</span>
        </div>
      </div>

      {onDelete && (
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={onDelete}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Transition
          </button>
        </div>
      )}
    </div>
  );
}