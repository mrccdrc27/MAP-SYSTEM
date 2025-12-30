import React, { useState, useCallback, useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './WorkflowEditorLayout.module.css';

// Components
import WorkflowEditorContent from './WorkflowEditorContent';
import WorkflowEditorSidebar from './WorkflowEditorSidebar';
import WorkflowEditorToolbar from './WorkflowEditorToolbar';
import SLAWeightEditor from './SLAWeightEditor';
import ConfirmDialog from './ConfirmDialog';
import AdminNav from '../../../../components/navigation/AdminNav';
import { 
  EditorRibbon, 
  UnsavedChangesWarning, 
  LoadingState, 
  CollapsiblePanel 
} from './components';

// Hooks
import { useWorkflowEditor, useDeleteConfirmation } from './hooks';
import { useWorkflowRoles } from '../../../../api/useWorkflowRoles';
import { useWorkflowRefresh } from '../../../../components/workflow/WorkflowRefreshContext';

export default function WorkflowEditorLayout({ workflowId }) {
  const { triggerRefresh } = useWorkflowRefresh();
  const { roles, loading: rolesLoading, error: rolesError } = useWorkflowRoles();
  
  // UI state
  const [showSLAModal, setShowSLAModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);

  // Workflow editor state and handlers
  const {
    workflowData,
    selectedElement,
    setSelectedElement,
    isEditingGraph,
    setIsEditingGraph,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    isSaving,
    canUndo,
    canRedo,
    contentRef,
    handleUndo,
    handleRedo,
    handleSave,
    handleAddStep,
    onStepClick,
    onEdgeClick,
    onPaneClick,
    handleUpdateStep,
    handleUpdateTransition,
    handleHistoryChange,
  } = useWorkflowEditor(workflowId, roles, triggerRefresh);

  // Delete confirmation
  const {
    confirmDialog,
    handleDeleteStep,
    handleDeleteTransition,
    confirmDelete,
    cancelDelete,
  } = useDeleteConfirmation(contentRef, workflowData, setSelectedElement, setHasUnsavedChanges);

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
    <div className={styles.pageWrapper}>
      <AdminNav />
      
      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <UnsavedChangesWarning onSave={handleSave} />
      )}

      {/* Top Ribbon */}
      <EditorRibbon
        workflowData={workflowData}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        canUndo={canUndo}
        canRedo={canRedo}
        isEditingGraph={isEditingGraph}
        onSave={handleSave}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleEditing={() => setIsEditingGraph(!isEditingGraph)}
        onOpenSLAModal={() => setShowSLAModal(true)}
        stepCount={stepCount}
        transitionCount={transitionCount}
      />

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Toolbar */}
        <CollapsiblePanel
          collapsed={toolbarCollapsed}
          onToggle={() => setToolbarCollapsed(!toolbarCollapsed)}
          position="left"
          collapseTitle="Hide toolbar"
          expandTitle="Show toolbar"
        >
          <WorkflowEditorToolbar
            onAddStep={handleAddStep}
            stepCount={stepCount}
            transitionCount={transitionCount}
            isEditingGraph={isEditingGraph}
            roles={roles}
          />
        </CollapsiblePanel>

        {/* Canvas */}
        <div className={styles.canvasArea}>
          <ReactFlowProvider>
            <WorkflowEditorContent
              ref={contentRef}
              workflowId={workflowId}
              workflowData={workflowData}
              onStepClick={onStepClick}
              onEdgeClick={onEdgeClick}
              onPaneClick={onPaneClick}
              isEditingGraph={isEditingGraph}
              setHasUnsavedChanges={setHasUnsavedChanges}
              onHistoryChange={handleHistoryChange}
            />
          </ReactFlowProvider>
        </div>

        {/* Sidebar */}
        <CollapsiblePanel
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          position="right"
          collapseTitle="Hide sidebar"
          expandTitle="Show sidebar"
        >
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
        </CollapsiblePanel>
      </div>

      {/* SLA Weight Modal */}
      {showSLAModal && (
        <SLAWeightEditor
          workflowId={workflowId}
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
    </div>
  );
}
