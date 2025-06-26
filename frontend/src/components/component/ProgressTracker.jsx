import React from "react";
import styles from "./progress-tracker.module.css";

const steps = ["Open", "In Progress", "Rejected", "Approved","Resolved"];

export default function ProgressTracker({ currentStatus }) {
  const getStepClass = (step) => {
    const currentIndex = steps.indexOf(currentStatus);
    const stepIndex = steps.indexOf(step);

    if (stepIndex < currentIndex) return styles.completed;
    if (stepIndex === currentIndex) return styles.active;
    return styles.inactive;
  };

  return (
    <div className={styles.progressContainer}>
      {steps.map((step, index) => (
        <div key={index} className={`${styles.step} ${getStepClass(step)}`}>
          <div className={styles.circle}>{index + 1}</div>
          <div className={styles.label}>{step}</div>
          {index < steps.length - 1 && <div className={styles.line}></div>}
        </div>
      ))}
    </div>
  );
}
