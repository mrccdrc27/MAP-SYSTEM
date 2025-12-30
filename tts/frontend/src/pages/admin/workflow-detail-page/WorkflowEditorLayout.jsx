import React, { useState, useEffect, useMemo } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { useNavigate } from 'react-router-dom';
import 'reactflow/dist/style.css';

// Use shared styles from CreateWorkflowPage for consistency
import styles from '../workflow-page/create-workflow.module.css';

// Components
import WorkflowEditorContent from './WorkflowEditorContent';
import WorkflowEditorSidebar from './WorkflowEditorSidebar';
import WorkflowInfoSidebar from './WorkflowInfoSidebar';
import SLAWeightEditor from './SLAWeightEditor';
import WorkflowConfigPanel from './WorkflowConfigPanel';
import ConfirmDialog from './ConfirmDialog';
import { LoadingState, UnsavedChangesWarning } from './components';

// Shared Components
import { WorkflowToolbar, ValidationPanel } from '../../../components/workflow/shared';

// UI Components
import { 
  GitBranch, 
  Plus
} from 'lucide-react';

// Hooks
import { useWorkflowEditor, useDeleteConfirmation } from './hooks';
import { useWorkflowRoles } from '../../../api/useWorkflowRoles';
import { useWorkflowRefresh } from '../../../components/workflow/WorkflowRefreshContext';

// Hook to compute validation errors from nodes/edges for the shared ValidationPanel
function useGraphValidation(nodes = [], edges = [], isDataLoaded = false) {
  return useMemo(() => {
    // Don't show validation errors until data is actually loaded
    if (!isDataLoaded || nodes.length === 0) {
      return [];
    }
    
    const errors = [];
    
    // Check for at least one start node
    const startNodes = nodes.filter(n => n.data?.is_start);
    if (startNodes.length === 0) {
      errors.push('No start step defined');
    } else if (startNodes.length > 1) {
      errors.push('Multiple start steps defined');
    }
    
    // Check for at least one end node
    const endNodes = nodes.filter(n => n.data?.is_end);
    if (endNodes.length === 0) {
      errors.push('No end step defined');
    }
    
    // Check for orphan nodes
    const nodesWithConnections = new Set();
    edges.forEach(e => {
      nodesWithConnections.add(e.source);
      nodesWithConnections.add(e.target);
    });
    
    const orphanNodes = nodes.filter(n => 
      !nodesWithConnections.has(n.id) && 
      !n.data?.is_start && 
      !n.data?.is_end &&
      nodes.length > 1
    );
    
    if (orphanNodes.length > 0) {
      errors.push(`${orphanNodes.length} orphan step(s) without connections`);
    }
    
    return errors;
  }, [nodes, edges, isDataLoaded]);
}

export default function WorkflowEditorLayout({ workflowId, workflowIdentifier, isNameBased = false }) {
  const navigate = useNavigate();
  const { triggerRefresh } = useWorkflowRefresh();
  const { roles, error: rolesError } = useWorkflowRoles();
  
  // Use workflowIdentifier if provided (new style), otherwise fall back to workflowId (backward compatibility)
  const identifier = workflowIdentifier || workflowId;
  
  // UI state
  const [showSLAModal, setShowSLAModal] = useState(false);
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' or 'config'
  const [currentNodes, setCurrentNodes] = useState([]);
  const [currentEdges, setCurrentEdges] = useState([]);

  // Workflow editor state and handlers
  const {
    workflowData,
    resolvedWorkflowId,
    selectedElement,
    setSelectedElement,
    isEditingGraph,
    setIsEditingGraph,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    isSaving,
    contentRef,
    handleSave,
    handleAddStep,
    onStepClick,
    onEdgeClick,
    onPaneClick,
    handleUpdateStep,
    handleUpdateTransition,
    handleWorkflowConfigUpdate,
  } = useWorkflowEditor(identifier, roles, triggerRefresh, isNameBased);
  
  // The actual workflow_id to use for API calls (resolved from name if needed)
  const actualWorkflowId = resolvedWorkflowId || workflowData?.workflow?.workflow_id || identifier;

  // Delete confirmation
  const {
    confirmDialog,
    handleDeleteStep,
    handleDeleteTransition,
    confirmDelete,
    cancelDelete,
  } = useDeleteConfirmation(contentRef, workflowData, setSelectedElement, setHasUnsavedChanges);

  // Track whether workflow data has been initially loaded into the flow editor
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Track current nodes/edges for validation display
  useEffect(() => {
    if (contentRef.current) {
      const interval = setInterval(() => {
        const nodes = contentRef.current?.getNodes?.() || [];
        const edges = contentRef.current?.getEdges?.() || [];
        setCurrentNodes(nodes);
        setCurrentEdges(edges);
        // Mark data as loaded once we have nodes from the graph
        if (nodes.length > 0 && !isDataLoaded) {
          setIsDataLoaded(true);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [contentRef.current, isDataLoaded]);

  // Compute validation errors using the hook - only after data is loaded
  const validationErrors = useGraphValidation(currentNodes, currentEdges, isDataLoaded);

  // Show warning if roles failed to load
  useEffect(() => {
    if (rolesError) {
      console.warn('Failed to load roles:', rolesError);
    }
  }, [rolesError]);

  // Loading state
  if (!workflowData) {
    return <LoadingState />;
  }

  const stepCount = workflowData.graph?.nodes?.length || 0;
  const transitionCount = workflowData.graph?.edges?.length || 0;

  return (
    <main className={styles.createWorkflowPage}>
      <ReactFlowProvider>
        {/* Unsaved Changes Warning */}
        {hasUnsavedChanges && (
          <UnsavedChangesWarning onSave={handleSave} />
        )}

        {/* Top Toolbar - Using Shared Component */}
        <WorkflowToolbar
          mode="edit"
          title={workflowData?.workflow?.name}
          subtitle={[workflowData?.workflow?.category, workflowData?.workflow?.sub_category].filter(Boolean).join(' • ')}
          isSaving={isSaving}
          hasUnsavedChanges={hasUnsavedChanges}
          isEditingGraph={isEditingGraph}
          stepCount={stepCount}
          transitionCount={transitionCount}
          onSave={handleSave}
          onBack={() => navigate('/admin/workflows')}
          onToggleEditing={() => setIsEditingGraph(!isEditingGraph)}
          onOpenSLAModal={() => setShowSLAModal(true)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Editor Content - Using same layout as CreateWorkflowPage */}
        <div className={styles.simpleMode}>
          <div className={styles.simpleLayout}>
            {/* LEFT SIDEBAR - Workflow Info (only show in editor tab) */}
            {activeTab === 'editor' && (
              <WorkflowInfoSidebar workflowData={workflowData} />
            )}

            {/* CENTER PANEL - Switches between Flow Editor and Config */}
            <main className={styles.centerPanel} style={activeTab === 'config' ? { maxWidth: '800px', margin: '0 auto' } : {}}>
              {activeTab === 'editor' ? (
                <>
                  {/* Add Step Button (when editing) */}
                  {isEditingGraph && (
                    <div className={styles.panelSection} style={{ borderBottom: 'var(--border-bottom)', paddingBottom: '12px' }}>
                      <div className={styles.panelHeader}>
                        <h3><GitBranch size={16} /> Quick Actions</h3>
                      </div>
                      <button 
                        className={styles.addBtnSmall}
                        onClick={() => handleAddStep()}
                        style={{ marginTop: '8px' }}
                      >
                        <Plus size={14} /> Add New Step
                      </button>
                    </div>
                  )}

                  {/* Flow Canvas */}
                  <div className={styles.flowContainer} style={{ flex: 1, minHeight: '400px' }}>
                    <WorkflowEditorContent
                      ref={contentRef}
                      workflowId={actualWorkflowId}
                      workflowData={workflowData}
                      roles={roles}
                      onStepClick={onStepClick}
                      onEdgeClick={onEdgeClick}
                      onPaneClick={onPaneClick}
                      isEditingGraph={isEditingGraph}
                      setHasUnsavedChanges={setHasUnsavedChanges}
                    />
                  </div>
                </>
              ) : (
                /* Configuration Panel */
                <div style={{ padding: '20px', background: 'var(--bg1-color)', borderRadius: '8px', margin: '20px' }}>
                  <WorkflowConfigPanel
                    workflow={workflowData?.workflow}
                    workflowId={actualWorkflowId}
                    onUpdate={handleWorkflowConfigUpdate}
                  />
                </div>
              )}
            </main>

            {/* RIGHT SIDEBAR - Selection Editor & Validation (only show in editor tab) */}
            {activeTab === 'editor' && (
              <aside className={styles.rightSidebar}>
                {/* Validation Panel - Using shared component */}
                <ValidationPanel errors={validationErrors} />
                
                {/* Selection Panel */}
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <WorkflowEditorSidebar
                    selectedElement={selectedElement}
                    workflowData={workflowData}
                    roles={roles}
                    onUpdateStep={handleUpdateStep}
                    onUpdateTransition={handleUpdateTransition}
                    onDeleteStep={handleDeleteStep}
                    onDeleteTransition={handleDeleteTransition}
                    onClose={() => setSelectedElement(null)}
                  />
                </div>
              </aside>
            )}
          </div>
        </div>
      </ReactFlowProvider>

      {/* SLA Weight Modal */}
      {showSLAModal && (
        <SLAWeightEditor
          workflowId={actualWorkflowId}
          onClose={() => setShowSLAModal(false)}
        />
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}
    </main>
  );
}
