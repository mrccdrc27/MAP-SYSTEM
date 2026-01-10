import React, { useState, useCallback, useMemo } from "react";
import { ReactFlowProvider, useNodesState, useEdgesState } from "reactflow";
import "reactflow/dist/style.css";
import { useNavigate } from "react-router-dom";
import { GitBranch, Link, Plus, Edit3, Eye } from "lucide-react";

// Styles
import styles from "./create-workflow.module.css";

// API hooks
import { useCreateWorkflow } from "../../../api/useCreateWorkflow";
import { useWorkflowRoles } from "../../../api/useWorkflowRoles";
import { workflowNameToSlug } from "../../../api/useWorkflowAPI";
import useFetchWorkflows from "../../../api/useFetchWorkflows";

// Shared Components
import {
  WorkflowToolbar,
  ValidationPanel,
  SLAPanel,
} from "../../../components/workflow/shared";

// Components
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import Toast from "../../../components/modal/Toast";
import WorkflowCreationConfirmation from "./modals/WorkflowCreationConfirmation";
import SequenceDiagramModal from "./modals/SequenceDiagramModal";
import {
  StepCard,
  TransitionRow,
  WorkflowDetailsSidebar,
  WorkflowFlowView,
  HelpTips,
} from "./components";

// Custom hooks
import { useWorkflowState } from "./hooks/useWorkflowState";
import {
  useWorkflowValidation,
  prepareWorkflowPayload,
  getDiagramData,
} from "./hooks/useWorkflowValidation";

// Constants
import { DEFAULT_WORKFLOW_METADATA } from "./constants/workflowTemplates";

export default function CreateWorkflowPage() {
  const navigate = useNavigate();

  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // UI state
  const [editorMode] = useState("simple");
  const [showHelp, setShowHelp] = useState(false);
  const [leftSidebarTab, setLeftSidebarTab] = useState("details");
  const [centerViewMode, setCenterViewMode] = useState("edit");
  const [showFlowAnimation, setShowFlowAnimation] = useState(false);

  // Toast state
  const [toast, setToast] = useState(null);

  // Modal state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [createdWorkflow, setCreatedWorkflow] = useState(null);
  const [showSequenceDiagram, setShowSequenceDiagram] = useState(false);

  // Form state
  const [workflowMetadata, setWorkflowMetadata] = useState(
    DEFAULT_WORKFLOW_METADATA
  );

  // API hooks
  const {
    createWorkflow,
    loading: isCreating,
    error: createError,
  } = useCreateWorkflow();
  const { roles } = useWorkflowRoles();
  const { workflows: existingWorkflows } = useFetchWorkflows();

  // Custom state management
  const {
    simpleNodes,
    simpleEdges,
    selectedTemplate,
    applyTemplate,
    addSimpleNode,
    updateSimpleNode,
    removeSimpleNode,
    addSimpleEdge,
    updateSimpleEdge,
    removeSimpleEdge,
  } = useWorkflowState(roles, setNodes, setEdges);

  // Validation
  const { validationErrors } = useWorkflowValidation(
    workflowMetadata,
    simpleNodes,
    simpleEdges,
    nodes,
    edges,
    editorMode,
    existingWorkflows,
    null // currentWorkflowId is null for create mode
  );

  // Toast helper
  const showToast = useCallback((message, type = "error") => {
    setToast({ message, type });
  }, []);

  // Handle template application with metadata update
  const handleApplyTemplate = useCallback(
    (templateKey) => {
      const metadata = applyTemplate(templateKey);
      if (metadata) {
        setWorkflowMetadata((prev) => ({
          ...prev,
          ...metadata,
          name: metadata.name || prev.name,
        }));
      }
    },
    [applyTemplate]
  );

  // Switch to flow view and sync nodes
  const handleSwitchToFlowView = useCallback(() => {
    setCenterViewMode("flow");
    if (simpleNodes.length > 0) {
      const layoutedNodes = simpleNodes.map((node, index) => ({
        id: node.id,
        type: "step",
        position: {
          x: 100 + (index % 3) * 250,
          y: 100 + Math.floor(index / 3) * 150,
        },
        data: {
          label: node.name,
          role: node.role,
          is_start: node.is_start,
          is_end: node.is_end,
          description: node.description,
          instruction: node.instruction,
          escalate_to: node.escalate_to,
          weight: node.weight,
        },
      }));
      const layoutedEdges = simpleEdges.map((edge) => ({
        id: edge.id,
        source: edge.from,
        target: edge.to,
        label: edge.name,
        type: "smoothstep",
        style: { strokeWidth: 2 },
      }));
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
  }, [simpleNodes, simpleEdges, setNodes, setEdges]);

  // Create workflow
  const handleCreateWorkflow = useCallback(async () => {
    if (validationErrors.length > 0) return;

    try {
      const { metadata, graph } = prepareWorkflowPayload(
        workflowMetadata,
        simpleNodes,
        simpleEdges,
        nodes,
        edges,
        editorMode
      );

      const response = await createWorkflow(metadata, graph);
      const workflowData = response.workflow || response;
      setCreatedWorkflow(workflowData);
      setShowConfirmation(true);
    } catch (error) {
      console.error("Failed to create workflow:", error);
      
      // Format error message properly
      let errorMessage = "Failed to create workflow. Please check all required fields.";
      
      if (createError) {
        // Handle structured error object
        if (typeof createError === 'object' && !Array.isArray(createError)) {
          const errors = Object.entries(createError)
            .map(([field, messages]) => {
              const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              const errorMsg = Array.isArray(messages) ? messages[0] : messages;
              return `${fieldName}: ${errorMsg}`;
            })
            .join('. ');
          errorMessage = errors || errorMessage;
        } else if (typeof createError === 'string') {
          errorMessage = createError;
        }
      }
      
      showToast(errorMessage, "error");
    }
  }, [
    validationErrors,
    workflowMetadata,
    simpleNodes,
    simpleEdges,
    nodes,
    edges,
    editorMode,
    createWorkflow,
    createError,
    showToast,
  ]);

  // Navigation handlers
  const handleCloseConfirmation = useCallback(() => {
    setShowConfirmation(false);
    navigate("/admin/workflows");
  }, [navigate]);

  const handleEditWorkflow = useCallback(
    (workflowId, workflowName) => {
      // Use name-based navigation if name is available, otherwise fall back to ID
      if (workflowName) {
        const slug = workflowNameToSlug(workflowName);
        navigate(`/admin/workflows/${slug}/edit`);
      } else {
        navigate(`/admin/workflows/${workflowId}/edit`);
      }
    },
    [navigate]
  );

  // Diagram data
  const diagramData = useMemo(() => {
    return getDiagramData(simpleNodes, simpleEdges, nodes, edges, editorMode);
  }, [simpleNodes, simpleEdges, nodes, edges, editorMode]);

  // Loading state
  if (!roles) {
    return <LoadingSpinner height="100vh" />;
  }

  return (
    <main className={styles.createWorkflowPage}>
      <ReactFlowProvider>
        {/* Top Toolbar - Using Shared Component */}
        <WorkflowToolbar
          mode="create"
          isSaving={isCreating}
          validationErrorCount={validationErrors.length}
          stepCount={simpleNodes.length}
          transitionCount={simpleEdges.length}
          showHelp={showHelp}
          onSave={handleCreateWorkflow}
          onBack={() => navigate("/admin/workflows")}
          onOpenDiagram={() => setShowSequenceDiagram(true)}
          onToggleHelp={() => setShowHelp(!showHelp)}
        />

        {/* Editor Content */}
        <div className={styles.simpleMode}>
          <div className={styles.simpleLayout}>
            {/* LEFT SIDEBAR */}
            <WorkflowDetailsSidebar
              leftSidebarTab={leftSidebarTab}
              setLeftSidebarTab={setLeftSidebarTab}
              workflowMetadata={workflowMetadata}
              setWorkflowMetadata={setWorkflowMetadata}
              selectedTemplate={selectedTemplate}
              applyTemplate={handleApplyTemplate}
            />

            {/* CENTER PANEL */}
            <main className={styles.centerPanel}>
              {/* View Mode Toggle */}
              <div className={styles.viewModeToggle}>
                <button
                  onClick={() => setCenterViewMode("edit")}
                  className={`${styles.viewModeBtn} ${
                    centerViewMode === "edit" ? styles.viewModeBtnActive : ""
                  }`}
                >
                  <Edit3 size={16} /> Edit Steps
                </button>
                <button
                  onClick={handleSwitchToFlowView}
                  className={`${styles.viewModeBtn} ${
                    centerViewMode === "flow" ? styles.viewModeBtnActive : ""
                  }`}
                >
                  <Eye size={16} /> View Flow
                </button>
              </div>

              {centerViewMode === "edit" ? (
                <>
                  {/* Steps Section */}
                  <div className={styles.panelSection}>
                    <div className={styles.panelHeader}>
                      <h3>
                        <GitBranch size={16} /> Steps ({simpleNodes.length})
                      </h3>
                      <button
                        className={styles.addBtnSmall}
                        onClick={addSimpleNode}
                      >
                        <Plus size={14} /> Add
                      </button>
                    </div>
                    <div className={styles.stepsGrid}>
                      {simpleNodes.length === 0 ? (
                        <div className={styles.emptySmall}>
                          Select a template or add steps
                        </div>
                      ) : (
                        simpleNodes.map((node, idx) => (
                          <StepCard
                            key={node.id}
                            node={node}
                            index={idx}
                            roles={roles}
                            onUpdate={updateSimpleNode}
                            onRemove={removeSimpleNode}
                          />
                        ))
                      )}
                    </div>
                  </div>

                  {/* Transitions Section */}
                  <div className={styles.panelSection}>
                    <div className={styles.panelHeader}>
                      <h3>
                        <Link size={16} /> Transitions ({simpleEdges.length})
                      </h3>
                      <button
                        className={styles.addBtnSmall}
                        onClick={addSimpleEdge}
                        disabled={simpleNodes.length < 2}
                      >
                        <Plus size={14} /> Add
                      </button>
                    </div>
                    <div className={styles.transitionsCompact}>
                      {simpleEdges.length === 0 ? (
                        <div className={styles.emptySmall}>
                          Add transitions to connect steps
                        </div>
                      ) : (
                        simpleEdges.map((edge, idx) => (
                          <TransitionRow
                            key={edge.id}
                            edge={edge}
                            index={idx}
                            nodes={simpleNodes}
                            onUpdate={updateSimpleEdge}
                            onRemove={removeSimpleEdge}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className={styles.flowContainer}>
                  <WorkflowFlowView
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    showFlowAnimation={showFlowAnimation}
                    setShowFlowAnimation={setShowFlowAnimation}
                  />
                </div>
              )}
            </main>

            {/* RIGHT SIDEBAR */}
            <aside className={styles.rightSidebar}>
              <ValidationPanel errors={validationErrors} />
              <SLAPanel
                responseSLA={{
                  hours: Math.floor(
                    (workflowMetadata.response_time_sla || 0) / 60
                  ),
                  minutes: (workflowMetadata.response_time_sla || 0) % 60,
                }}
                resolutionSLA={{
                  hours: Math.floor(
                    (workflowMetadata.resolution_time_sla || 0) / 60
                  ),
                  minutes: (workflowMetadata.resolution_time_sla || 0) % 60,
                }}
                onResponseSLAChange={(sla) =>
                  setWorkflowMetadata((prev) => ({
                    ...prev,
                    response_time_sla: sla.hours * 60 + sla.minutes,
                  }))
                }
                onResolutionSLAChange={(sla) =>
                  setWorkflowMetadata((prev) => ({
                    ...prev,
                    resolution_time_sla: sla.hours * 60 + sla.minutes,
                  }))
                }
              />
              {showHelp && <HelpTips />}
            </aside>
          </div>
        </div>
      </ReactFlowProvider>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Modals */}
      {showConfirmation && createdWorkflow && (
        <WorkflowCreationConfirmation
          workflow={createdWorkflow}
          onClose={handleCloseConfirmation}
          onEditWorkflow={handleEditWorkflow}
        />
      )}

      <SequenceDiagramModal
        isOpen={showSequenceDiagram}
        onClose={() => setShowSequenceDiagram(false)}
        nodes={diagramData.nodes}
        edges={diagramData.edges}
        workflowName={workflowMetadata.name || "New Workflow"}
      />
    </main>
  );
}