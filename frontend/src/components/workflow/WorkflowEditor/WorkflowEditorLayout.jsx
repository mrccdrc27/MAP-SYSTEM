import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import styles from './WorkflowEditorLayout.module.css';
import StepNode from './StepNode';
import WorkflowEditPanel from './WorkflowEditPanel';
import StepEditPanel from './StepEditPanel';
import TransitionEditPanel from './TransitionEditPanel';
import { useWorkflowAPI } from '../../../api/useWorkflowAPI';
import { useWorkflowRoles } from '../../../api/useWorkflowRoles';

const nodeWidth = 200;
const nodeHeight = 80;

const nodeTypes = {
  stepNode: StepNode,
};

// Helper function to convert handle names to lowercase
const normalizeHandleName = (handleName) => {
  if (!handleName) return 'bottom';
  return handleName.toLowerCase();
};

// Layout calculation
function getLayout(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'TB',
    nodesep: 150,
    ranksep: 120,
    marginx: 50,
    marginy: 50,
    align: 'UL',
  });

  nodes.forEach((n) =>
    g.setNode(n.id, { width: nodeWidth, height: nodeHeight })
  );
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: { x: pos.x - nodeWidth / 2, y: pos.y - nodeHeight / 2 },
      targetPosition: 'top',
      sourcePosition: 'bottom',
    };
  });
}

function WorkflowEditorContent({ workflowId, onStepClick, onEdgeClick }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [workflowData, setWorkflowData] = useState(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const { getWorkflowDetail, updateWorkflowGraph, loading } = useWorkflowAPI();

  // Load workflow data
  useEffect(() => {
    const loadWorkflow = async () => {
      try {
        const data = await getWorkflowDetail(workflowId);
        setWorkflowData(data);

        // Convert to ReactFlow format
        const rnodes = (data.graph?.nodes || []).map((node) => ({
          id: node.id.toString(),
          data: {
            label: node.name,
            role: node.role,
            description: node.description,
            instruction: node.instruction,
            id: node.id,
            onStepClick: () => onStepClick(node),
          },
          type: 'stepNode',
          position: { x: 0, y: 0 },
        }));

        // Filter out edges with null from/to and convert to ReactFlow format
        const redges = (data.graph?.edges || [])
          .filter((edge) => edge.from != null && edge.to != null) // Only include valid edges
          .map((edge) => ({
            id: edge.id.toString(),
            source: String(edge.from),
            target: String(edge.to),
            label: edge.name || '',
            markerEnd: { type: MarkerType.ArrowClosed },
            sourceHandle: normalizeHandleName(edge.design?.source_handle) || 'bottom',
            targetHandle: normalizeHandleName(edge.design?.target_handle) || 'top',
            data: edge,
          }));

        // Layout
        const layoutedNodes = getLayout(rnodes, redges);
        setNodes(layoutedNodes);
        setEdges(redges);
      } catch (err) {
        console.error('Failed to load workflow:', err);
      }
    };

    loadWorkflow();
  }, [workflowId, getWorkflowDetail, setNodes, setEdges, onStepClick]);

  // Handle edge connection
  const onConnect = useCallback(
    (connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            markerEnd: { type: MarkerType.ArrowClosed },
            id: `temp-e${Date.now()}`,
            label: 'New Transition',
            sourceHandle: normalizeHandleName(connection.sourceHandle),
            targetHandle: normalizeHandleName(connection.targetHandle),
          },
          eds
        )
      );
      setUnsavedChanges(true);
    },
    [setEdges]
  );

  // Handle edge click
  const onEdgeClickHandler = useCallback(
    (event, edge) => {
      event.stopPropagation();
      onEdgeClick({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        data: edge.data,
      });
    },
    [onEdgeClick]
  );

  // Save changes to backend
  const saveChanges = useCallback(async () => {
    try {
      const graphData = {
        nodes: nodes.map((n) => ({
          id: n.id,
          name: n.data.label,
          role: n.data.role,
          description: n.data.description || '',
          instruction: n.data.instruction || '',
          design: { x: n.position.x, y: n.position.y },
          to_delete: n.data.to_delete || false,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          from: parseInt(e.source),
          to: parseInt(e.target),
          name: e.label || '',
          design: {
            source_handle: e.sourceHandle,
            target_handle: e.targetHandle,
          },
          to_delete: e.data?.to_delete || false,
        })),
      };

      await updateWorkflowGraph(workflowId, graphData);
      setUnsavedChanges(false);
      console.log('Workflow saved successfully');
    } catch (err) {
      console.error('Failed to save workflow:', err);
    }
  }, [nodes, edges, workflowId, updateWorkflowGraph]);

  return (
    <>
      <div className={styles.flowContainer}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClickHandler}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      <div className={styles.actionBar}>
        <button
          className={styles.saveBtn}
          onClick={saveChanges}
          disabled={!unsavedChanges || loading}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </>
  );
}

export default function WorkflowEditorLayout({ workflowId }) {
  const [editingStep, setEditingStep] = useState(null);
  const [editingTransition, setEditingTransition] = useState(null);
  const [editingWorkflow, setEditingWorkflow] = useState(false);
  const [workflowData, setWorkflowData] = useState(null);

  const { getWorkflowDetail } = useWorkflowAPI();
  const { roles } = useWorkflowRoles();

  // Load workflow data for edit panel
  useEffect(() => {
    const loadWorkflow = async () => {
      try {
        const data = await getWorkflowDetail(workflowId);
        setWorkflowData(data);
      } catch (err) {
        console.error('Failed to load workflow:', err);
      }
    };

    loadWorkflow();
  }, [workflowId, getWorkflowDetail]);

  // Handle step click
  const onStepClick = useCallback((stepData) => {
    setEditingStep(stepData);
    setEditingTransition(null);
    setEditingWorkflow(false);
  }, []);

  // Handle edge click
  const onEdgeClick = useCallback((edgeData) => {
    setEditingTransition(edgeData);
    setEditingStep(null);
    setEditingWorkflow(false);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.editorWrapper}>
        <WorkflowEditorContent
          workflowId={workflowId}
          onStepClick={onStepClick}
          onEdgeClick={onEdgeClick}
        />

        <div className={styles.panelContainer}>
          {editingWorkflow && workflowData && (
            <WorkflowEditPanel
              workflow={workflowData.workflow}
              onClose={() => setEditingWorkflow(false)}
              onSave={(updated) => {
                setWorkflowData({ ...workflowData, workflow: updated });
                setEditingWorkflow(false);
              }}
            />
          )}

          {editingStep && (
            <StepEditPanel
              step={editingStep}
              roles={roles}
              onClose={() => setEditingStep(null)}
              onSave={(updated) => {
                setEditingStep(null);
              }}
            />
          )}

          {editingTransition && (
            <TransitionEditPanel
              transition={editingTransition}
              onClose={() => setEditingTransition(null)}
              onSave={(updated) => {
                setEditingTransition(null);
              }}
            />
          )}

          {!editingStep && !editingTransition && !editingWorkflow && (
            <div className={styles.emptyPanel}>
              <p>Click on a step or transition to edit</p>
              <button
                className={styles.editWorkflowBtn}
                onClick={() => setEditingWorkflow(true)}
              >
                Edit Workflow Details
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
