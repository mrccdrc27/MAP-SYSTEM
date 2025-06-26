import { useState, useEffect } from 'react';
import getRoles from '../../../../api/getRoles';
import useWorkflow from '../../../../api/useWorkflow';
import useCreateStep from '../../../../api/createStep';
import useCreateTransition from '../../../../api/useCreateTransition';
import useStepUpdater from '../../../../api/useUpdateStep';
import useUpdateStepTransition from '../../../../api/useUpdateStepTransition';
import { useWorkflowRefresh } from '../../../../components/workflow/WorkflowRefreshContext';

export default function useWorkflowEditorState(uuid) {
  // Hooks and API
  const { role } = getRoles();
  const { createStep } = useCreateStep();
  const { createTransition } = useCreateTransition();
  const { updateStep, deleteStep } = useStepUpdater();
  const { updateTransition, deleteTransition } = useUpdateStepTransition();
  const { triggerRefresh } = useWorkflowRefresh();


  const {
    workflow,
    steps: fetchedSteps,
    transitions: fetchedTransitions,
    loading,
    error,
    removeStep,
    removeTransition,
    getRoleName,
    getActionName,
    getStepNameTo,
    getStepNameFrom,
  } = useWorkflow(uuid);

  // State
  const [steps, setSteps] = useState([]);
  const [transitions, setTransitions] = useState([]);
  const [previousTransition, setPreviousTransition] = useState(null);

  const [StepformData, setStepFormData] = useState({
    step_id: '',
    workflow_id: null,
    role_id: '',
    name: '',
    description: '',
  });

  const [newTransition, setNewTransition] = useState({
    from: '',
    to: '',
    actionName: '',
    actionDescription: '',
  });

  const [editStepModal, setEditStepModal] = useState({ isOpen: false, step: null });
  const [editTransitionModal, setEditTransitionModal] = useState({ isOpen: false, transition: null });

  // Effects
  useEffect(() => {
    setSteps(fetchedSteps);
  }, [fetchedSteps]);

  useEffect(() => {
    setTransitions(fetchedTransitions);
  }, [fetchedTransitions]);

  // --- Step Logic ---
  const handleCreateStep = async () => {
    if (!StepformData.name || !StepformData.role_id || !workflow?.workflow_id) return;
    const payload = {
      ...StepformData,
      workflow_id: workflow.workflow_id,
      description: StepformData.name,
    };
    const created = await createStep(payload);
    if (created?.step_id) {
      setSteps((prev) => [...prev, created]);
      triggerRefresh();
    }
    setStepFormData({
      step_id: '',
      workflow_id: null,
      role_id: '',
      name: '',
      description: '',
    });
  };

  const handleUpdateStep = async () => {
    const step = editStepModal.step;
    if (!step?.step_id || !step.name || !step.role_id) return;

    const updated = await updateStep({
      stepId: step.step_id,
      name: step.name,
      role_id: step.role_id,
    });

    if (updated) {
      setSteps((prev) =>
        prev.map((s) => (s.step_id === updated.step_id ? updated : s))
      );
      setEditStepModal({ isOpen: false, step: null });
      triggerRefresh();
    }
  };

  const handleDeleteStep = async (stepId) => {
    const confirmed = window.confirm("Are you sure you want to delete this step?");
    if (!confirmed) return;

    const success = await deleteStep(stepId);
    if (success) {
      setSteps((prev) => prev.filter((s) => s.step_id !== stepId));
      triggerRefresh();
    }
  };

  const handleEditStep = (step) => {
    setEditStepModal({ isOpen: true, step: { ...step } });
  };

  // --- Transition Logic ---
  const handleCreateTransition = async () => {
    const hasAction = newTransition.actionName?.trim();
    const hasWorkflow = workflow?.workflow_id;
  
    // Explicitly allow from = "" (which maps to null)
    if (newTransition.from === undefined || !hasAction || !hasWorkflow) return;
  
    const payload = {
      workflow_id: workflow.workflow_id,
      from_step_id: newTransition.from || null,  // "" → null
      to_step_id: newTransition.to || null,
      action: {
        name: newTransition.actionName,
        description: newTransition.actionDescription || '',
      },
    };
  
    const created = await createTransition(payload);
    if (created?.transition_id) {
      setTransitions((prev) => [...prev, created]);
      triggerRefresh();
    }
  
    setNewTransition({ from: '', to: '', actionName: '', actionDescription: '' });
  };
  

  const handleUpdateTransition = async () => {
    const t = editTransitionModal.transition;
    if (!t?.transition_id || !t?.from_step_id || !t?.to_step_id) return;

    const updated = await updateTransition(t.transition_id, {
      action_name: t.action_name,
      from_step_id: t.from_step_id,
      to_step_id: t.to_step_id,
    });

    if (updated?.transition_id) {
      setTransitions((prev) =>
        prev.map((tr) => (tr.transition_id === updated.transition_id ? updated : tr))
      );
      triggerRefresh();
    }

    setEditTransitionModal({ isOpen: false, transition: null });
  };

  const handleDeleteTransition = async (transitionId) => {
    const confirmed = window.confirm("Are you sure you want to delete this transition?");
    if (!confirmed) return;
  
    const success = await deleteTransition(transitionId);
    if (success) {
      setTransitions((prev) => prev.filter((t) => t.transition_id !== transitionId));
      triggerRefresh();
    }
  };


  const handleEditTransition = (transition) => {
    setPreviousTransition({ ...transition });
    setEditTransitionModal({
      isOpen: true,
      transition: {
        ...transition,
        action_name: getActionName(transition.action_id) || '',
      },
    });
  };

  const handleUndoTransition = async () => {
    if (!previousTransition) return;

    const { transition_id, from_step_id, to_step_id, action_id } = previousTransition;
    const action_name = getActionName(action_id) || '';

    const reverted = await updateTransition(transition_id, {
      from_step_id,
      to_step_id,
      action_name,
    });

    if (reverted?.transition_id) {
      setTransitions((prev) =>
        prev.map((tr) => (tr.transition_id === reverted.transition_id ? reverted : tr))
      );
      triggerRefresh();
      setPreviousTransition(null);
      setEditTransitionModal({ isOpen: false, transition: null });
    }
  };

  // --- Return ---
  return {
    uuid,
    workflow,
    steps,
    transitions,
    role,
    loading,
    error,
    StepformData,
    setStepFormData,
    newTransition,
    setNewTransition,
    handleCreateStep,
    handleUpdateStep,
    handleDeleteStep,
    handleEditStep,
    handleCreateTransition,
    handleUpdateTransition,
    handleEditTransition,
    handleUndoTransition,
    editStepModal,
    setEditStepModal,
    editTransitionModal,
    setEditTransitionModal,
    getRoleName,
    getActionName,
    getStepNameTo,
    getStepNameFrom,
    removeStep,
    removeTransition,
    previousTransition,

    handleDeleteTransition,
  };
}
