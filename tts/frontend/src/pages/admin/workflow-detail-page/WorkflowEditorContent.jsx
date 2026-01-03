import React, { useState, useCallback, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  useReactFlow,
  BackgroundVariant,
  Panel,
} from 'reactflow';
import { Plus, Save, RefreshCw } from 'lucide-react';
import 'reactflow/dist/style.css';
import styles from '../workflow-page/create-workflow.module.css';
import StepNode from './StepNode';
import EditableEdge from './EditableEdge';
import { useWorkflowAPI } from '../../../api/useWorkflowAPI';

const nodeTypes = {
  stepNode: StepNode,
};

const edgeTypes = {
  editableEdge: EditableEdge,
};

/**
 * Normalizes handle names to the 6-handle system format
 * Maps legacy handle names to new IDs:
 * - top/Top/TOP -> in-T
 * - bottom/Bottom/BOTTOM -> out-B
 * - left/Left/LEFT -> in-L (target) or out-L (source)
 * - right/Right/RIGHT -> out-R (source) or in-R (target)
 */
const normalizeHandleName = (handleName, handleType = 'source') => {
  if (!handleName) {
    // Default based on handle type
    return handleType === 'source' ? 'out-B' : 'in-T';
  }
  
  const lowerName = handleName.toLowerCase();
  
  // Already using new format
  if (lowerName.startsWith('in-') || lowerName.startsWith('out-')) {
    return handleName;
  }
  
  // Map legacy names to new 6-handle system
  switch (lowerName) {
    case 'top':
      return 'in-T';
    case 'bottom':
      return 'out-B';
    case 'left':
      return handleType === 'source' ? 'out-L' : 'in-L';
    case 'right':
      return handleType === 'source' ? 'out-R' : 'in-R';
    default:
      return handleType === 'source' ? 'out-B' : 'in-T';
  }
};

const WorkflowEditorContent = forwardRef(({ 
  workflowId, 
  workflowData,
  roles = [],
  onStepClick, 
  onEdgeClick,
  onPaneClick,
  isEditingGraph,
  setHasUnsavedChanges,
  onToggleEditing,
  onSave,
  onAddStep,
  isSaving = false,
  hasUnsavedChanges = false,
}, ref) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const { getViewport } = useReactFlow();

  // Ref to store handlers and roles to avoid stale closures in node data
  const handlersRef = useRef({
    onUpdateStep: null,
    onDeleteStep: null,
    availableRoles: roles,
  });

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
    if (setHasUnsavedChanges) setHasUnsavedChanges(true);
  }, [setEdges, setHasUnsavedChanges]);

  // Handle edge label change from inline editing
  const handleEdgeLabelChange = useCallback((edgeId, newLabel) => {
    setEdges((eds) =>
      eds.map((e) =>
        e.id === edgeId
          ? { ...e, label: newLabel }
          : e
      )
    );
    setUnsavedChanges(true);
    if (setHasUnsavedChanges) setHasUnsavedChanges(true);
  }, [setEdges, setHasUnsavedChanges]);

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

  // Handle inline node update from expanded node form
  const handleInlineNodeUpdate = useCallback((nodeId, updates) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id !== nodeId) return n;
      return {
        ...n,
        data: {
          ...n.data,
          label: updates.label || updates.name,
          role: updates.role,
          description: updates.description,
          instruction: updates.instruction,
          is_start: updates.is_start,
          is_end: updates.is_end,
        }
      };
    }));
    setUnsavedChanges(true);
  }, [setNodes]);

  // Handle adding a new node
  const handleAddNode = useCallback((label = 'New Step', role = 'Unassigned') => {
    const viewport = getViewport();
    const centerX = -viewport.x / viewport.zoom + 200;
    const centerY = -viewport.y / viewport.zoom + 100;
    
    const newNodeId = `temp-n${Date.now()}`;
    const newNode = {
      id: newNodeId,
      data: {
        label: label,
        role: role,
        description: '',
        instruction: '',
        is_start: false,
        is_end: false,
        id: newNodeId,
        onStepClick: () => onStepClick({
          id: newNodeId,
          name: label,
          role: role,
          description: '',
          instruction: '',
          is_start: false,
          is_end: false,
        }),
        // Use wrapper functions that access ref to avoid stale closures
        onUpdateStep: (nodeId, updates) => handlersRef.current.onUpdateStep(nodeId, updates),
        onDeleteStep: (nodeId) => handlersRef.current.onDeleteStep(nodeId),
        get availableRoles() { return handlersRef.current.availableRoles; },
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
    // Expose nodes and edges for validation
    getNodes: () => nodes,
    getEdges: () => edges,
  }), [setNodes, setEdges, handleDeleteEdge, handleDeleteNode, saveChanges, handleAddNode, nodes, edges]);

  // Update the handlers ref when handlers/roles change
  useEffect(() => {
    handlersRef.current = {
      onUpdateStep: handleInlineNodeUpdate,
      onDeleteStep: handleDeleteNode,
      availableRoles: roles,
    };
  }, [handleInlineNodeUpdate, handleDeleteNode, roles]);

  // Update edges when isEditingGraph changes to pass the updated prop
  useEffect(() => {
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        data: {
          ...e.data,
          isEditingGraph,
          onLabelChange: handleEdgeLabelChange,
          onDelete: handleDeleteEdge,
        },
      }))
    );
  }, [isEditingGraph, setEdges, handleEdgeLabelChange, handleDeleteEdge]);

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
        // Use wrapper functions that access ref to avoid stale closures
        onUpdateStep: (nodeId, updates) => handlersRef.current.onUpdateStep(nodeId, updates),
        onDeleteStep: (nodeId) => handlersRef.current.onDeleteStep(nodeId),
        get availableRoles() { return handlersRef.current.availableRoles; },
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
      .map((edge) => {
        const sourceHandle = normalizeHandleName(edge.design?.source_handle, 'source');
        const targetHandle = normalizeHandleName(edge.design?.target_handle, 'target');
        // Detect return edges (going backwards) for styling
        const isReturn = (sourceHandle === 'out-L' && targetHandle === 'in-R');
        
        return {
          id: edge.id.toString(),
          source: String(edge.from),
          target: String(edge.to),
          label: edge.name || '',
          markerEnd: { type: MarkerType.ArrowClosed },
          sourceHandle,
          targetHandle,
          data: { 
            ...edge, 
            isReturn, 
            isEditingGraph,
            onLabelChange: handleEdgeLabelChange,
            onDelete: handleDeleteEdge,
          },
          type: 'editableEdge',
          animated: true,
          style: isReturn 
            ? { stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5,5' }
            : { stroke: '#3b82f6', strokeWidth: 2 },
          className: edge.to_delete ? 'deleted-edge' : '',
        };
      });

    setNodes(rnodes);
    setEdges(redges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowData, setNodes, setEdges, onStepClick]);

  // Handle edge connection with 6-handle system support
  const onConnect = useCallback(
    (connection) => {
      // Block new connections when not in edit mode
      if (!isEditingGraph) return;
      
      const sourceHandle = normalizeHandleName(connection.sourceHandle, 'source');
      const targetHandle = normalizeHandleName(connection.targetHandle, 'target');
      // Detect return transitions for visual styling
      const isReturn = (sourceHandle === 'out-L' && targetHandle === 'in-R');
      
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            markerEnd: { type: MarkerType.ArrowClosed },
            id: `temp-e${Date.now()}`,
            label: 'New Transition',
            sourceHandle,
            targetHandle,
            data: { 
              isReturn, 
              isEditingGraph,
              onLabelChange: handleEdgeLabelChange,
              onDelete: handleDeleteEdge,
            },
            type: 'editableEdge',
            animated: true,
            style: isReturn 
              ? { stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5,5' }
              : { stroke: '#3b82f6', strokeWidth: 2 },
          },
          eds
        )
      );
      setUnsavedChanges(true);
      if (setHasUnsavedChanges) setHasUnsavedChanges(true);
    },
    [setEdges, setHasUnsavedChanges, isEditingGraph]
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

  // Track if we're currently dragging
  const isDraggingRef = useRef(false);

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
          // Track drag start/end
          if (!isDraggingRef.current && change.dragging) {
            isDraggingRef.current = true;
          }
          if (isDraggingRef.current && !change.dragging) {
            isDraggingRef.current = false;
          }
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
        edgeTypes={edgeTypes}
        nodesDraggable={isEditingGraph}
        nodesConnectable={isEditingGraph}
        elementsSelectable={true}
        deleteKeyCode={null}
        selectionKeyCode={null}
        multiSelectionKeyCode={null}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        attributionPosition="bottom-left"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#d1d5db" />
        <Controls className="bg-white border border-gray-200 rounded-lg shadow-sm" />
        
        {/* Top-left action bar panel */}
        <Panel position="top-left" className={styles.actionPanel}>
          {/* Lock/Unlock Toggle Button */}
          {onToggleEditing && (
            <button
              onClick={onToggleEditing}
              className={`${styles.actionBtn} ${isEditingGraph ? styles.actionBtnEditing : styles.actionBtnLocked}`}
              title={isEditingGraph ? 'Click to lock (view only)' : 'Click to unlock (enable editing)'}
            >
              {isEditingGraph ? '🔓 Editing' : '🔒 Locked'}
            </button>
          )}
          
          {/* Add Step Button - only when editing */}
          {isEditingGraph && onAddStep && (
            <button
              onClick={onAddStep}
              className={styles.actionBtnAdd}
              title="Add new step"
            >
              <Plus size={14} /> Add Step
            </button>
          )}
          
          {/* Save Button - always visible when editing, disabled when no changes */}
          {isEditingGraph && onSave && (
            <button
              onClick={onSave}
              disabled={isSaving || !hasUnsavedChanges}
              className={styles.actionBtnSave}
              title={hasUnsavedChanges ? "Save changes" : "No changes to save"}
            >
              {isSaving ? (
                <RefreshCw size={14} className={styles.spinner} />
              ) : (
                <Save size={14} />
              )}
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          )}
        </Panel>
      </ReactFlow>
      
      {/* Helper text */}
      <div className="absolute bottom-4 left-4 bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-xs text-gray-600 max-w-xs">
        {isEditingGraph ? (
          <p><strong>Edit Mode:</strong> Drag nodes to reposition, connect handles to create transitions.</p>
        ) : (
          <p><strong>View Mode:</strong> Click nodes/edges to view details. Switch to Edit Mode to make changes.</p>
        )}
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
