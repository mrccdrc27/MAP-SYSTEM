import { useEffect, useState, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { useWorkflowRefresh } from './WorkflowRefreshContext';
import StepNode from './WorkflowEditor/StepNode';

const nodeTypes = {
  stepNode: StepNode,
};

// Mock data generator
function getMockWorkflowData(workflowId: string) {
  const workflows: Record<string, any> = {
    'workflow-1': {
      name: 'Customer Onboarding',
      steps: [
        { id: '1', label: 'Submit Application', role: 'Customer', isStart: true },
        { id: '2', label: 'Review Documents', role: 'Admin' },
        { id: '3', label: 'Approve Account', role: 'Manager' },
        { id: '4', label: 'Setup Complete', role: 'System', isEnd: true },
      ],
      transitions: [
        { source: '1', target: '2', label: 'Submit' },
        { source: '2', target: '3', label: 'Approved' },
        { source: '3', target: '4', label: 'Activate' },
      ],
    },
    'workflow-2': {
      name: 'Order Processing',
      steps: [
        { id: '1', label: 'Place Order', role: 'Customer', isStart: true },
        { id: '2', label: 'Payment Verification', role: 'System' },
        { id: '3', label: 'Prepare Shipment', role: 'Warehouse' },
        { id: '4', label: 'Quality Check', role: 'QA' },
        { id: '5', label: 'Ship Order', role: 'Logistics' },
        { id: '6', label: 'Delivered', role: 'Customer', isEnd: true },
      ],
      transitions: [
        { source: '1', target: '2', label: 'Pay' },
        { source: '2', target: '3', label: 'Verified' },
        { source: '3', target: '4', label: 'Ready' },
        { source: '4', target: '5', label: 'Passed' },
        { source: '5', target: '6', label: 'Complete' },
      ],
    },
    'workflow-3': {
      name: 'Support Ticket',
      steps: [
        { id: '1', label: 'Create Ticket', role: 'Customer', isStart: true },
        { id: '2', label: 'Triage', role: 'Support L1' },
        { id: '3', label: 'Investigate', role: 'Support L2' },
        { id: '4', label: 'Resolve', role: 'Support L2' },
        { id: '5', label: 'Closed', role: 'System', isEnd: true },
      ],
      transitions: [
        { source: '1', target: '2', label: 'New' },
        { source: '2', target: '3', label: 'Escalate' },
        { source: '3', target: '4', label: 'Solution Found' },
        { source: '4', target: '5', label: 'Confirm' },
      ],
    },
  };

  return workflows[workflowId] || workflows['workflow-1'];
}

// Auto-layout with dagre
function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 200, height: 100 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 100,
        y: nodeWithPosition.y - 50,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

interface NewWorkflowVisualizerProps {
  workflowId: string;
}

export default function NewWorkflowVisualizer({ workflowId }: NewWorkflowVisualizerProps) {
  const { refreshKey } = useWorkflowRefresh();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);

  const loadWorkflowData = useCallback(() => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const data = getMockWorkflowData(workflowId);
      
      const initialNodes: Node[] = data.steps.map((step: any) => ({
        id: step.id,
        type: 'stepNode',
        data: {
          label: step.label,
          role: step.role,
          isStart: step.isStart,
          isEnd: step.isEnd,
        },
        position: { x: 0, y: 0 },
      }));

      const initialEdges: Edge[] = data.transitions.map((transition: any, idx: number) => ({
        id: `e${transition.source}-${transition.target}`,
        source: transition.source,
        target: transition.target,
        label: transition.label,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 },
        labelStyle: { fill: '#1f2937' },
        labelBgStyle: { fill: '#ffffff' },
      }));

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        initialNodes,
        initialEdges
      );

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      setLoading(false);
    }, 300);
  }, [workflowId, setNodes, setEdges]);

  useEffect(() => {
    loadWorkflowData();
  }, [loadWorkflowData, refreshKey]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-gray-500">Loading workflow...</div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />
        <Controls className="bg-white border border-gray-200 rounded-lg" />
        <MiniMap
          className="bg-white border border-gray-200 rounded-lg"
          nodeColor="#3b82f6"
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  );
}
