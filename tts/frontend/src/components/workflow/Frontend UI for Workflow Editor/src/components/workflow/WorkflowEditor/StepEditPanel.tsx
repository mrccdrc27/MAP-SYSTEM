import { WorkflowStep } from './WorkflowEditorLayout';
import { Trash2 } from 'lucide-react';

interface StepEditPanelProps {
  step: WorkflowStep;
  onUpdate: (updates: Partial<WorkflowStep>) => void;
  onDelete?: () => void;
}

export default function StepEditPanel({ step, onUpdate, onDelete }: StepEditPanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-700 mb-1">Step Name</label>
        <input
          type="text"
          value={step.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-700 mb-1">Assigned Role</label>
        <input
          type="text"
          value={step.role}
          onChange={(e) => onUpdate({ role: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
          placeholder="e.g., Admin, Manager, Customer"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-700 mb-1">SLA Weight</label>
        <input
          type="number"
          min="1"
          value={step.slaWeight || 1}
          onChange={(e) => onUpdate({ slaWeight: parseInt(e.target.value) || 1 })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
        />
        <p className="text-xs text-gray-500 mt-1">
          Relative time allocation for this step
        </p>
      </div>

      <div className="pt-4 border-t border-gray-200 space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={step.isStart || false}
            onChange={(e) => onUpdate({ isStart: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
          />
          <span className="text-sm text-gray-700">Mark as START step</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={step.isEnd || false}
            onChange={(e) => onUpdate({ isEnd: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
          />
          <span className="text-sm text-gray-700">Mark as END step</span>
        </label>
      </div>

      {onDelete && !step.isStart && !step.isEnd && (
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={onDelete}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Step
          </button>
        </div>
      )}
    </div>
  );
}