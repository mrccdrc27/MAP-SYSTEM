import React, { useState, useEffect, useMemo } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { useNavigate, useSearchParams } from 'react-router-dom';
import 'reactflow/dist/style.css';

// Use shared styles from CreateWorkflowPage for consistency
import styles from '../workflow-page/create-workflow.module.css';

// Components
import WorkflowEditorContent from './WorkflowEditorContent';
import WorkflowEditorSidebar from './WorkflowEditorSidebar';
import WorkflowInfoSidebar from './WorkflowInfoSidebar';
import WorkflowConfigPanel from './WorkflowConfigPanel';
import ConfirmDialog from './ConfirmDialog';
import { LoadingState, UnsavedChangesWarning } from './components';

// Shared Components
import { WorkflowToolbar, ValidationPanel, VersionHistoryPanel, VersionPreviewModal } from '../../../components/workflow/shared';

// Hooks
import { useWorkflowEditor, useDeleteConfirmation } from './hooks';
import { useWorkflowRoles } from '../../../api/useWorkflowRoles';
import { useWorkflowRefresh } from '../../../components/workflow/WorkflowRefreshContext';
import useWorkflowVersions from '../../../api/useWorkflowVersions';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const { triggerRefresh } = useWorkflowRefresh();
  const { roles, error: rolesError } = useWorkflowRoles();
  
  // Use workflowIdentifier if provided (new style), otherwise fall back to workflowId (backward compatibility)
  const identifier = workflowIdentifier || workflowId;
  
  // Read initial tab from URL params, default to 'editor'
  const urlTab = searchParams.get('tab');
  const initialTab = (urlTab === 'configure' || urlTab === 'config') ? 'config' : 'editor';
  
  // UI state
  const [activeTab, setActiveTab] = useState(initialTab);
  const [rightSidebarTab, setRightSidebarTab] = useState('editor'); // 'editor', 'validation', 'versions'
  const [currentNodes, setCurrentNodes] = useState([]);
  const [currentEdges, setCurrentEdges] = useState([]);

  // Sync tab state with URL
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    // Update URL without navigation
    const newParams = new URLSearchParams(searchParams);
    if (newTab === 'config') {
      newParams.set('tab', 'configure');
    } else {
      newParams.delete('tab'); // editor is default, no need for param
    }
    setSearchParams(newParams, { replace: true });
  };

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
    onNodeUpdate,
    handleUpdateStep,
    handleUpdateTransition,
    handleWorkflowConfigUpdate,
  } = useWorkflowEditor(identifier, roles, triggerRefresh, isNameBased);
  
  // The actual workflow_id to use for API calls (resolved from name if needed)
  const actualWorkflowId = resolvedWorkflowId || workflowData?.workflow?.workflow_id || identifier;

  // Workflow versions hook
  const {
    versions,
    selectedVersion,
    loading: versionsLoading,
    fetchVersions,
    fetchVersionDetail,
    rollbackToVersion,
    clearSelectedVersion,
  } = useWorkflowVersions(actualWorkflowId);

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

  // Fetch versions when page loads
  useEffect(() => {
    if (actualWorkflowId && !versionsLoading && (!versions || versions.length === 0)) {
      fetchVersions();
    }
  }, [actualWorkflowId, versionsLoading, versions?.length, fetchVersions]);

  // Handle version rollback
  const handleVersionRollback = async (versionId) => {
    try {
      await rollbackToVersion(versionId);
      // Trigger workflow refresh to reload the editor with new data
      triggerRefresh();
      // Navigate to force reload the page with new workflow data
      window.location.reload();
    } catch (error) {
      console.error('Failed to rollback workflow:', error);
    }
  };

  // Handle version preview
  const handleVersionPreview = async (versionId) => {
    try {
      await fetchVersionDetail(versionId);
      // The selectedVersion state will be updated with the full definition
    } catch (error) {
      console.error('Failed to fetch version details:', error);
    }
  };

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
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        {/* Content Area - Both views rendered but only one visible to preserve state */}
        
        {/* Editor View - Three column layout (hidden when not active) */}
        <div 
          className={styles.simpleMode}
          style={{ display: activeTab === 'editor' ? 'flex' : 'none' }}
        >
          <div className={styles.simpleLayout}>
            {/* LEFT SIDEBAR - Workflow Info */}
            <WorkflowInfoSidebar workflowData={workflowData} />

            {/* CENTER PANEL - Flow Editor */}
            <main className={styles.centerPanel}>
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
                  onNodeUpdate={onNodeUpdate}
                  isEditingGraph={isEditingGraph}
                  setHasUnsavedChanges={setHasUnsavedChanges}
                  onToggleEditing={() => setIsEditingGraph(!isEditingGraph)}
                  onSave={handleSave}
                  onAddStep={() => handleAddStep()}
                  isSaving={isSaving}
                  hasUnsavedChanges={hasUnsavedChanges}
                />
              </div>
            </main>

            {/* RIGHT SIDEBAR - Selection Editor, Validation & Versions */}
            <aside className={styles.rightSidebar}>
              {/* Sidebar Tab Navigation */}
              <div style={{
                display: 'flex',
                gap: '8px',
                padding: '12px 16px',
                borderBottom: 'var(--border-bottom)',
                background: 'var(--bg-content-color)',
              }}>
                <button
                  onClick={() => setRightSidebarTab('editor')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    fontWeight: rightSidebarTab === 'editor' ? '600' : '500',
                    border: 'none',
                    borderRadius: '6px',
                    background: rightSidebarTab === 'editor' ? 'var(--primary-color)' : 'transparent',
                    color: rightSidebarTab === 'editor' ? 'white' : 'var(--text-color)',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                  }}
                >
                  Editor
                </button>
                <button
                  onClick={() => setRightSidebarTab('validation')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    fontWeight: rightSidebarTab === 'validation' ? '600' : '500',
                    border: 'none',
                    borderRadius: '6px',
                    background: rightSidebarTab === 'validation' ? 'var(--primary-color)' : 'transparent',
                    color: rightSidebarTab === 'validation' ? 'white' : 'var(--text-color)',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                  }}
                >
                  Validation ({validationErrors.length})
                </button>
                <button
                  onClick={() => setRightSidebarTab('versions')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    fontWeight: rightSidebarTab === 'versions' ? '600' : '500',
                    border: 'none',
                    borderRadius: '6px',
                    background: rightSidebarTab === 'versions' ? 'var(--primary-color)' : 'transparent',
                    color: rightSidebarTab === 'versions' ? 'white' : 'var(--text-color)',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                  }}
                >
                  Versions ({versions.length})
                </button>
              </div>

              {/* Tab Content */}
              <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                {/* Editor Tab - Selection Panel */}
                {rightSidebarTab === 'editor' && (
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
                )}

                {/* Validation Tab */}
                {rightSidebarTab === 'validation' && (
                  <div style={{ padding: '16px' }}>
                    <ValidationPanel errors={validationErrors} />
                  </div>
                )}

                {/* Versions Tab */}
                {rightSidebarTab === 'versions' && (
                  <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <VersionHistoryPanel
                      versions={versions}
                      selectedVersion={selectedVersion}
                      loading={versionsLoading}
                      onFetchVersions={fetchVersions}
                      onSelectVersion={fetchVersionDetail}
                      onRollback={handleVersionRollback}
                      onPreviewVersion={handleVersionPreview}
                    />
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>

        {/* Configuration View - Full screen (hidden when not active) */}
        <div style={{ 
          flex: 1, 
          overflow: 'auto', 
          padding: 0,
          background: 'var(--bg-content-color)',
          display: activeTab === 'config' ? 'block' : 'none'
        }}>
          <div style={{ 
            background: 'var(--bg1-color)',
            borderRadius: '8px',
            boxShadow: 'var(--shadow)',
            overflow: 'hidden'
          }}>
            <WorkflowConfigPanel
              workflow={workflowData?.workflow}
              workflowId={actualWorkflowId}
              onUpdate={handleWorkflowConfigUpdate}
            />
          </div>
        </div>
      </ReactFlowProvider>

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

      {/* Version Preview Modal */}
      {selectedVersion && (
        <VersionPreviewModal
          version={selectedVersion}
          onClose={clearSelectedVersion}
        />
      )}
    </main>
  );
}
