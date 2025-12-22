import { useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  NodeChange,
  EdgeChange,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';
import StepNode from './StepNode';
import { WorkflowData, WorkflowStep, WorkflowTransition } from './WorkflowEditorLayout';
import { useEffect } from 'react';

const nodeTypes = {
  stepNode: StepNode,
};

interface WorkflowEditorContentProps {
  workflowData: WorkflowData;
  onSelectElement: (element: { type: 'step' | 'transition' | 'workflow'; id?: string } | null) => void;
  onUpdateSteps: (steps: WorkflowStep[]) => void;
  onUpdateTransitions: (transitions: WorkflowTransition[]) => void;
}

export default function WorkflowEditorContent({
  workflowData,
  onSelectElement,
  onUpdateSteps,
  onUpdateTransitions,
}: WorkflowEditorContentProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Convert workflow data to React Flow format
  useEffect(() => {
    const flowNodes: Node[] = workflowData.steps.map((step, index) => ({
      id: step.id,
      type: 'stepNode',
      data: {
        label: step.label,
        role: step.role,
        isStart: step.isStart,
        isEnd: step.isEnd,
      },
      position: { x: 250, y: index * 150 + 50 },
    }));

    const flowEdges: Edge[] = workflowData.transitions.map((transition) => ({
      id: transition.id,
      source: transition.source,
      target: transition.target,
      label: transition.label,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      labelStyle: { fill: '#1f2937' },
      labelBgStyle: { fill: '#ffffff' },
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [workflowData, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const newTransition: WorkflowTransition = {
        id: `e${connection.source}-${connection.target}`,
        source: connection.source,
        target: connection.target,
        label: 'New Transition',
      };

      onUpdateTransitions([...workflowData.transitions, newTransition]);
    },
    [workflowData.transitions, onUpdateTransitions]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onSelectElement({ type: 'step', id: node.id });
    },
    [onSelectElement]
  );

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      onSelectElement({ type: 'transition', id: edge.id });
    },
    [onSelectElement]
  );

  const onPaneClick = useCallback(() => {
    onSelectElement({ type: 'workflow' });
  }, [onSelectElement]);

  return (
    <div className="h-full bg-gray-50 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#d1d5db" />
        <Controls className="bg-white border border-gray-200 rounded-lg shadow-sm" />
        <MiniMap
          className="bg-white border border-gray-200 rounded-lg shadow-sm"
          nodeColor="#3b82f6"
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
      
      {/* Helper text */}
      <div className="absolute bottom-4 left-4 bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-xs text-gray-600 max-w-xs">
        <p><strong>Tip:</strong> Click nodes to edit, drag to reposition, or connect handles to create transitions.</p>
      </div>
    </div>
  );
}