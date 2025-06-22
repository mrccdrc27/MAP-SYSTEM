import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styles from './WorkflowEditor.module.css';

import getRoles from '../../../api/getRoles';
import useCreateStep from '../../../api/createStep';
import useWorkflow from '../../../api/useWorkflow';
import useCreateTransition from '../../../api/useCreateTransition';
import useStepUpdater from '../../../api/useUpdateStep';
import useUpdateStepTransition from '../../../api/useUpdateStepTransition';
import NewWorkflowVisualizer from "../../../components/workflow/NewWorkflowVisualizer";

const WorkflowEditor = () => {
    const { uuid } = useParams(); // Get workflow UUID from route
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
  } = useWorkflow(uuid); // replace with dynamic ID if needed

  // Only the two state objects that exist in the API version
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

  // Modal states
  const [editStepModal, setEditStepModal] = useState({
    isOpen: false,
    step: null,
  });

  const [editTransitionModal, setEditTransitionModal] = useState({
    isOpen: false,
    transition: null,
  });


  const handleUpdateTransitionField = (field, value) => {
    setEditTransitionModal(prev => ({
      ...prev,
      transition: {
        ...prev.transition,
        [field]: value,
      },
    }));
  };
  

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

  // Edit Step Handler
  const handleEditStep = (step) => {
    setEditStepModal({
      isOpen: true,
      step: { ...step }
    });
  };

  
  const [triggerUpdate, setTriggerUpdate] = useState(false);

  // Step update hook using modal input values
  const { data } = useStepUpdater({
    stepId: editStepModal.step?.step_id || '',
    name: editStepModal.step?.name || '',  // update if you're using `description` as name
    role_id: editStepModal.step?.role_id || '',
    trigger: triggerUpdate,
  });

  // Trigger step update on button click
  const handleUpdateStep = () => {
    setTriggerUpdate(true);
    refetch(); // refetch to get updated data
  };

  // Watch for success and close modal/reset trigger
  useEffect(() => {
    if (!loading && data) {
      setEditStepModal({ isOpen: false, step: null });
      setTriggerUpdate(false); // reset trigger for next use
    }
  }, [data, loading]);

  // Edit Transition Handler
  const handleEditTransition = (transition) => {
    setEditTransitionModal({
      isOpen: true,
      transition: {
        ...transition,
        action_name: getActionName(transition.action_id) || '', // include editable value
      },
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

    await createTransition(payload);
    await refetch();

    setNewTransition({
      from: '',
      to: '',
      actionName: '',
      actionDescription: '',
    });
  };
  

const { updateTransition, loading: updating, error: updateError } = useUpdateStepTransition();

const handleUpdateTransition = () => {
  const transition = editTransitionModal.transition;

  if (!transition?.transition_id || !transition?.from_step_id || !transition?.to_step_id) {
    alert('Please fill out all required fields.');
    return;
  }

  updateTransition(transition.transition_id, {
    action_name: getActionName(transition.action_id), // or transition.action_name if stored
    from_step_id: transition.from_step_id,
    to_step_id: transition.to_step_id,
  }).then(() => {
    setEditTransitionModal({ isOpen: false, transition: null });
    // Optionally refresh transition list here
  });
};

  // Helper function to build the flow visualization data based on ALL transitions
  const buildFlowVisualization = () => {
    if (!steps.length) return [];

    // Sort steps by order to maintain logical flow
    const sortedSteps = [...steps].sort((a, b) => a.order - b.order);
    
    // Build comprehensive flow showing all steps and their transitions
    const flowData = sortedSteps.map(step => {
      // Find all outgoing transitions from this step
      const outgoingTransitions = transitions.filter(t => t.from_step_id === step.step_id);
      
      return {
        step: step,
        transitions: outgoingTransitions,
        hasIncoming: transitions.some(t => t.to_step_id === step.step_id),
        hasOutgoing: outgoingTransitions.length > 0
      };
    });

    return flowData;
  };

  // Loading/Error states
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingText}>Loading workflow data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.errorText}>Error loading workflow: {error}</div>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingText}>No workflow data found</div>
        </div>
      </div>
    );
  }

  const flowVisualization = buildFlowVisualization();

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <div>
          <NewWorkflowVisualizer workflowId={uuid}/>
        </div>
        <h1 className={styles.title}>{workflow.name}</h1>
        <p className={styles.description}>{workflow.description}</p>
        <span className={styles.statusBadge}>
          {workflow.status}
        </span>
      </div>

      <div className={styles.grid}>
        {/* LEFT PANEL - Steps */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Workflow Steps</h2>
          
          <div className={styles.stepsList}>
            {steps.map(step => (
              <div key={step.step_id} className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <div>
                    <h3 className={styles.stepTitle}>{step.order}. {step.name}</h3>
                    <p className={styles.stepRole}>Role: {getRoleName(step.role_id)}</p>
                  </div>
                  <div className={styles.buttonGroup}>
                    <button 
                      onClick={() => handleEditStep(step)}
                      className={styles.editButton}
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => removeStep(step.step_id)}
                      className={styles.removeButton}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                
                {/* Show transitions for this step */}
                <div className={styles.transitionsList}>
                  {transitions.filter(t => t.from_step_id === step.step_id).map((transition) => (
                    <div key={transition.transition_id} className={styles.transitionItem}>
                      {getActionName(transition.action_id)} → {getStepName(transition.to_step_id)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Add Step Form */}
          <div className={styles.addStepForm}>
            <h3 className={styles.formTitle}>Add New Step</h3>
            <div className={styles.formFields}>
              <input
                type="text"
                placeholder="Step name"
                value={StepformData.name}
                onChange={(e) => setStepFormData({...StepformData, name: e.target.value})}
                className={styles.input}
              />
              <select
                value={StepformData.role_id}
                onChange={(e) => setStepFormData({...StepformData, role_id: e.target.value})}
                className={styles.select}
              >
                <option value="">Select Role</option>
                {role.map(r => (
                  <option key={r.role_id} value={r.role_id}>{r.name}</option>
                ))}
              </select>
              <button 
                onClick={handleCreateStep}
                className={styles.addButton}
              >
                Add Step
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Workflow Flow */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Workflow Flow</h2>
          
          {/* Existing transitions */}
          <div className={styles.transitionsSection}>
            {transitions.map((transition) => (
              <div key={transition.transition_id} className={styles.transitionCard}>
                <div className={styles.transitionHeader}>
                  <div>
                    <div className={styles.transitionFlow}>
                      <span className={styles.transitionStep}>{getStepName(transition.from_step_id)}</span>
                      <span className={styles.transitionArrow}>→</span>
                      <span className={styles.transitionStep}>{getStepName(transition.to_step_id)}</span>
                    </div>
                    <div className={styles.transitionAction}>
                      Action: {getActionName(transition.action_id)}
                    </div>
                  </div>
                  <div className={styles.buttonGroup}>
                    <button 
                      onClick={() => handleEditTransition(transition)}
                      className={styles.editButton}
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => removeTransition(transition.transition_id)}
                      className={styles.removeButton}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Transition Form */}
          <div className={styles.addTransitionForm}>
            <h3 className={styles.formTitle}>Add New Flow</h3>
            <div className={styles.formFields}>
            <div className={styles.formField}>
              <label className={styles.label}>From Step</label>
              <select
                value={newTransition.from}
                onChange={(e) => setNewTransition({ ...newTransition, from: e.target.value || null })}
                className={styles.select}
              >
                {/* Default "Start" option */}
                <option value="">Start</option>

                {/* Dynamic step options */}
                {steps.map((step) => (
                  <option key={step.step_id} value={step.step_id}>
                    {step.description}
                  </option>
                ))}
              </select>
            </div>


              <div className={styles.formField}>
                <label className={styles.label}>To Step</label>
                <select
                  value={newTransition.to}
                  onChange={(e) => setNewTransition({...newTransition, to: e.target.value})}
                  className={styles.select}
                >
                  <option value="">End workflow</option>
                  {steps.filter(step => step.step_id !== newTransition.from).map(step => (
                    <option key={step.step_id} value={step.step_id}>{step.description}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Action Name</label>
                <input
                  type="text"
                  value={newTransition.actionName}
                  onChange={(e) => setNewTransition({...newTransition, actionName: e.target.value})}
                  placeholder="Enter action name"
                  className={styles.input}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Action Description</label>
                <input
                  type="text"
                  value={newTransition.actionDescription}
                  onChange={(e) => setNewTransition({...newTransition, actionDescription: e.target.value})}
                  placeholder="Enter action description"
                  className={styles.input}
                />
              </div>

              <button 
                onClick={handleCreateTransition}
                className={styles.addTransitionButton}
              >
                Add Flow
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Step Modal */}
      {editStepModal.isOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Edit Step</h3>
              <button 
                onClick={() => setEditStepModal({isOpen: false, step: null})}
                className={styles.modalCloseButton}
              >
                ×
              </button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.formField}>
                <label className={styles.label}>Step Name</label>
                <input
                  type="text"
                  value={editStepModal.step?.name || ''}
                  onChange={(e) => setEditStepModal({
                    ...editStepModal,
                    step: {...editStepModal.step, name: e.target.value}
                  })}
                  className={styles.input}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>Role</label>
                <select
                  value={editStepModal.step?.role_id || ''}
                  onChange={(e) => setEditStepModal({
                    ...editStepModal,
                    step: {...editStepModal.step, role_id: e.target.value}
                  })}
                  className={styles.select}
                >
                  <option value="">Select Role</option>
                  {role.map(r => (
                    <option key={r.role_id} value={r.role_id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button 
                onClick={() => setEditStepModal({isOpen: false, step: null})}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdateStep}
                className={styles.saveButton}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transition Modal */}
      {editTransitionModal.isOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Edit Transition</h3>
              <button 
                onClick={() => setEditTransitionModal({isOpen: false, transition: null})}
                className={styles.modalCloseButton}
              >
                ×
              </button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.formField}>
                <label className={styles.label}>From Step</label>
                <select
                  value={editTransitionModal.transition?.from_step_id || ''}
                  onChange={(e) => setEditTransitionModal({
                    ...editTransitionModal,
                    transition: {...editTransitionModal.transition, from_step_id: e.target.value}
                  })}
                  className={styles.select}
                >
                  <option value="">Select step</option>
                  {steps.map(step => (
                    <option key={step.step_id} value={step.step_id}>{step.description}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>To Step</label>
                <select
                  value={editTransitionModal.transition?.to_step_id || ''}
                  onChange={(e) => setEditTransitionModal({
                    ...editTransitionModal,
                    transition: {...editTransitionModal.transition, to_step_id: e.target.value}
                  })}
                  className={styles.select}
                >
                  <option value="">End workflow</option>
                  {steps.filter(step => step.step_id !== editTransitionModal.transition?.from_step_id).map(step => (
                    <option key={step.step_id} value={step.step_id}>{step.description}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>Action Name</label>
                <input
                  type="text"
                  value={editTransitionModal.transition?.action_name || ''}
                  onChange={(e) => handleUpdateTransitionField('action_name', e.target.value)}
                  className={styles.input}
                  placeholder="Action name"
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button 
                onClick={() => setEditTransitionModal({isOpen: false, transition: null})}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  await updateTransition(
                    editTransitionModal.transition.transition_id, // assuming this exists
                    {
                      action_name: editTransitionModal.transition.action_name,
                      from_step_id: editTransitionModal.transition.from_step_id,
                      to_step_id: editTransitionModal.transition.to_step_id,
                    }
                  );
                  await refetch();
                  setEditTransitionModal({ isOpen: false, transition: null });
                }}
                className={styles.saveButton}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowEditor;