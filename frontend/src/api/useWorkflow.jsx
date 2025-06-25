import { useState, useEffect, useCallback } from 'react';
import api from './axios'; // your axios instance (with baseURL configured)

export default function useWorkflow(workflowId) {
  const [workflow, setWorkflow] = useState(null);
  const [roles, setRoles] = useState([]);
  const [steps, setSteps] = useState([]);
  const [actions, setActions] = useState([]);
  const [transitions, setTransitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Create fetch function and memoize it
  const fetchWorkflowData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.get(`/workflow/all/${workflowId}`);
      const w = res.data.workflow;

      setWorkflow({
        workflow_id: w.workflow_id,
        name: w.name,
        description: w.description,
        status: w.status,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        low_sla: w.low_sla,
        medium_sla: w.medium_sla,
        high_sla: w.high_sla,
        urgent_sla: w.urgent_sla,
        category: w.category,
        sub_category: w.sub_category,
      });
      setRoles(w.roles || []);
      setSteps(w.steps || []);
      setActions(w.actions || []);
      setTransitions(w.transitions || []);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  // ✅ Run on initial mount
  useEffect(() => {
    if (workflowId) {
      fetchWorkflowData();
    }
  }, [workflowId, fetchWorkflowData]);

  // Mutations (local only for now)
  const addStep = (newStep) => {
    const step = {
      step_id: `temp-${Date.now()}`,
      name: newStep.name,
      description: newStep.name,
      role_id: newStep.role,
      order: steps.length + 1,
      workflow_id: workflow?.workflow_id,
      is_initialized: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setSteps((prev) => [...prev, step]);
  };

  const removeStep = (id) => {
    setSteps((prev) => prev.filter(s => s.step_id !== id));
    setTransitions((prev) => prev.filter(t => t.from_step_id !== id && t.to_step_id !== id));
  };

  const addTransition = (newTransition) => {
    const t = {
      transition_id: `temp-${Date.now()}`,
      from_step_id: newTransition.from,
      to_step_id: newTransition.to || null,
      action_id: newTransition.action
    };
    setTransitions((prev) => [...prev, t]);
  };

  const removeTransition = (id) => {
    setTransitions((prev) => prev.filter(t => t.transition_id !== id));
  };
  
  const getRoleName = (id) => roles.find(r => r.role_id === id)?.name || id;
  const getActionName = (id) => actions.find(a => a.action_id === id)?.name || id;
  const getStepNameTo = (id) => {
    console.log('id', id)
    if (!id) return 'Start';
    return steps.find(s => s.step_id === id)?.description || 'Unknown';
  };
  const getStepNameFrom = (id) => {
    console.log('id', id)
    if (!id) return 'End';
    return steps.find(s => s.step_id === id)?.description || 'Unknown';
  };

  return {
    workflow,
    roles,
    steps,
    actions,
    transitions,
    loading,
    error,
    addStep,
    removeStep,
    addTransition,
    removeTransition,
    getRoleName,
    getActionName,
    getStepNameTo,
    getStepNameFrom,
    refetch: fetchWorkflowData, // ✅ expose refetch
  };
}
