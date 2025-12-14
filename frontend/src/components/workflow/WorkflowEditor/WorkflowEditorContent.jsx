import React, { useState, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  useReactFlow,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './WorkflowEditorLayout.module.css';
import StepNode from './StepNode';
import { useWorkflowAPI } from '../../../api/useWorkflowAPI';

const nodeTypes = {
  stepNode: StepNode,
};

// Helper function to convert handle names to lowercase
const normalizeHandleName = (handleName) => {
  if (!handleName) return 'bottom';
  return handleName.toLowerCase();
};

const WorkflowEditorContent = forwardRef(({ 
  workflowId, 
  workflowData,
  onStepClick, 
  onEdgeClick,
  onPaneClick,
  isEditingGraph,
  setHasUnsavedChanges,
}, ref) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const { getViewport } = useReactFlow();

  const { updateWorkflowGraph } = useWorkflowAPI();

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
  }, [setEdges]);

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
  }, [setNodes]);

  // Handle adding a new node
  const handleAddNode = useCallback((label = 'New Step') => {
    const viewport = getViewport();
    const centerX = -viewport.x / viewport.zoom + 200;
    const centerY = -viewport.y / viewport.zoom + 100;
    
    const newNodeId = `temp-n${Date.now()}`;
    const newNode = {
      id: newNodeId,
      data: {
        label: label,
        role: 'Unassigned',
        description: '',
        instruction: '',
        is_start: false,
        is_end: false,
        id: newNodeId,
        onStepClick: () => onStepClick({
          id: newNodeId,
          name: label,
          role: 'Unassigned',
          description: '',
          instruction: '',
          is_start: false,
          is_end: false,
        }),
      },
      type: 'stepNode',
      position: { x: centerX, y: centerY },
    };
    
    setNodes((nds) => [...nds, newNode]);
    setUnsavedChanges(true);
  }, [getViewport, setNodes, onStepClick]);

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
      throw err;
    }
  }, [nodes, edges, workflowId, updateWorkflowGraph]);

  useImperativeHandle(ref, () => ({
    handleAddNode,
    updateNodeData: (nodeId, newData) => {
      setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n));
      setUnsavedChanges(true);
    },
    updateEdgeData: (edgeId, newData) => {
      setEdges((eds) => eds.map((e) => e.id === edgeId ? { ...e, ...newData } : e));
      setUnsavedChanges(true);
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

  // Convert workflow data to ReactFlow format
  useEffect(() => {
    if (!workflowData?.graph) return;

    const rnodes = (workflowData.graph?.nodes || []).map((node) => ({
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

    const redges = (workflowData.graph?.edges || [])
      .filter((edge) => edge.from != null && edge.to != null)
      .map((edge) => ({
        id: edge.id.toString(),
        source: String(edge.from),
        target: String(edge.to),
        label: edge.name || '',
        markerEnd: { type: MarkerType.ArrowClosed },
        sourceHandle: normalizeHandleName(edge.design?.source_handle) || 'bottom',
        targetHandle: normalizeHandleName(edge.design?.target_handle) || 'top',
        data: edge,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 },
        labelStyle: { fill: '#1f2937' },
        labelBgStyle: { fill: '#ffffff' },
        className: edge.to_delete ? 'deleted-edge' : '',
      }));

    setNodes(rnodes);
    setEdges(redges);
  }, [workflowData, setNodes, setEdges, onStepClick]);

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
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#3b82f6', strokeWidth: 2 },
          },
          eds
        )
      );
      setUnsavedChanges(true);
      if (setHasUnsavedChanges) setHasUnsavedChanges(true);
    },
    [setEdges, setHasUnsavedChanges]
  );

  // Handle node click
  const onNodeClickHandler = useCallback(
    (event, node) => {
      event.stopPropagation();
      onStepClick({
        id: node.id,
        name: node.data.label,
        role: node.data.role,
        description: node.data.description,
        instruction: node.data.instruction,
        is_start: node.data.is_start,
        is_end: node.data.is_end,
      });
    },
    [onStepClick]
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

  // Handle pane click
  const onPaneClickHandler = useCallback(() => {
    if (onPaneClick) onPaneClick();
  }, [onPaneClick]);

  // Handle node changes - intercept deletions to mark as to_delete instead
  const handleNodesChange = useCallback((changes) => {
    let hasActualPositionChange = false;
    const filteredChanges = changes.filter((change) => {
      if (change.type === 'remove') {
        handleDeleteNode(change.id);
        return false;
      }
      if (change.type === 'position' && !isEditingGraph) {
        return false;
      }
      if (change.type === 'position' && isEditingGraph) {
        const currentNode = nodes.find(n => n.id === change.id);
        if (currentNode && change.position && (currentNode.position.x !== change.position.x || currentNode.position.y !== change.position.y)) {
          hasActualPositionChange = true;
        }
      }
      return true;
    });
    
    onNodesChange(filteredChanges);

    if (hasActualPositionChange) {
      setUnsavedChanges(true);
      if (setHasUnsavedChanges) setHasUnsavedChanges(true);
    }
  }, [onNodesChange, handleDeleteNode, isEditingGraph, nodes, setHasUnsavedChanges]);

  // Handle edge changes
  const handleEdgesChange = useCallback((changes) => {
    const filteredChanges = changes.filter((change) => {
      if (change.type === 'remove') {
        handleDeleteEdge(change.id);
        return false;
      }
      return true;
    });
    
    onEdgesChange(filteredChanges);
  }, [onEdgesChange, handleDeleteEdge]);

  return (
    <div className={styles.canvasWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClickHandler}
        onEdgeClick={onEdgeClickHandler}
        onPaneClick={onPaneClickHandler}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
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

      {/* Unsaved Changes Indicator */}
      {unsavedChanges && (
        <div className="absolute top-4 right-4 bg-yellow-100 border border-yellow-300 rounded-lg px-3 py-2 text-sm text-yellow-800">
          Unsaved Changes
        </div>
      )}
    </div>
  );
});

export default WorkflowEditorContent;
