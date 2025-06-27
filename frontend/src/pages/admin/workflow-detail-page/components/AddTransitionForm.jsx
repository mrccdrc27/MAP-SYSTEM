import React, { useState } from 'react';
import styles from '../WorkflowEditor.module.css';

export default function AddTransitionForm({
  steps,
  newTransition,
  setNewTransition,
  handleCreateTransition,
}) {
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!newTransition.from) newErrors.from = 'Please select a "From Step".';
    if (!newTransition.to) newErrors.to = 'Please select a "To Step".';
    if (!newTransition.actionName.trim()) newErrors.actionName = 'Action Name is required.';
    if (!newTransition.actionDescription.trim()) newErrors.actionDescription = 'Action Description is required.';
    return newErrors;
  };

  const onSubmit = () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    handleCreateTransition();
  };

  return (
    <div className={styles.addTransitionForm}>
      <h3 className={styles.formTitle}>Add New Flow</h3>
      <div className={styles.formFields}>

        {/* From Step */}
        <div className={styles.formField}>
          <label className={styles.label}>From Step</label>
          {errors.from && <div className={styles.error}>{errors.from}</div>}
          <select
            value={newTransition.from}
            onChange={(e) => {
              setNewTransition({ ...newTransition, from: e.target.value });
              setErrors(prev => ({ ...prev, from: null }));
            }}
            className={styles.select}
          >
            <option value="">Start Workflow</option>
            {steps.map((step) => (
              <option key={step.step_id} value={step.step_id}>
                {step.description}
              </option>
            ))}
          </select>
        </div>

        {/* To Step */}
        <div className={styles.formField}>
          <label className={styles.label}>To Step</label>
          {errors.to && <div className={styles.error}>{errors.to}</div>}
          <select
            value={newTransition.to}
            onChange={(e) => {
              setNewTransition({ ...newTransition, to: e.target.value });
              setErrors(prev => ({ ...prev, to: null }));
            }}
            className={styles.select}
          >
            <option value="">End Workflow</option>
            {steps
              .filter((step) => step.step_id !== newTransition.from)
              .map((step) => (
                <option key={step.step_id} value={step.step_id}>
                  {step.description}
                </option>
              ))}
          </select>
        </div>

        {/* Action Name */}
        <div className={styles.formField}>
          <label className={styles.label}>Action Name</label>
          {errors.actionName && <div className={styles.error}>{errors.actionName}</div>}
          <input
            type="text"
            value={newTransition.actionName}
            onChange={(e) => {
              setNewTransition({ ...newTransition, actionName: e.target.value });
              setErrors(prev => ({ ...prev, actionName: null }));
            }}
            placeholder="Enter action name"
            className={styles.input}
          />
        </div>

        {/* Action Description */}
        <div className={styles.formField}>
          <label className={styles.label}>Action Description</label>
          {errors.actionDescription && <div className={styles.error}>{errors.actionDescription}</div>}
          <input
            type="text"
            value={newTransition.actionDescription}
            onChange={(e) => {
              setNewTransition({ ...newTransition, actionDescription: e.target.value });
              setErrors(prev => ({ ...prev, actionDescription: null }));
            }}
            placeholder="Enter action description"
            className={styles.input}
          />
        </div>

        <button onClick={onSubmit} className={styles.addTransitionButton}>
          Add Flow
        </button>
      </div>
    </div>
  );
}
