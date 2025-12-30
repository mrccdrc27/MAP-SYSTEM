import React, { useState, useEffect, useMemo } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { useNavigate } from 'react-router-dom';
import 'reactflow/dist/style.css';

// Use shared styles from CreateWorkflowPage for consistency
import styles from '../workflow-page/create-workflow.module.css';

// Components
import WorkflowEditorContent from './WorkflowEditorContent';
import WorkflowEditorSidebar from './WorkflowEditorSidebar';
import SLAWeightEditor from './SLAWeightEditor';
import ConfirmDialog from './ConfirmDialog';
// AdminNav removed for full-screen editor experience (matching CreateWorkflowPage)

// Shared Components
import { WorkflowToolbar } from '../../../components/workflow/shared';

// UI Components
import { 
  GitBranch, 
  Plus, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

// Hooks
import { useWorkflowEditor, useDeleteConfirmation } from './hooks';
import { useWorkflowRoles } from '../../../api/useWorkflowRoles';
import { useWorkflowRefresh } from '../../../components/workflow/WorkflowRefreshContext';

// Loading State Component
function LoadingState() {
  return (
    <div className={styles.createWorkflowPage} style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          width: '32px', 
          height: '32px', 
          border: '3px solid var(--border-color)',
          borderTopColor: 'var(--primary-color)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <p style={{ color: 'var(--muted-text-color)' }}>Loading workflow...</p>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Unsaved Changes Warning Banner
function UnsavedChangesWarning({ onSave }) {
  return (
    <div style={{
      background: '#fef9c3',
      borderBottom: '1px solid #fde68a',
      padding: '8px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: '0.875rem',
      color: '#854d0e'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <AlertCircle size={16} />
        <span>You have unsaved changes</span>
      </div>
      <button
        onClick={onSave}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#854d0e',
          cursor: 'pointer',
          textDecoration: 'underline',
          fontWeight: 500
        }}
      >
        Save now
      </button>
    </div>
  );
}

// Helper function to format seconds as readable time
function formatSeconds(seconds) {
  if (!seconds || isNaN(seconds)) return 'N/A';
  const secs = parseFloat(seconds);
  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  
  return parts.length > 0 ? parts.join(' ') : '< 1m';
}

// Workflow Info Section (replaces WorkflowDetailsSidebar from create page)
function WorkflowInfoSidebar({ workflowData }) {
  const [infoExpanded, setInfoExpanded] = useState(true);
  
  const workflow = workflowData?.workflow || {};
  
  return (
    <aside className={styles.leftSidebar}>
      {/* Workflow Details Tab */}
      <div className={styles.sidebarSection}>
        <button 
          className={styles.ribbonToggle}
          onClick={() => setInfoExpanded(!infoExpanded)}
          style={{ padding: '0', marginBottom: '12px' }}
        >
          <span className={styles.sidebarTitle}>Workflow Details</span>
          {infoExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        
        {infoExpanded && (
          <div className={styles.compactForm}>
            <div className={styles.inputGroup}>
              <label>Name</label>
              <input 
                type="text" 
                value={workflow.name || ''} 
                readOnly 
                style={{ cursor: 'default', background: 'var(--bg-content-color)' }}
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Category</label>
              <input 
                type="text" 
                value={workflow.category || 'N/A'} 
                readOnly 
                style={{ cursor: 'default', background: 'var(--bg-content-color)' }}
              />
            </div>
            {workflow.sub_category && (
              <div className={styles.inputGroup}>
                <label>Sub-Category</label>
                <input 
                  type="text" 
                  value={workflow.sub_category} 
                  readOnly 
                  style={{ cursor: 'default', background: 'var(--bg-content-color)' }}
                />
              </div>
            )}
            <div className={styles.inputGroup}>
              <label>Status</label>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                background: workflow.is_active ? 'var(--low-bg-color)' : 'var(--critical-bg-color)',
                color: workflow.is_active ? 'var(--low-color)' : 'var(--critical-color)',
                borderRadius: '4px',
                fontSize: '0.8125rem',
                fontWeight: 500
              }}>
                {workflow.is_active ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                {workflow.is_active ? 'Active' : 'Inactive'}
              </div>
            </div>
            {workflow.description && (
              <div className={styles.inputGroup}>
                <label>Description</label>
                <textarea 
                  value={workflow.description} 
                  readOnly 
                  rows={3}
                  style={{ cursor: 'default', background: 'var(--bg-content-color)', resize: 'none' }}
                />
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* SLA Info */}
      <div className={styles.sidebarSection}>
        <span className={styles.sidebarTitle} style={{ marginBottom: '12px', display: 'block' }}>
          SLA Configuration
        </span>
        <div className={styles.slaCompact}>
          {[
            { label: 'Urgent', color: 'var(--critical-color)', value: workflow.urgent_sla },
            { label: 'High', color: 'var(--high-color)', value: workflow.high_sla },
            { label: 'Medium', color: 'var(--medium-color)', value: workflow.medium_sla },
            { label: 'Low', color: 'var(--success-color)', value: workflow.low_sla },
          ].map((sla) => (
            <div key={sla.label} className={styles.slaRow}>
              <div className={styles.slaLabel} style={{ borderColor: sla.color }}>
                <span className={styles.slaLabelText}>{sla.label}</span>
              </div>
              <span style={{ color: 'var(--text-color)', fontWeight: 500 }}>
                {formatSeconds(sla.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

// Validation Summary Component
function ValidationSummary({ nodes = [], edges = [] }) {
  const validation = useMemo(() => {
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
  }, [nodes, edges]);
  
  return (
    <div className={validation.length === 0 ? styles.validationOk : styles.validationError} 
         style={{ marginBottom: 0, padding: '12px 16px', borderBottom: 'var(--border-bottom)' }}>
      <div className={styles.validationHeader}>
        {validation.length === 0 ? (
          <>
            <CheckCircle size={14} />
            <span>Workflow Valid</span>
          </>
        ) : (
          <>
            <AlertCircle size={14} />
            <span>{validation.length} Issue(s)</span>
          </>
        )}
      </div>
      {validation.length > 0 && (
        <ul className={styles.validationList}>
          {validation.map((error, idx) => (
            <li key={idx}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function WorkflowEditorLayout({ workflowId, workflowIdentifier, isNameBased = false }) {
  const navigate = useNavigate();
  const { triggerRefresh } = useWorkflowRefresh();
  const { roles, error: rolesError } = useWorkflowRoles();
  
  // Use workflowIdentifier if provided (new style), otherwise fall back to workflowId (backward compatibility)
  const identifier = workflowIdentifier || workflowId;
  
  // UI state
  const [showSLAModal, setShowSLAModal] = useState(false);
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

  // Track current nodes/edges for validation display
  useEffect(() => {
    if (contentRef.current) {
      const interval = setInterval(() => {
        const nodes = contentRef.current?.getNodes?.() || [];
        const edges = contentRef.current?.getEdges?.() || [];
        setCurrentNodes(nodes);
        setCurrentEdges(edges);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [contentRef.current]);

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
        />

        {/* Editor Content - Using same layout as CreateWorkflowPage */}
        <div className={styles.simpleMode}>
          <div className={styles.simpleLayout}>
            {/* LEFT SIDEBAR - Workflow Info */}
            <WorkflowInfoSidebar workflowData={workflowData} />

            {/* CENTER PANEL - Flow Editor */}
            <main className={styles.centerPanel}>
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
            </main>

            {/* RIGHT SIDEBAR - Selection Editor & Validation */}
            <aside className={styles.rightSidebar}>
              {/* Validation Summary */}
              <ValidationSummary 
                nodes={currentNodes} 
                edges={currentEdges} 
              />
              
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
