import { useState } from 'react';
import { Plus, BarChart3, Grid3x3, Zap } from 'lucide-react';

interface WorkflowEditorToolbarProps {
  onAddStep: (label: string) => void;
  stepCount: number;
  transitionCount: number;
}

export default function WorkflowEditorToolbar({
  onAddStep,
  stepCount,
  transitionCount,
}: WorkflowEditorToolbarProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStepLabel, setNewStepLabel] = useState('');

  const handleAddStep = () => {
    if (newStepLabel.trim()) {
      onAddStep(newStepLabel.trim());
      setNewStepLabel('');
      setShowAddForm(false);
    }
  };

  const quickAddTemplates = [
    { label: 'Review', icon: '📋' },
    { label: 'Approval', icon: '✓' },
    { label: 'Processing', icon: '⚙️' },
    { label: 'Notification', icon: '🔔' },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-gray-900 mb-4">Tools</h3>
        
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Step
          </button>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={newStepLabel}
              onChange={(e) => setNewStepLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddStep()}
              placeholder="Step name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddStep}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewStepLabel('');
                }}
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Add Templates */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-gray-600" />
          <span className="text-sm text-gray-700">Quick Add</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {quickAddTemplates.map((template) => (
            <button
              key={template.label}
              onClick={() => onAddStep(template.label)}
              className="px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700 transition-colors flex items-center gap-2"
            >
              <span>{template.icon}</span>
              <span>{template.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-gray-600" />
          <span className="text-gray-900">Workflow Stats</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Steps:</span>
            <span className="text-gray-900">{stepCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Transitions:</span>
            <span className="text-gray-900">{transitionCount}</span>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="mt-auto p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2 mb-2">
          <Grid3x3 className="w-4 h-4 text-gray-600" />
          <span className="text-sm text-gray-700">Shortcuts</span>
        </div>
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Save</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-gray-700">Ctrl+S</kbd>
          </div>
          <div className="flex justify-between">
            <span>Undo</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-gray-700">Ctrl+Z</kbd>
          </div>
          <div className="flex justify-between">
            <span>Redo</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-gray-700">Ctrl+Y</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}