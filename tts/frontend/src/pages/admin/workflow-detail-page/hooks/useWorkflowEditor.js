import { useCallback, useRef, useState, useEffect } from 'react';
import { useWorkflowAPI, slugToWorkflowName } from '../../../../api/useWorkflowAPI';
import { useWorkflowRefresh } from '../../../../components/workflow/WorkflowRefreshContext';
import { validateWorkflowGraph, formatValidationErrors, getDefaultRole } from '../../../../utils/workflowValidation';

/**
 * Hook for managing workflow editor state and operations
 * @param {string} identifier - Workflow ID or name (slug)
 * @param {Array} roles - Available roles for the workflow
 * @param {Function} triggerRefresh - Callback to trigger workflow list refresh
 * @param {boolean} isNameBased - Whether the identifier is a name (slug) or ID
 */
export function useWorkflowEditor(identifier, roles, triggerRefresh, isNameBased = false) {
  const [workflowData, setWorkflowData] = useState(null);
  const [resolvedWorkflowId, setResolvedWorkflowId] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [isEditingGraph, setIsEditingGraph] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const contentRef = useRef();
  const { getWorkflowDetail, getWorkflowDetailByName } = useWorkflowAPI();
  const { refreshTrigger } = useWorkflowRefresh();

  // Load workflow data (triggered by refreshTrigger from context)
  useEffect(() => {
    const loadWorkflow = async () => {
      try {
        let data;
        if (isNameBased) {
          // Convert slug back to name and fetch by name
          const workflowName = slugToWorkflowName(identifier);
          data = await getWorkflowDetailByName(workflowName);
        } else {
          // Fetch by ID (backward compatibility)
          data = await getWorkflowDetail(identifier);
        }
        setWorkflowData(data);
        // Store the resolved workflow ID for subsequent API calls
        if (data?.workflow?.workflow_id) {
          setResolvedWorkflowId(data.workflow.workflow_id);
        }
      } catch (err) {
        console.error('Failed to load workflow:', err);
      }
    };
    loadWorkflow();
  }, [identifier, isNameBased, getWorkflowDetail, getWorkflowDetailByName, refreshTrigger]);

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
        // Trigger refresh to reload workflow data from API
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

  // Handle node update from inline editing - sync with selected element
  const onNodeUpdate = useCallback((nodeId, updatedData) => {
    setSelectedElement((prev) => {
      // Only update if this node is currently selected
      if (prev?.type === 'step' && String(prev.id) === String(nodeId)) {
        return { ...prev, data: { ...prev.data, ...updatedData } };
      }
      return prev;
    });
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

  // Handle workflow configuration update (from WorkflowConfigPanel)
  const handleWorkflowConfigUpdate = useCallback((updatedWorkflow) => {
    // Update local workflow data with the new configuration
    setWorkflowData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        workflow: {
          ...prev.workflow,
          ...updatedWorkflow,
        },
      };
    });
    // Trigger a refresh of the workflow list in parent components
    triggerRefresh?.();
    // Force reload the workflow data to get fresh data from server
    setRefreshCounter(c => c + 1);
  }, [triggerRefresh]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  return {
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
  };
}
