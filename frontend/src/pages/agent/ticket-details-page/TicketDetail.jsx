import React, { useState } from 'react';
import styles from './WorkflowBuilder.module.css';

import getRoles from '../../../api/getRoles';
import useCreateStep from '../../../api/createStep';
import useWorkflow from '../../../api/useWorkflow';
import useCreateTransition from '../../../api/useCreateTransition';

const WorkflowBuilder = () => {
  const { role } = getRoles();
  const { createStep } = useCreateStep();
  const { createTransition } = useCreateTransition();

  const {
    workflow,
    roles,
    steps,
    actions,
    transitions,
    loading,
    error,
    removeStep,
    removeTransition,
    getRoleName,
    getActionName,
    getStepName,
    refetch,
  } = useWorkflow(1); // replace with dynamic ID if needed

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

  // Create Step Handler
  const handleCreateStep = async () => {
    if (!StepformData.name || !StepformData.role_id || !workflow?.workflow_id) return;

    const payload = {
      ...StepformData,
      workflow_id: workflow.workflow_id,
      description: StepformData.name,
    };

    await createStep(payload);
    await refetch();

    setStepFormData({
      step_id: '',
      workflow_id: null,
      role_id: '',
      name: '',
      description: '',
    });
  };

  // Create Transition Handler
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

    await createTransition(payload);
    await refetch();

    setNewTransition({
      from: '',
      to: '',
      actionName: '',
      actionDescription: '',
    });
  };

  // Loading/Error states
  if (loading) return <div className={styles.container}>Loading...</div>;
  if (error) return <div className={styles.container}>Error: {error}</div>;
  if (!workflow) return <div>No workflow found</div>;

  return (
    <div className={styles.container}>
      {/* LEFT PANEL */}
      <div className={styles.leftPanel}>
        <div className={styles.workflowSection}>
          <h2 className={styles.heading}>{workflow.name}</h2>
          <p className={styles.textGray}>{workflow.description}</p>
          <span className={styles.badge}>{workflow.status}</span>
        </div>

        <div className={styles.stepSection}>
          <h3 className={styles.heading}>Workflow Steps</h3>

          {steps.map(step => (
            <div key={step.step_id} className={styles.stepCard}>
              <div className={styles.stepHeader}>
                <h4>{step.order}. {step.description}</h4>
                <button onClick={() => removeStep(step.step_id)} className={styles.removeButton}>Remove</button>
              </div>
              <p className={styles.textGray}>Role: {getRoleName(step.role_id)}</p>
              {transitions.filter(t => t.from_step_id === step.step_id).map(t => (
                <p key={t.transition_id} className={styles.textGray}>
                  {getActionName(t.action_id)} → {getStepName(t.to_step_id)}
                </p>
              ))}
            </div>
          ))}

          {/* Add Step Form */}
          <div className={styles.stepCardGray}>
            <h4>Add New Step</h4>
            <input
              type="text"
              placeholder="Step name"
              value={StepformData.name}
              onChange={e => setStepFormData({ ...StepformData, name: e.target.value })}
              className={styles.input}
            />

            <select
              value={StepformData.role_id}
              onChange={e => setStepFormData({ ...StepformData, role_id: e.target.value })}
              className={styles.select}
            >
              <option value="">Select Role</option>
              {role.map(r => (
                <option key={r.role_id} value={r.role_id}>{r.name}</option>
              ))}
            </select>

            <button onClick={handleCreateStep} className={styles.button}>Add Step</button>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className={styles.rightPanel}>
        <div className={styles.stepSection}>
          <h3 className={styles.heading}>Workflow Flow</h3>

          {transitions.map(t => (
            <div key={t.transition_id} className={styles.stepCardGray}>
              <p>{getStepName(t.from_step_id)} → {getStepName(t.to_step_id)}</p>
              <p className={styles.textGray}>Action: {getActionName(t.action_id)}</p>
              <button onClick={() => removeTransition(t.transition_id)} className={styles.removeButton}>Remove</button>
            </div>
          ))}

          {/* Add Transition Form */}
          <div className={styles.stepCardGray}>
            <h4>Add New Flow</h4>

            <label>From Step</label>
            <select
              value={newTransition.from}
              onChange={e => setNewTransition({ ...newTransition, from: e.target.value })}
              className={styles.select}
            >
              <option value="">Select step</option>
              {steps.map(s => (
                <option key={s.step_id} value={s.step_id}>{s.description}</option>
              ))}
            </select>

            <label>To Step</label>
            <select
              value={newTransition.to}
              onChange={e => setNewTransition({ ...newTransition, to: e.target.value })}
              className={styles.select}
            >
              <option value="">End workflow</option>
              {steps.filter(s => s.step_id !== newTransition.from).map(s => (
                <option key={s.step_id} value={s.step_id}>{s.description}</option>
              ))}
            </select>

            <label>Action Name</label>
            <input
              type="text"
              value={newTransition.actionName}
              onChange={e => setNewTransition({ ...newTransition, actionName: e.target.value })}
              placeholder="Enter action name"
              className={styles.input}
            />

            <label>Action Description</label>
            <input
              type="text"
              value={newTransition.actionDescription}
              onChange={e => setNewTransition({ ...newTransition, actionDescription: e.target.value })}
              placeholder="Enter action description"
              className={styles.input}
            />

            <button onClick={handleCreateTransition} className={styles.button}>Add Flow</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowBuilder;
