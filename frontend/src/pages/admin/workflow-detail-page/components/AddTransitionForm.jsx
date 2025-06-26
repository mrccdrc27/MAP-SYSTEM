import React from 'react';
import styles from '../WorkflowEditor.module.css';

export default function AddTransitionForm({
  steps,
  newTransition,
  setNewTransition,
  handleCreateTransition,
}) {
  return (
    <div className={styles.addTransitionForm}>
      <h3 className={styles.formTitle}>Add New Flow</h3>
      <div className={styles.formFields}>
        <div className={styles.formField}>
          <label className={styles.label}>From Step</label>
          <select
            value={newTransition.from}
            onChange={(e) =>
              setNewTransition({ ...newTransition, from: e.target.value })
            }
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

        <div className={styles.formField}>
          <label className={styles.label}>To Step</label>
          <select
            value={newTransition.to}
            onChange={(e) =>
              setNewTransition({ ...newTransition, to: e.target.value })
            }
            className={styles.select}
          >
            <option value="">End workflow</option>
            {steps
              .filter((step) => step.step_id !== newTransition.from)
              .map((step) => (
                <option key={step.step_id} value={step.step_id}>
                  {step.description}
                </option>
              ))}
          </select>
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Action Name</label>
          <input
            type="text"
            value={newTransition.actionName}
            onChange={(e) =>
              setNewTransition({ ...newTransition, actionName: e.target.value })
            }
            placeholder="Enter action name"
            className={styles.input}
          />
        </div>

        <div className={styles.formField}>
          <label className={styles.label}>Action Description</label>
          <input
            type="text"
            value={newTransition.actionDescription}
            onChange={(e) =>
              setNewTransition({
                ...newTransition,
                actionDescription: e.target.value,
              })
            }
            placeholder="Enter action description"
            className={styles.input}
          />
        </div>

        <button onClick={handleCreateTransition} className={styles.addTransitionButton}>
          Add Flow
        </button>
      </div>
    </div>
  );
}
