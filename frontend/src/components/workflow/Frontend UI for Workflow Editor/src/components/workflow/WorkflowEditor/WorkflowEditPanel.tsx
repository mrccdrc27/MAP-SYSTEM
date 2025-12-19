import { WorkflowData } from './WorkflowEditorLayout';

interface WorkflowEditPanelProps {
  workflow: WorkflowData;
  onUpdate: (updates: Partial<WorkflowData>) => void;
}

export default function WorkflowEditPanel({ workflow, onUpdate }: WorkflowEditPanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-700 mb-1">Workflow Name</label>
        <input
          type="text"
          value={workflow.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-700 mb-1">Description</label>
        <textarea
          value={workflow.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-700 mb-1">Total SLA (hours)</label>
        <input
          type="number"
          min="1"
          value={workflow.totalSLA}
          onChange={(e) => onUpdate({ totalSLA: parseInt(e.target.value) || 0 })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
        />
        <p className="text-xs text-gray-500 mt-1">
          Total time allocated for the entire workflow
        </p>
      </div>
    </div>
  );
}
