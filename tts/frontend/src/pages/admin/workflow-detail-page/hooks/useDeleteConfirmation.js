import { useState, useCallback } from 'react';

/**
 * Hook for managing delete confirmation dialogs
 */
export function useDeleteConfirmation(contentRef, workflowData, setSelectedElement, setHasUnsavedChanges) {
  const [confirmDialog, setConfirmDialog] = useState(null);

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
  }, [confirmDialog, contentRef, setSelectedElement, setHasUnsavedChanges]);

  const cancelDelete = useCallback(() => {
    setConfirmDialog(null);
  }, []);

  return {
    confirmDialog,
    handleDeleteStep,
    handleDeleteTransition,
    confirmDelete,
    cancelDelete,
  };
}
