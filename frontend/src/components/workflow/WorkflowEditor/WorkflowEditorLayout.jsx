import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './WorkflowEditorLayout.module.css';
import WorkflowEditPanel from './WorkflowEditPanel';
import WorkflowEditorContent from './WorkflowEditorContent';
import WorkflowEditorSidebar from './WorkflowEditorSidebar';
import WorkflowEditorToolbar from './WorkflowEditorToolbar';
import { useWorkflowAPI } from '../../../api/useWorkflowAPI';
import { useWorkflowRoles } from '../../../api/useWorkflowRoles';
import AdminNav from "../../../components/navigation/AdminNav";

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
      // Since sidebar is now on the right, dragging right decreases width
      const newWidth = Math.max(200, Math.min(500, startWidthRef.current - diff)); // Min 200px, max 500px
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
      <AdminNav/>
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
            className={`${styles.actionBtn} ${styles.actionBtnPrimary} ${hasUnsavedChanges ? styles.actionBtnUnsaved : ''}`}
            onClick={handleSaveAll}
            title={hasUnsavedChanges ? 'You have unsaved changes - click to save' : 'All changes saved'}
            disabled={saveStatus === 'saving'}
          >
            {/* <span className={styles.btnIcon}>{hasUnsavedChanges ? '⚠️' : '✅'}</span> */}
            <span className={styles.btnText}>Save Changes</span>
          </button>
        </div>
      </div>

      {/* MANAGE TAB */}
      {activeTopTab === 'manage' && (
        <div className={styles.editorContainer}>
          <WorkflowEditorToolbar
            handleAddStep={handleAddStep}
            handleSaveAll={handleSaveAll}
            hasUnsavedChanges={hasUnsavedChanges}
            saveStatus={saveStatus}
            workflowData={workflowData}
            isEditingGraph={isEditingGraph}
            onToggleEditMode={() => setIsEditingGraph(!isEditingGraph)}
          />

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

          <WorkflowEditorSidebar
            activeSidebarTab={activeSidebarTab}
            setActiveSidebarTab={setActiveSidebarTab}
            editingStep={editingStep}
            setEditingStep={setEditingStep}
            editingTransition={editingTransition}
            setEditingTransition={setEditingTransition}
            roles={roles}
            contentRef={contentRef}
            setHasUnsavedChanges={setHasUnsavedChanges}
            sidebarWidth={sidebarWidth}
            isResizing={isResizing}
            handleResizeStart={handleResizeStart}
          />
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
