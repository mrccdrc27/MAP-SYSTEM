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
} from 'reactflow';
import 'reactflow/dist/style.css';
import styles from '../workflow-page/create-workflow.module.css';
import StepNode from './StepNode';
import { useWorkflowAPI } from '../../../api/useWorkflowAPI';

const nodeTypes = {
  stepNode: StepNode,
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
  onStepClick, 
  onEdgeClick,
  onPaneClick,
  isEditingGraph,
  setHasUnsavedChanges,
  onHistoryChange,
}, ref) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const { getViewport } = useReactFlow();

  // History management for undo/redo
  const historyRef = useRef({
    past: [],
    present: null,
    future: [],
  });
  const isUndoRedoRef = useRef(false);

  const { updateWorkflowGraph } = useWorkflowAPI();

  // Save current state to history
  const saveToHistory = useCallback(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    
    const currentState = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    
    if (historyRef.current.present) {
      historyRef.current.past.push(historyRef.current.present);
      // Limit history to 50 items
      if (historyRef.current.past.length > 50) {
        historyRef.current.past.shift();
      }
    }
    historyRef.current.present = currentState;
    historyRef.current.future = []; // Clear redo stack on new change
    
    // Notify parent of history state
    if (onHistoryChange) {
      onHistoryChange(historyRef.current.past.length > 0, false);
    }
  }, [nodes, edges, onHistoryChange]);

  // Undo function
  const undo = useCallback(() => {
    if (historyRef.current.past.length === 0) return;
    
    isUndoRedoRef.current = true;
    
    const previous = historyRef.current.past.pop();
    if (historyRef.current.present) {
      historyRef.current.future.unshift(historyRef.current.present);
    }
    historyRef.current.present = previous;
    
    setNodes(previous.nodes);
    setEdges(previous.edges);
    
    if (onHistoryChange) {
      onHistoryChange(historyRef.current.past.length > 0, historyRef.current.future.length > 0);
    }
  }, [setNodes, setEdges, onHistoryChange]);

  // Redo function
  const redo = useCallback(() => {
    if (historyRef.current.future.length === 0) return;
    
    isUndoRedoRef.current = true;
    
    const next = historyRef.current.future.shift();
    if (historyRef.current.present) {
      historyRef.current.past.push(historyRef.current.present);
    }
    historyRef.current.present = next;
    
    setNodes(next.nodes);
    setEdges(next.edges);
    
    if (onHistoryChange) {
      onHistoryChange(historyRef.current.past.length > 0, historyRef.current.future.length > 0);
    }
  }, [setNodes, setEdges, onHistoryChange]);

  // Handle edge deletion
  const handleDeleteEdge = useCallback((edgeId) => {
    saveToHistory();
    setEdges((eds) =>
      eds.map((e) =>
        e.id === edgeId
          ? { ...e, data: { ...e.data, to_delete: true }, className: 'deleted-edge' }
          : e
      )
    );
    setUnsavedChanges(true);
  }, [setEdges, saveToHistory]);

  // Handle node deletion
  const handleDeleteNode = useCallback((nodeId) => {
    saveToHistory();
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, to_delete: true }, className: 'deleted-node' }
          : n
      )
    );
    setUnsavedChanges(true);
  }, [setNodes, saveToHistory]);

  // Handle adding a new node
  const handleAddNode = useCallback((label = 'New Step', role = 'Unassigned') => {
    saveToHistory();
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
      },
      type: 'stepNode',
      position: { x: centerX, y: centerY },
    };
    
    setNodes((nds) => [...nds, newNode]);
    setUnsavedChanges(true);
  }, [getViewport, setNodes, onStepClick, saveToHistory]);

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
      // Clear history after successful save - new baseline
      historyRef.current = {
        past: [],
        present: {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
        },
        future: [],
      };
      if (onHistoryChange) {
        onHistoryChange(false, false);
      }
      console.log('Workflow saved successfully');
    } catch (err) {
      console.error('Failed to save workflow:', err);
      throw err;
    }
  }, [nodes, edges, workflowId, updateWorkflowGraph, onHistoryChange]);

  useImperativeHandle(ref, () => ({
    handleAddNode,
    updateNodeData: (nodeId, newData) => {
      saveToHistory();
      setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n));
      setUnsavedChanges(true);
    },
    updateEdgeData: (edgeId, newData) => {
      saveToHistory();
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
    undo,
    redo,
    // Expose nodes and edges for validation
    getNodes: () => nodes,
    getEdges: () => edges,
  }), [setNodes, setEdges, handleDeleteEdge, handleDeleteNode, saveChanges, handleAddNode, saveToHistory, undo, redo, nodes, edges]);

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
          data: { ...edge, isReturn },
          type: 'smoothstep',
          animated: true,
          style: isReturn 
            ? { stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5,5' }
            : { stroke: '#3b82f6', strokeWidth: 2 },
          labelStyle: { fill: '#1f2937' },
          labelBgStyle: { fill: '#ffffff' },
          className: edge.to_delete ? 'deleted-edge' : '',
        };
      });

    setNodes(rnodes);
    setEdges(redges);
    
    // Initialize history with loaded state
    historyRef.current = {
      past: [],
      present: {
        nodes: JSON.parse(JSON.stringify(rnodes)),
        edges: JSON.parse(JSON.stringify(redges)),
      },
      future: [],
    };
    if (onHistoryChange) {
      onHistoryChange(false, false);
    }
  }, [workflowData, setNodes, setEdges, onStepClick, onHistoryChange]);

  // Handle edge connection with 6-handle system support
  const onConnect = useCallback(
    (connection) => {
      // Block new connections when not in edit mode
      if (!isEditingGraph) return;
      
      saveToHistory();
      
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
            data: { isReturn },
            type: 'smoothstep',
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
    [setEdges, setHasUnsavedChanges, saveToHistory, isEditingGraph]
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

  // Track if we're currently dragging to save history once at drag start
  const isDraggingRef = useRef(false);
  const shouldSaveHistoryRef = useRef(false);

  // Save to history when nodes/edges change after drag
  useEffect(() => {
    if (shouldSaveHistoryRef.current) {
      shouldSaveHistoryRef.current = false;
      // Use setTimeout to ensure state is fully updated
      setTimeout(() => {
        saveToHistory();
      }, 0);
    }
  }, [nodes, edges, saveToHistory]);

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
          // Track drag start
          if (!isDraggingRef.current && change.dragging) {
            isDraggingRef.current = true;
          }
          // Flag to save history when drag ends
          if (isDraggingRef.current && !change.dragging) {
            isDraggingRef.current = false;
            shouldSaveHistoryRef.current = true;
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
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        attributionPosition="bottom-left"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#d1d5db" />
        <Controls className="bg-white border border-gray-200 rounded-lg shadow-sm" />
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
