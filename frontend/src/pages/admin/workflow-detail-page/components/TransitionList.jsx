import React from "react";
import styles from "../WorkflowEditor.module.css";

export default function TransitionList({
  transitions,
  getStepNameTo,
  getStepNameFrom,
  getActionName,
  handleEditTransition,
  handleDeleteTransition,
}) {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Workflow Flow</h2>

      <div className={styles.transitionsSection}>
        {transitions.map((transition) => (
          <div key={transition.transition_id} className={styles.transitionCard}>
            <div className={styles.transitionHeader}>
              <div className={styles.transitionContent}>
                <div className={styles.transitionFlow}>
                  <span className={styles.transitionStep}>
                    {getStepNameTo(transition.from_step_id)}
                  </span>
                  <span className={styles.transitionArrow}>→</span>
                  <span className={styles.transitionStep}>
                    {getStepNameFrom(transition.to_step_id)}
                  </span>
                </div>
                <div className={styles.transitionAction}>
                  Action: {getActionName(transition.action_id)}
                </div>
              </div>
              <div className={styles.actionGroup}>
                <div onClick={() => handleEditTransition(transition)}>
                  <i className="fa-solid fa-pen"></i>
                </div>
                <div
                  onClick={() =>
                    handleDeleteTransition(transition.transition_id)
                  }
                >
                  <i className="fa-solid fa-trash"></i>
                </div>
              </div>
              {/* <div className={styles.buttonGroup}>
                <button
                  onClick={() => handleEditTransition(transition)}
                  className={styles.editButton}
                >
                  Edit
                </button>
                <button
                  onClick={() =>
                    handleDeleteTransition(transition.transition_id)
                  }
                  className={styles.removeButton}
                >
                  Remove
                </button>
              </div> */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
