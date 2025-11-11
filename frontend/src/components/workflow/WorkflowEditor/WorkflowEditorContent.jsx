import React, { useState, useCallback, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import styles from './WorkflowEditorLayout.module.css';
import StepNode from './StepNode';
import { useWorkflowAPI } from '../../../api/useWorkflowAPI';

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

const WorkflowEditorContent = forwardRef(({ workflowId, onStepClick, onEdgeClick, onAddNode, onDeleteNode, onDeleteEdge, isEditingGraph, onToggleEditMode }, ref) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [workflowData, setWorkflowData] = useState(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const { getViewport } = useReactFlow();

  const { getWorkflowDetail, updateWorkflowGraph, loading } = useWorkflowAPI();

  // Handle edge deletion
  const handleDeleteEdge = useCallback((edgeId) => {
    setEdges((eds) =>
      eds.map((e) =>
        e.id === edgeId
          ? { ...e, data: { ...e.data, to_delete: true }, className: 'deleted-edge' }
          : e
      )
    );
    setUnsavedChanges(true);
    onDeleteEdge(edgeId);
  }, [setEdges, onDeleteEdge]);

  // Handle node deletion
  const handleDeleteNode = useCallback((nodeId) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, to_delete: true }, className: 'deleted-node' }
          : n
      )
    );
    setUnsavedChanges(true);
    onDeleteNode(nodeId);
  }, [setNodes, onDeleteNode]);

  // Handle adding a new node
  const handleAddNode = useCallback(() => {
    const viewport = getViewport();
    // Calculate approximate center position in flow coordinates
    const centerX = -viewport.x / viewport.zoom + 200; // Offset to place in visible area
    const centerY = -viewport.y / viewport.zoom + 100;
    
    const newNodeId = `temp-n${Date.now()}`;
    const newNode = {
      id: newNodeId,
      data: {
        label: 'New Step',
        role: 'User',
        description: '',
        instruction: '',
        onStepClick: () => onStepClick({
          id: newNodeId,
          name: 'New Step',
          role: 'User',
          description: '',
          instruction: '',
        }),
      },
      type: 'stepNode',
      position: { x: centerX, y: centerY },
    };
    
    setNodes((nds) => [...nds, newNode]);
    setUnsavedChanges(true);
    onAddNode(newNode);
  }, [getViewport, setNodes, onStepClick, onAddNode]);

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
          is_start: n.data.is_start || false,
          is_end: n.data.is_end || false,
        })),
        edges: edges.map((e) => {
          const parseNodeId = (id) => {
            if (String(id).startsWith('temp-')) {
              return id;
            }
            const parsed = parseInt(id);
            return isNaN(parsed) ? id : parsed;
          };

          return {
            id: e.id,
            from: parseNodeId(e.source),
            to: parseNodeId(e.target),
            name: e.label || '',
            design: {
              source_handle: e.sourceHandle,
              target_handle: e.targetHandle,
            },
            to_delete: e.data?.to_delete || false,
          };
        }),
      };

      await updateWorkflowGraph(workflowId, graphData);
      setUnsavedChanges(false);
      console.log('Workflow saved successfully');
    } catch (err) {
      console.error('Failed to save workflow:', err);
    }
  }, [nodes, edges, workflowId, updateWorkflowGraph]);

  useImperativeHandle(ref, () => ({
    handleAddNode,
    updateNodeData: (nodeId, newData) => {
      setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n));
    },
    updateEdgeData: (edgeId, newData) => {
      setEdges((eds) => eds.map((e) => e.id === edgeId ? { ...e, ...newData } : e));
    },
    deleteEdge: (edgeId) => {
      handleDeleteEdge(edgeId);
    },
    deleteNode: (nodeId) => {
      handleDeleteNode(nodeId);
    },
    setUnsavedChanges: (value) => {
      setUnsavedChanges(value);
    },
    saveChanges,
  }), [setNodes, setEdges, handleDeleteEdge, handleDeleteNode, saveChanges, handleAddNode]);

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
            is_start: node.is_start || false,
            is_end: node.is_end || false,
            id: node.id,
            onStepClick: () => onStepClick(node),
          },
          type: 'stepNode',
          position: {
            x: node.design?.x || 0,
            y: node.design?.y || 0,
          },
          targetPosition: 'top',
          sourcePosition: 'bottom',
          className: node.to_delete ? 'deleted-node' : '',
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
            className: edge.to_delete ? 'deleted-edge' : '',
          }));

        // Use the nodes as-is with their stored positions, no layout calculation needed
        setNodes(rnodes);
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
            sourceHandle: normalizeHandleName(connection.sourceHandle) || 'bottom',
            targetHandle: normalizeHandleName(connection.targetHandle) || 'top',
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

  // Handle node changes - intercept deletions to mark as to_delete instead
  const handleNodesChange = useCallback((changes) => {
    const filteredChanges = changes.filter((change) => {
      // If it's a remove action, don't let it happen
      if (change.type === 'remove') {
        // Instead, mark the node for deletion
        handleDeleteNode(change.id);
        return false;
      }
      // If it's a position change and not in edit mode, prevent it
      if (change.type === 'position' && !isEditingGraph) {
        return false;
      }
      // If it's a position change in edit mode, mark as unsaved
      if (change.type === 'position' && isEditingGraph) {
        setUnsavedChanges(true);
      }
      return true;
    });
    
    // Apply the filtered changes
    onNodesChange(filteredChanges);
  }, [onNodesChange, handleDeleteNode, isEditingGraph]);

  // Handle edge changes - intercept deletions to mark as to_delete instead
  const handleEdgesChange = useCallback((changes) => {
    const filteredChanges = changes.filter((change) => {
      // If it's a remove action, don't let it happen
      if (change.type === 'remove') {
        // Instead, mark the edge for deletion
        handleDeleteEdge(change.id);
        return false;
      }
      return true;
    });
    
    // Apply the filtered changes
    onEdgesChange(filteredChanges);
  }, [onEdgesChange, handleDeleteEdge]);

  return (
    <div className={styles.centerArea}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
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
  );
});

export default WorkflowEditorContent;