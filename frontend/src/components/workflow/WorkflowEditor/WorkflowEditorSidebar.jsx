import React from 'react';
import styles from './WorkflowEditorLayout.module.css';
import StepEditPanel from './StepEditPanel';
import TransitionEditPanel from './TransitionEditPanel';

const WorkflowEditorSidebar = ({
  activeSidebarTab,
  setActiveSidebarTab,
  editingStep,
  setEditingStep,
  editingTransition,
  setEditingTransition,
  roles,
  contentRef,
  setHasUnsavedChanges,
  sidebarWidth,
  isResizing,
  handleResizeStart,
}) => {
  return (
    <aside className={styles.rightPanel} style={{ width: `${sidebarWidth}px` }}>
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
                onChange={(updatedData) => {
                  // Real-time update for temporary steps
                  if (String(editingStep.id).startsWith('temp-')) {
                    contentRef.current?.updateNodeData(editingStep.id, {
                      label: updatedData.name,
                      role: updatedData.role,
                      description: updatedData.description,
                      instruction: updatedData.instruction,
                      is_start: updatedData.is_start,
                      is_end: updatedData.is_end,
                    });
                  }
                }}
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
  );
};

export default WorkflowEditorSidebar;