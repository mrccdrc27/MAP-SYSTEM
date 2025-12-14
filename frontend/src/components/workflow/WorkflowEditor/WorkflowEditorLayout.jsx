import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './WorkflowEditorLayout.module.css';
import WorkflowEditorContent from './WorkflowEditorContent';
import WorkflowEditorSidebar from './WorkflowEditorSidebar';
import WorkflowEditorToolbar from './WorkflowEditorToolbar';
import SLAWeightEditor from './SLAWeightEditor';
import ConfirmDialog from './ConfirmDialog';
import { useWorkflowAPI } from '../../../api/useWorkflowAPI';
import { useWorkflowRoles } from '../../../api/useWorkflowRoles';
import { useWorkflowRefresh } from '../WorkflowRefreshContext';
import AdminNav from "../../../components/navigation/AdminNav";
import { Save, RefreshCw, Undo, Redo, AlertCircle, ChevronRight, ChevronLeft, Settings } from 'lucide-react';

export default function WorkflowEditorLayout({ workflowId }) {
  const { triggerRefresh } = useWorkflowRefresh();
  const [selectedElement, setSelectedElement] = useState(null);
  const [workflowData, setWorkflowData] = useState(null);
  const [isEditingGraph, setIsEditingGraph] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSLAModal, setShowSLAModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // History management for undo/redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedHistoryIndex, setSavedHistoryIndex] = useState(-1);

  const contentRef = useRef();
  const { getWorkflowDetail } = useWorkflowAPI();
  const { roles } = useWorkflowRoles();

  // Load workflow data
  useEffect(() => {
    const loadWorkflow = async () => {
      try {
        const data = await getWorkflowDetail(workflowId);
        setWorkflowData(data);
        // Initialize history with loaded data
        setHistory([data]);
        setHistoryIndex(0);
        setSavedHistoryIndex(0);
      } catch (err) {
        console.error('Failed to load workflow:', err);
      }
    };
    loadWorkflow();
  }, [workflowId, getWorkflowDetail]);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(historyIndex !== savedHistoryIndex);
  }, [historyIndex, savedHistoryIndex]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && ((e.shiftKey && e.key === 'z') || e.key === 'y')) {
        e.preventDefault();
        handleRedo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyIndex, history]);

  // addToHistory can be used for future undo/redo feature enhancements
  // eslint-disable-next-line no-unused-vars
  const addToHistory = useCallback((newData) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newData);
      if (newHistory.length > 50) {
        return newHistory.slice(-50);
      }
      return newHistory;
    });
    setHistoryIndex((prev) => {
      const newIndex = prev + 1;
      return newIndex >= 50 ? 49 : newIndex;
    });
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setWorkflowData(history[newIndex]);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setWorkflowData(history[newIndex]);
    }
  }, [historyIndex, history]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      if (contentRef.current?.saveChanges) {
        await contentRef.current.saveChanges();
        setSavedHistoryIndex(historyIndex);
        setHasUnsavedChanges(false);
        triggerRefresh();
      }
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setIsSaving(false);
    }
  }, [historyIndex, triggerRefresh]);

  const handleAddStep = useCallback((label = 'New Step') => {
    contentRef.current?.handleAddNode?.(label);
    setHasUnsavedChanges(true);
  }, []);

  const onStepClick = useCallback((stepData) => {
    setSelectedElement({ type: 'step', id: String(stepData.id), data: stepData });
  }, []);

  const onEdgeClick = useCallback((edgeData) => {
    setSelectedElement({ type: 'transition', id: edgeData.id, data: edgeData });
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedElement({ type: 'workflow' });
  }, []);

  const handleUpdateStep = useCallback((stepId, updates) => {
    contentRef.current?.updateNodeData(stepId, {
      label: updates.name || updates.label,
      role: updates.role,
      description: updates.description,
      instruction: updates.instruction,
      is_start: updates.is_start || updates.isStart,
      is_end: updates.is_end || updates.isEnd,
    });
    setHasUnsavedChanges(true);
  }, []);

  const handleUpdateTransition = useCallback((transitionId, updates) => {
    contentRef.current?.updateEdgeData(transitionId, { label: updates.label || updates.name });
    setHasUnsavedChanges(true);
  }, []);

  const handleDeleteStep = useCallback((stepId) => {
    const step = workflowData?.graph?.nodes?.find((s) => String(s.id) === String(stepId));
    if (!step) return;

    setConfirmDialog({
      type: 'deleteStep',
      id: stepId,
      title: 'Delete Step',
      message: `Are you sure you want to delete "${step.name}"? This will also remove all connected transitions.`,
    });
  }, [workflowData]);

  const handleDeleteTransition = useCallback((transitionId) => {
    setConfirmDialog({
      type: 'deleteTransition',
      id: transitionId,
      title: 'Delete Transition',
      message: `Are you sure you want to delete this transition?`,
    });
  }, []);

  const confirmDelete = useCallback(() => {
    if (!confirmDialog) return;

    if (confirmDialog.type === 'deleteStep') {
      contentRef.current?.deleteNode(confirmDialog.id);
    } else if (confirmDialog.type === 'deleteTransition') {
      contentRef.current?.deleteEdge(confirmDialog.id);
    }
    
    setSelectedElement(null);
    setHasUnsavedChanges(true);
    setConfirmDialog(null);
  }, [confirmDialog]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  if (!workflowData) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <RefreshCw className={styles.loadingSpinner} />
          <p className={styles.loadingText}>Loading workflow...</p>
        </div>
      </div>
    );
  }

  const stepCount = workflowData.graph?.nodes?.length || 0;
  const transitionCount = workflowData.graph?.edges?.length || 0;

  return (
    <div className={styles.pageWrapper}>
      <AdminNav />
      
      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <div className={styles.unsavedWarning}>
          <div className={styles.warningContent}>
            <AlertCircle className={styles.warningIcon} />
            <span>You have unsaved changes</span>
          </div>
          <button onClick={handleSave} className={styles.saveNowBtn}>
            Save now
          </button>
        </div>
      )}

      {/* Top Ribbon */}
      <div className={styles.ribbon}>
        <div className={styles.ribbonInfo}>
          <div>
            <h2 className={styles.ribbonTitle}>{workflowData.workflow?.name}</h2>
            <span className={styles.ribbonSubtitle}>
              {workflowData.workflow?.category && `${workflowData.workflow.category}`}
              {workflowData.workflow?.category && workflowData.workflow?.sub_category && ' • '}
              {workflowData.workflow?.sub_category && `${workflowData.workflow.sub_category}`}
            </span>
          </div>
        </div>

        <div className={styles.ribbonActions}>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className={styles.btnPrimary}
          >
            {isSaving ? (
              <RefreshCw className={styles.loadingSpinner} style={{ width: '16px', height: '16px', margin: 0 }} />
            ) : (
              <Save style={{ width: '16px', height: '16px' }} />
            )}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          
          <div className={styles.divider} />
          
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className={styles.btnIcon}
          >
            <Undo />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className={styles.btnIcon}
          >
            <Redo />
          </button>

          <div className={styles.divider} />

          <button
            onClick={() => setShowSLAModal(true)}
            className={styles.btnSecondary}
          >
            <Settings style={{ width: '16px', height: '16px' }} />
            Manage SLA
          </button>

          <button
            onClick={() => setIsEditingGraph(!isEditingGraph)}
            className={`${styles.btnToggle} ${isEditingGraph ? styles.btnToggleActive : styles.btnToggleInactive}`}
          >
            {isEditingGraph ? '🔓 Editing' : '🔒 Locked'}
          </button>
        </div>

        <div className={styles.ribbonStats}>
          {stepCount} steps • {transitionCount} transitions
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Toolbar */}
        {!toolbarCollapsed ? (
          <div className={styles.relativeContainer}>
            <WorkflowEditorToolbar
              onAddStep={handleAddStep}
              stepCount={stepCount}
              transitionCount={transitionCount}
              isEditingGraph={isEditingGraph}
            />
            <button
              onClick={() => setToolbarCollapsed(true)}
              className={`${styles.collapseBtn} ${styles.collapseBtnLeft}`}
              title="Hide toolbar"
            >
              <ChevronLeft />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setToolbarCollapsed(false)}
            className={`${styles.expandBtn} ${styles.expandBtnLeft}`}
            title="Show toolbar"
          >
            <ChevronRight />
          </button>
        )}

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
            />
          </ReactFlowProvider>
        </div>

        {/* Sidebar */}
        {!sidebarCollapsed ? (
          <div className={styles.relativeContainer}>
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
            <button
              onClick={() => setSidebarCollapsed(true)}
              className={`${styles.collapseBtn} ${styles.collapseBtnRight}`}
              title="Hide sidebar"
            >
              <ChevronRight />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className={`${styles.expandBtn} ${styles.expandBtnRight}`}
            title="Show sidebar"
          >
            <ChevronLeft />
          </button>
        )}
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
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
