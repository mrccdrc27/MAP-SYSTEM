import { useCallback, useRef, useState, useEffect } from 'react';
import { useWorkflowAPI } from '../../../../api/useWorkflowAPI';
import { validateWorkflowGraph, formatValidationErrors, getDefaultRole } from '../../../../utils/workflowValidation';

/**
 * Hook for managing workflow editor state and operations
 */
export function useWorkflowEditor(workflowId, roles, triggerRefresh) {
  const [workflowData, setWorkflowData] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [isEditingGraph, setIsEditingGraph] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  const contentRef = useRef();
  const { getWorkflowDetail } = useWorkflowAPI();

  // Load workflow data
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

  // Undo handler
  const handleUndo = useCallback(() => {
    contentRef.current?.undo?.();
  }, []);

  // Redo handler
  const handleRedo = useCallback(() => {
    contentRef.current?.redo?.();
  }, []);

  // Save handler with validation
  const handleSave = useCallback(async () => {
    const currentNodes = contentRef.current?.getNodes?.() || [];
    const currentEdges = contentRef.current?.getEdges?.() || [];
    
    const validation = validateWorkflowGraph(currentNodes, currentEdges, roles);
    
    if (!validation.isValid) {
      const errorMessage = formatValidationErrors(validation);
      alert(`Cannot save workflow:\n\n${errorMessage}`);
      return;
    }
    
    if (validation.warnings?.length > 0) {
      const warningMessage = validation.warnings.join('\n');
      const proceed = window.confirm(
        `The workflow has the following warnings:\n\n${warningMessage}\n\nDo you want to save anyway?`
      );
      if (!proceed) return;
    }
    
    setIsSaving(true);
    try {
      if (contentRef.current?.saveChanges) {
        await contentRef.current.saveChanges();
        setHasUnsavedChanges(false);
        triggerRefresh?.();
      }
    } catch (err) {
      console.error('Failed to save:', err);
      alert(`Failed to save workflow: ${err.response?.data?.error || err.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  }, [roles, triggerRefresh]);

  // Add step handler
  const handleAddStep = useCallback((label = 'New Step', role = null) => {
    const stepRole = role || getDefaultRole(roles);
    
    if (!stepRole) {
      alert('Cannot add step: No roles available. Please configure roles in the system first.');
      return;
    }
    
    contentRef.current?.handleAddNode?.(label, stepRole);
    setHasUnsavedChanges(true);
  }, [roles]);

  // Selection handlers
  const onStepClick = useCallback((stepData) => {
    setSelectedElement({ type: 'step', id: String(stepData.id), data: stepData });
  }, []);

  const onEdgeClick = useCallback((edgeData) => {
    setSelectedElement({ type: 'transition', id: edgeData.id, data: edgeData });
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedElement({ type: 'workflow' });
  }, []);

  // Update handlers
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

  // History change handler
  const handleHistoryChange = useCallback((canUndoVal, canRedoVal) => {
    setCanUndo(canUndoVal);
    setCanRedo(canRedoVal);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          handleSave();
        }
        return;
      }

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
  }, [handleUndo, handleRedo, handleSave]);

  return {
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
  };
}
