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
  }), [setNodes, setEdges, handleDeleteEdge, handleDeleteNode, saveChanges]);

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

export default function WorkflowEditorLayout({ workflowId }) {
  const [editingStep, setEditingStep] = useState(null);
  const [editingTransition, setEditingTransition] = useState(null);
  const [workflowData, setWorkflowData] = useState(null);
  const [isEditingGraph, setIsEditingGraph] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState('steps');
  const [activeTopTab, setActiveTopTab] = useState('manage');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedPopup, setShowUnsavedPopup] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('workflow-sidebar-width');
    return saved ? parseInt(saved, 10) : 280;
  });
  const [saveStatus, setSaveStatus] = useState(null); // null, 'saving', 'success', 'error'
  const [isResizing, setIsResizing] = useState(false);

  const contentRef = useRef();
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const { getWorkflowDetail } = useWorkflowAPI();
  const { roles } = useWorkflowRoles();

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

  // Handle mouse down on resize handle
  const handleResizeStart = useCallback((e) => {
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  // Handle mouse move for resizing
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      const diff = e.clientX - startXRef.current;
      const newWidth = Math.max(200, Math.min(500, startWidthRef.current + diff)); // Min 200px, max 500px
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        // Save the width to localStorage
        localStorage.setItem('workflow-sidebar-width', sidebarWidth.toString());
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, sidebarWidth]);

  const onStepClick = useCallback((stepData) => {
    setEditingStep(stepData);
    setEditingTransition(null);
    setActiveSidebarTab('steps');
  }, []);

  const onEdgeClick = useCallback((edgeData) => {
    setEditingTransition(edgeData);
    setEditingStep(null);
    setActiveSidebarTab('transitions');
  }, []);

  const onAddNode = useCallback((newNode) => {
    setEditingStep({
      id: newNode.id,
      name: 'New Step',
      role: 'User',
      description: '',
      instruction: '',
    });
    setActiveSidebarTab('steps');
    setHasUnsavedChanges(true);
  }, []);

  const onDeleteNode = useCallback(() => {
    setEditingStep(null);
    setHasUnsavedChanges(true);
  }, []);

  const onDeleteEdge = useCallback(() => {
    setEditingTransition(null);
    setHasUnsavedChanges(true);
  }, []);

  const handleSaveAll = useCallback(async () => {
    setSaveStatus('saving');
    try {
      if (contentRef.current?.saveChanges) {
        await contentRef.current.saveChanges();
        setHasUnsavedChanges(false);
        setShowUnsavedPopup(false);
        setSaveStatus('success');
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => {
          setSaveStatus(null);
        }, 3000);
      }
    } catch (err) {
      console.error('Failed to save:', err);
      setSaveStatus('error');
      setTimeout(() => {
        setSaveStatus(null);
      }, 3000);
    }
  }, []);

  const handleAddStep = useCallback(() => {
    contentRef.current?.handleAddNode?.();
  }, []);

  if (!workflowData) {
    return <div className={styles.centerText}>Loading workflow...</div>;
  }

  return (
    <div className={styles.wrapper}>
      {/* SAVE STATUS TOAST */}
      {saveStatus && (
        <div className={`${styles.saveToast} ${styles[`saveToast${saveStatus.charAt(0).toUpperCase() + saveStatus.slice(1)}`]}`}>
          <span className={styles.toastIcon}>
            {saveStatus === 'saving' && '⏳'}
            {saveStatus === 'success' && '✅'}
            {saveStatus === 'error' && '❌'}
          </span>
          <span className={styles.toastText}>
            {saveStatus === 'saving' && 'Saving changes...'}
            {saveStatus === 'success' && 'Workflow saved successfully!'}
            {saveStatus === 'error' && 'Failed to save workflow'}
          </span>
        </div>
      )}

      {/* UNSAVED CHANGES POPUP */}
      {showUnsavedPopup && hasUnsavedChanges && (
        <div className={styles.unsavedPopup}>
          <div className={styles.popupContent}>
            <p className={styles.popupText}>⚠️ You have unsaved changes</p>
            <div className={styles.popupActions}>
              <button
                onClick={() => setShowUnsavedPopup(false)}
                className={styles.popupBtnCancel}
              >
                Dismiss
              </button>
              <button
                onClick={handleSaveAll}
                className={styles.popupBtnSave}
              >
                Save Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP RIBBON */}
      <div className={styles.topRibbon}>
        <div className={styles.ribbonLeft}>
          <h2 className={styles.workflowTitle}>{workflowData.workflow?.name}</h2>
          <span className={styles.workflowMeta}>
            {workflowData.workflow?.category && `${workflowData.workflow.category}`}
            {workflowData.workflow?.category && workflowData.workflow?.sub_category && ' • '}
            {workflowData.workflow?.sub_category && `${workflowData.workflow.sub_category}`}
          </span>
        </div>

        <nav className={styles.ribbonTabs}>
          <button
            onClick={() => setActiveTopTab('manage')}
            className={activeTopTab === 'manage' ? styles.ribbonTabActive : styles.ribbonTab}
          >
            Manage
          </button>
          <button
            onClick={() => setActiveTopTab('details')}
            className={activeTopTab === 'details' ? styles.ribbonTabActive : styles.ribbonTab}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTopTab('edit')}
            className={activeTopTab === 'edit' ? styles.ribbonTabActive : styles.ribbonTab}
          >
            Edit
          </button>
        </nav>

        <div className={styles.ribbonRight}>
          <button
            className={`${styles.modeToggle} ${isEditingGraph ? styles.modeActive : ''}`}
            onClick={() => setIsEditingGraph(!isEditingGraph)}
          >
            {isEditingGraph ? '🔓 Editing' : '🔒 Locked'}
          </button>
        </div>
      </div>

      {/* MANAGE TAB */}
      {activeTopTab === 'manage' && (
        <div className={styles.editorContainer}>
          {/* LEFT PANEL - RESIZABLE */}
          <aside className={styles.leftPanel} style={{ width: `${sidebarWidth}px` }}>
            <nav className={styles.panelTabs}>
              <button
                onClick={() => setActiveSidebarTab('steps')}
                className={activeSidebarTab === 'steps' ? styles.panelTabActive : styles.panelTab}
              >
                <span className={styles.tabIcon}>📋</span>
                Steps
              </button>
              <button
                onClick={() => setActiveSidebarTab('transitions')}
                className={activeSidebarTab === 'transitions' ? styles.panelTabActive : styles.panelTab}
              >
                <span className={styles.tabIcon}>🔀</span>
                Transitions
              </button>
            </nav>

            <div className={styles.panelContent}>
              {activeSidebarTab === 'steps' && (
                <>
                  {editingStep && (
                    <StepEditPanel
                      step={editingStep}
                      roles={roles}
                      onClose={() => setEditingStep(null)}
                      onSave={(updated) => {
                        if (String(editingStep.id).startsWith('temp-')) {
                          contentRef.current?.updateNodeData(editingStep.id, {
                            label: updated.name,
                            role: updated.role,
                            description: updated.description,
                            instruction: updated.instruction,
                            is_start: updated.is_start,
                            is_end: updated.is_end,
                          });
                        }
                        setHasUnsavedChanges(true);
                        setEditingStep(null);
                      }}
                      onDelete={() => {
                        contentRef.current?.deleteNode(editingStep.id);
                        setHasUnsavedChanges(true);
                        setEditingStep(null);
                      }}
                    />
                  )}
                  {!editingStep && (
                    <div className={styles.emptyState}>
                      <p>📋 Select a step to edit</p>
                    </div>
                  )}
                </>
              )}

              {activeSidebarTab === 'transitions' && (
                <>
                  {editingTransition && (
                    <TransitionEditPanel
                      transition={editingTransition}
                      onClose={() => setEditingTransition(null)}
                      onSave={(updated) => {
                        contentRef.current?.updateEdgeData(editingTransition.id, { label: updated.label });
                        setHasUnsavedChanges(true);
                        setEditingTransition(null);
                      }}
                      onDelete={() => {
                        contentRef.current?.deleteEdge(editingTransition.id);
                        setHasUnsavedChanges(true);
                        setEditingTransition(null);
                      }}
                    />
                  )}
                  {!editingTransition && (
                    <div className={styles.emptyState}>
                      <p>🔀 Select a transition to edit</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* RESIZE HANDLE */}
            <div
              className={`${styles.resizeHandle} ${isResizing ? styles.resizing : ''}`}
              onMouseDown={handleResizeStart}
              title="Drag to resize panel"
            />
          </aside>

          {/* CENTER GRAPH */}
          <main className={styles.centerArea}>
            <ReactFlowProvider>
              <WorkflowEditorContent
                ref={contentRef}
                workflowId={workflowId}
                onStepClick={onStepClick}
                onEdgeClick={onEdgeClick}
                onAddNode={onAddNode}
                onDeleteNode={onDeleteNode}
                onDeleteEdge={onDeleteEdge}
                isEditingGraph={isEditingGraph}
                onToggleEditMode={() => setIsEditingGraph(!isEditingGraph)}
              />
            </ReactFlowProvider>
          </main>

          {/* RIGHT TOOLBAR */}
          <aside className={styles.rightToolbar}>
            <div className={styles.toolbarSection}>
              <h4 className={styles.toolbarTitle}>Add</h4>
              <button 
                className={styles.actionBtn}
                onClick={handleAddStep}
                title="Add a new step to the workflow"
              >
                <span className={styles.btnIcon}>➕</span>
                <span className={styles.btnText}>Step</span>
              </button>
            </div>

            <div className={styles.toolbarSection}>
              <h4 className={styles.toolbarTitle}>Actions</h4>
              <button 
                className={`${styles.actionBtn} ${styles.actionBtnPrimary} ${hasUnsavedChanges ? styles.actionBtnUnsaved : ''}`}
                onClick={() => {
                  if (hasUnsavedChanges) {
                    setShowUnsavedPopup(true);
                  }
                  handleSaveAll();
                }}
                title={hasUnsavedChanges ? 'You have unsaved changes - click to save' : 'All changes saved'}
                disabled={saveStatus === 'saving'}
              >
                <span className={styles.btnIcon}>{hasUnsavedChanges ? '⚠️' : '✅'}</span>
                <span className={styles.btnText}>Save</span>
              </button>
            </div>

            <div className={styles.toolbarSection}>
              <h4 className={styles.toolbarTitle}>Info</h4>
              <div className={styles.infoBox}>
                <p className={styles.infoLabel}>Steps</p>
                <p className={styles.infoValue}>{workflowData.graph?.nodes?.length || 0}</p>
              </div>
              <div className={styles.infoBox}>
                <p className={styles.infoLabel}>Transitions</p>
                <p className={styles.infoValue}>{workflowData.graph?.edges?.length || 0}</p>
              </div>
              {hasUnsavedChanges && (
                <div className={styles.infoBox} style={{ borderColor: 'var(--color-warning)', backgroundColor: 'var(--color-warning-light)' }}>
                  <p className={styles.infoLabel} style={{ color: 'var(--color-warning)' }}>Status</p>
                  <p className={styles.infoValue} style={{ color: 'var(--color-warning)' }}>Unsaved</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* DETAILS TAB */}
      {activeTopTab === 'details' && (
        <div className={styles.detailsContainer}>
          <WorkflowEditPanel workflow={workflowData.workflow} readOnly={true} />
        </div>
      )}

      {/* EDIT TAB */}
      {activeTopTab === 'edit' && (
        <div className={styles.editContainer}>
          <WorkflowEditPanel
            workflow={workflowData.workflow}
            onSave={(updated) => {
              setWorkflowData({ ...workflowData, workflow: updated });
            }}
            readOnly={false}
          />
        </div>
      )}
    </div>
  );
}
