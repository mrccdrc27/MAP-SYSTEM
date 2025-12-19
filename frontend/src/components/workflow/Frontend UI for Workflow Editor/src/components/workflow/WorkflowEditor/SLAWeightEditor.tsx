import { useState } from 'react';
import { X, Info } from 'lucide-react';
import { WorkflowStep } from './WorkflowEditorLayout';

interface SLAWeightEditorProps {
  steps: WorkflowStep[];
  totalSLA: number;
  onSave: (weights: Record<string, number>) => void;
  onClose: () => void;
}

export default function SLAWeightEditor({ steps, totalSLA, onSave, onClose }: SLAWeightEditorProps) {
  const [weights, setWeights] = useState<Record<string, number>>(
    steps.reduce((acc, step) => {
      acc[step.id] = step.slaWeight || 1;
      return acc;
    }, {} as Record<string, number>)
  );

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

  const calculateAllocatedTime = (weight: number) => {
    if (totalWeight === 0) return 0;
    return (weight / totalWeight) * totalSLA;
  };

  const handleSave = () => {
    onSave(weights);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-gray-900">SLA Time Distribution</h2>
            <p className="text-sm text-gray-600 mt-1">
              Distribute {totalSLA} hours across workflow steps using weights
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 max-h-96 overflow-y-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p>Weights determine the relative time allocation for each step.</p>
              <p className="mt-1">Higher weights = more time allocated to that step.</p>
            </div>
          </div>

          <div className="space-y-4">
            {steps.map((step) => {
              const allocatedTime = calculateAllocatedTime(weights[step.id]);
              const percentage = totalWeight > 0 ? (weights[step.id] / totalWeight) * 100 : 0;

              return (
                <div key={step.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="text-gray-900">{step.label}</div>
                      <div className="text-sm text-gray-600">{step.role}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-900">{allocatedTime.toFixed(1)}h</div>
                      <div className="text-sm text-gray-600">{percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-700 whitespace-nowrap">Weight:</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={weights[step.id]}
                      onChange={(e) =>
                        setWeights((prev) => ({
                          ...prev,
                          [step.id]: parseInt(e.target.value),
                        }))
                      }
                      className="flex-1"
                    />
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={weights[step.id]}
                      onChange={(e) =>
                        setWeights((prev) => ({
                          ...prev,
                          [step.id]: parseInt(e.target.value) || 1,
                        }))
                      }
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-gray-900 text-center"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Total: {totalSLA}h distributed across {steps.length} steps
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Distribution
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
