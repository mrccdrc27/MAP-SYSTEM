import { Handle, Position } from 'reactflow';
import { Circle, Flag } from 'lucide-react';

interface StepNodeData {
  label: string;
  role?: string;
  isStart?: boolean;
  isEnd?: boolean;
}

interface StepNodeProps {
  data: StepNodeData;
  selected?: boolean;
}

export default function StepNode({ data, selected }: StepNodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-lg bg-white border-2 shadow-sm transition-all min-w-[180px] ${
        selected
          ? 'border-blue-500 shadow-md'
          : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      {!data.isStart && (
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500" />
      )}
      
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-gray-900">{data.label}</span>
            {data.isStart && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs">
                <Circle className="w-3 h-3" />
                START
              </span>
            )}
            {data.isEnd && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs">
                <Flag className="w-3 h-3" />
                END
              </span>
            )}
          </div>
          {data.role && (
            <div className="text-sm text-gray-600">{data.role}</div>
          )}
        </div>
      </div>

      {!data.isEnd && (
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
      )}
    </div>
  );
}
