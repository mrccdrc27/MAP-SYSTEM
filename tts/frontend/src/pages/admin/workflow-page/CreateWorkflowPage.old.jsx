import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, { ReactFlowProvider, useNodesState, useEdgesState, Background, Controls, addEdge } from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './create-workflow.module.css';
import WorkflowCreationConfirmation from './modals/WorkflowCreationConfirmation';
import AdminNav from '../../../components/navigation/AdminNav';
import { useCreateWorkflow } from '../../../api/useCreateWorkflow';
import { useWorkflowRoles } from '../../../api/useWorkflowRoles';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import StepNode from '../../../components/workflow/WorkflowEditor/StepNode';
import { v4 as uuidv4 } from 'uuid';

const nodeTypes = {
  step: StepNode,
};

export default function CreateWorkflowPage() {
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const [workflowMetadata, setWorkflowMetadata] = useState({
    name: '',
    description: '',
    category: '',
    sub_category: '',
    department: '',
    end_logic: '',
    low_sla: null,
    medium_sla: null,
    high_sla: null,
    urgent_sla: null,
  });

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [createdWorkflow, setCreatedWorkflow] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [editingNode, setEditingNode] = useState(null);

  const contentRef = useRef();
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const { createWorkflow, loading: isCreating, error: createError } = useCreateWorkflow();
  const { roles } = useWorkflowRoles();

  // Handle mouse down on resize handle
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  // Handle mouse move for resize
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.max(200, Math.min(500, startWidthRef.current + delta));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
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

  // Add a new node to the graph
  const handleAddNode = useCallback(() => {
    if (!roles || roles.length === 0) {
      alert('No roles available. Please contact an administrator to configure roles.');
      return;
    }
    
    const tempId = `temp-${uuidv4()}`;
    const newNode = {
      id: tempId,
      data: {
        label: `Step ${nodes.length + 1}`,
        role: roles[0].name,
        description: '',
        instruction: '',
        is_start: nodes.length === 0,
        is_end: false,
      },
      position: {
        x: (nodes.length % 3) * 250,
        y: Math.floor(nodes.length / 3) * 200,
      },
      type: 'step',
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes.length, setNodes, roles]);

  // Handle node click
  const handleNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setEditingNode(node);
  }, []);

  // Update selected node
  const handleUpdateNode = useCallback((field, value) => {
    if (!editingNode) return;
    
    // If setting is_start to true, ensure no other node has is_start
    if (field === 'is_start' && value === true) {
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: {
            ...n.data,
            is_start: n.id === editingNode.id ? true : false,
          },
        }))
      );
      setEditingNode({
        ...editingNode,
        data: {
          ...editingNode.data,
          is_start: true,
        },
      });
      return;
    }
    
    const updated = {
      ...editingNode,
      data: {
        ...editingNode.data,
        [field]: value,
      },
    };
    setEditingNode(updated);
    setNodes((nds) =>
      nds.map((n) => (n.id === editingNode.id ? updated : n))
    );
  }, [editingNode, setNodes]);

  // Delete selected node
  const handleDeleteNode = useCallback(() => {
    if (!editingNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== editingNode.id));
    setEdges((eds) =>
      eds.filter((e) => e.source !== editingNode.id && e.target !== editingNode.id)
    );
    setEditingNode(null);
  }, [editingNode, setNodes, setEdges]);

  // Handle connecting edges (transitions)
  const onConnect = useCallback((connection) => {
    const edgeId = `temp-${uuidv4()}`;
    const newEdge = {
      ...connection,
      id: edgeId,
    };
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges]);

  // Validate form data
  const validateWorkflowData = () => {
    const errors = [];

    if (!workflowMetadata.name.trim()) errors.push('Workflow name is required');
    if (!workflowMetadata.category.trim()) errors.push('Category is required');
    if (!workflowMetadata.sub_category.trim()) errors.push('Sub-category is required');
    if (!workflowMetadata.department.trim()) errors.push('Department is required');

    // Validate nodes have exactly one start node if there are any nodes
    if (nodes.length > 0) {
      const startNodes = nodes.filter((n) => n.data?.is_start);
      if (startNodes.length !== 1) {
        errors.push('Workflow must have exactly one start step');
      }
    }

    return errors;
  };

  // Handle workflow creation
  const handleCreateWorkflow = async () => {
    const validationErrors = validateWorkflowData();

    if (validationErrors.length > 0) {
      alert('Please fix the following issues:\n' + validationErrors.join('\n'));
      return;
    }

    try {
      // Transform nodes to workflow steps format
      const graphNodes = nodes.map((node) => ({
        id: node.id,
        name: node.data?.label || node.id,
        role: node.data?.role || 'User',
        description: node.data?.description || '',
        instruction: node.data?.instruction || '',
        design: {
          x: node.position?.x || 0,
          y: node.position?.y || 0,
        },
        is_start: node.data?.is_start || false,
        is_end: node.data?.is_end || false,
      }));

      // Transform edges to transitions format
      // Ensure edge IDs have temp- prefix for new edges
      const graphEdges = edges.map((edge) => {
        let edgeId = edge.id;
        // If edge ID doesn't start with 'temp-' and isn't a number, add prefix
        if (!String(edgeId).startsWith('temp-') && isNaN(parseInt(edgeId))) {
          edgeId = `temp-${edgeId}`;
        }
        return {
          id: edgeId,
          from: edge.source,
          to: edge.target,
          name: edge.data?.label || '',
        };
      });

      // Clean up workflow metadata - remove null SLA values
      const cleanedMetadata = { ...workflowMetadata };
      if (!cleanedMetadata.low_sla) delete cleanedMetadata.low_sla;
      if (!cleanedMetadata.medium_sla) delete cleanedMetadata.medium_sla;
      if (!cleanedMetadata.high_sla) delete cleanedMetadata.high_sla;
      if (!cleanedMetadata.urgent_sla) delete cleanedMetadata.urgent_sla;

      console.log('Creating workflow with metadata:', cleanedMetadata);
      console.log('Nodes:', graphNodes);
      console.log('Edges:', graphEdges);

      // Call API to create workflow
      const response = await createWorkflow(cleanedMetadata, {
        nodes: graphNodes,
        edges: graphEdges,
      });

      // Extract workflow data from response (structure: {workflow: {...}, graph: {...}})
      const workflowData = response.workflow || response;
      setCreatedWorkflow(workflowData);
      setShowConfirmation(true);
    } catch (error) {
      console.error('Failed to create workflow:', error);
      alert(
        createError ||
          'Failed to create workflow. Please check the console for details.'
      );
    }
  };

  // Handle confirmation modal actions
  const handleCloseConfirmation = () => {
    setShowConfirmation(false);
    navigate('/admin/workflows');
  };

  const handleEditWorkflow = (workflowId) => {
    navigate(`/admin/workflows/${workflowId}/edit`);
  };

  if (!roles) {
    return <LoadingSpinner height="100vh" />;
  }

  return (
    <>
      <AdminNav />
      <main className={styles.createWorkflowPage}>
        <ReactFlowProvider>
          <div className={styles.editorContainer}>
            {/* Left Sidebar - Workflow Metadata */}
            <div
              className={styles.sidebar}
              style={{ width: `${sidebarWidth}px` }}
            >
              <div className={styles.sidebarContent}>
                <h3>Workflow Details</h3>
                
                <div className={styles.formGroup}>
                  <label>Workflow Name *</label>
                  <input
                    type="text"
                    value={workflowMetadata.name}
                    onChange={(e) =>
                      setWorkflowMetadata({ ...workflowMetadata, name: e.target.value })
                    }
                    placeholder="Enter workflow name"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Description</label>
                  <textarea
                    value={workflowMetadata.description}
                    onChange={(e) =>
                      setWorkflowMetadata({ ...workflowMetadata, description: e.target.value })
                    }
                    placeholder="Enter workflow description"
                    rows={3}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Category *</label>
                  <input
                    type="text"
                    value={workflowMetadata.category}
                    onChange={(e) =>
                      setWorkflowMetadata({ ...workflowMetadata, category: e.target.value })
                    }
                    placeholder="e.g., IT, HR"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Sub-Category *</label>
                  <input
                    type="text"
                    value={workflowMetadata.sub_category}
                    onChange={(e) =>
                      setWorkflowMetadata({ ...workflowMetadata, sub_category: e.target.value })
                    }
                    placeholder="e.g., Support, Requests"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Department *</label>
                  <input
                    type="text"
                    value={workflowMetadata.department}
                    onChange={(e) =>
                      setWorkflowMetadata({ ...workflowMetadata, department: e.target.value })
                    }
                    placeholder="e.g., IT Support"
                  />
                </div>

                <hr className={styles.divider} />
                <h4>SLA Configuration</h4>

                {['low', 'medium', 'high', 'urgent'].map((priority) => {
                  // Parse ISO 8601 duration back to hours for display
                  const slaValue = workflowMetadata[`${priority}_sla`];
                  const displayValue = slaValue 
                    ? parseInt(slaValue.match(/\d+/)?.[0] || '0') 
                    : '';
                  
                  return (
                    <div key={priority} className={styles.formGroup}>
                      <label>{priority.charAt(0).toUpperCase() + priority.slice(1)} SLA (Hours)</label>
                      <input
                        type="number"
                        value={displayValue}
                        onChange={(e) => {
                          const hours = e.target.value ? parseInt(e.target.value) : null;
                          setWorkflowMetadata({
                            ...workflowMetadata,
                            [`${priority}_sla`]: hours ? `PT${hours}H` : null,
                          });
                        }}
                        placeholder="Hours"
                      />
                    </div>
                  );
                })}

                <hr className={styles.divider} />
                <h4>Steps ({nodes.length})</h4>
                <button className={styles.addBtn} onClick={handleAddNode}>
                  + Add Step
                </button>

                {editingNode && (
                  <div className={styles.nodeEditor}>
                    <h5>Editing: {editingNode.data.label}</h5>
                    <div className={styles.formGroup}>
                      <label>Step Name</label>
                      <input
                        type="text"
                        value={editingNode.data.label}
                        onChange={(e) => handleUpdateNode('label', e.target.value)}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Assigned Role</label>
                      <select
                        value={editingNode.data.role}
                        onChange={(e) => handleUpdateNode('role', e.target.value)}
                      >
                        {roles.map((role) => (
                          <option key={role.id} value={role.name}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Description</label>
                      <textarea
                        value={editingNode.data.description || ''}
                        onChange={(e) => handleUpdateNode('description', e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.checkbox}>
                        <input
                          type="checkbox"
                          checked={editingNode.data.is_start || false}
                          onChange={(e) => handleUpdateNode('is_start', e.target.checked)}
                        />
                        Start Step
                      </label>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.checkbox}>
                        <input
                          type="checkbox"
                          checked={editingNode.data.is_end || false}
                          onChange={(e) => handleUpdateNode('is_end', e.target.checked)}
                        />
                        End Step
                      </label>
                    </div>
                    <button
                      className={styles.deleteBtn}
                      onClick={handleDeleteNode}
                    >
                      Delete Step
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Resize handle */}
            <div
              className={styles.resizeHandle}
              onMouseDown={handleResizeStart}
            />

            {/* Content area - Workflow Editor */}
            <div className={styles.content} ref={contentRef}>
              <div className={styles.toolbar}>
                <div className={styles.toolbarLeft}>
                  <h2>Create Workflow</h2>
                  <span className={styles.hint}>Nodes: {nodes.length} | Edges: {edges.length}</span>
                </div>
                <div className={styles.toolbarRight}>
                  <button
                    className={styles.cancelBtn}
                    onClick={() => navigate('/admin/workflows')}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.saveBtn}
                    onClick={handleCreateWorkflow}
                    disabled={isCreating}
                  >
                    {isCreating ? 'Creating...' : 'Create Workflow'}
                  </button>
                </div>
              </div>

              <div className={styles.editorContent}>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  nodeTypes={nodeTypes}
                  onNodeClick={handleNodeClick}
                  fitView
                >
                  <Background />
                  <Controls />
                </ReactFlow>
              </div>
            </div>
          </div>
        </ReactFlowProvider>
      </main>

      {showConfirmation && createdWorkflow && (
        <WorkflowCreationConfirmation
          workflow={createdWorkflow}
          onClose={handleCloseConfirmation}
          onEditWorkflow={handleEditWorkflow}
        />
      )}
    </>
  );
}

