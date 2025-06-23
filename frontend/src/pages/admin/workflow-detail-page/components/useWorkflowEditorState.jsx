import { useState, useEffect } from 'react';
import getRoles from '../../../../api/getRoles';
import useWorkflow from '../../../../api/useWorkflow';
import useCreateStep from '../../../../api/createStep';
import useCreateTransition from '../../../../api/useCreateTransition';
import useStepUpdater from '../../../../api/useUpdateStep';
import useUpdateStepTransition from '../../../../api/useUpdateStepTransition';
import { useWorkflowRefresh } from '../../../../components/workflow/WorkflowRefreshContext';

export default function useWorkflowEditorState(uuid) {
  const { role } = getRoles();
  const { createStep } = useCreateStep();
  const { createTransition } = useCreateTransition();
  const { updateStep } = useStepUpdater();
  const { updateTransition } = useUpdateStepTransition();
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
    getStepName,
  } = useWorkflow(uuid);

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

  useEffect(() => {
    setSteps(fetchedSteps);
  }, [fetchedSteps]);

  useEffect(() => {
    setTransitions(fetchedTransitions);
  }, [fetchedTransitions]);

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

  const handleCreateTransition = async () => {
    if (!newTransition.from || !newTransition.actionName || !workflow?.workflow_id) return;
    const payload = {
      workflow_id: workflow.workflow_id,
      from_step_id: newTransition.from,
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

  const handleEditStep = (step) => {
    setEditStepModal({ isOpen: true, step: { ...step } });
  };

  const handleEditTransition = (transition) => {
    setPreviousTransition({ ...transition }); // ← Save original before editing
    setEditTransitionModal({
      isOpen: true,
      transition: {
        ...transition,
        action_name: getActionName(transition.action_id) || '',
      },
    });
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
      setPreviousTransition(null); // clear undo
      setEditTransitionModal({ isOpen: false, transition: null });
    }
  };

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
    handleCreateTransition,
    handleUpdateTransition,
    getRoleName,
    getActionName,
    getStepName,
    removeStep,
    removeTransition,
    editStepModal,
    setEditStepModal,
    editTransitionModal,
    setEditTransitionModal,
    handleUpdateStep,
    handleEditStep,
    handleEditTransition,
    handleUndoTransition,
    previousTransition, // expose if you want to enable/disable Undo button
  };
}
