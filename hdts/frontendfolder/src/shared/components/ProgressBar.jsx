import React from 'react';
import { FaCheck } from 'react-icons/fa';
import styles from './ProgressBar.module.css';

/**
/**
 * Centralized ProgressBar component for multi-step wizards.
 * Visual logic lives here; caller passes currentStep and steps array.
 */
export default function ProgressBar({ currentStep = 1, steps = [] }) {
  const totalSteps = steps.length || 4;
  const normalizedSteps = steps.length
    ? steps
    : [
        { number: 1, label: 'Category' },
        { number: 2, label: 'Sub-Category' },
        { number: 3, label: 'Details' },
        { number: 4, label: 'Submit' },
      ];

  return (
    <div className={styles.progressBarContainer}>
      <div className={styles.progressBar}>
        {normalizedSteps.map((step, idx) => {
          const isFirst = step.number === 1;
          const isLast = step.number === totalSteps;
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;

          const wrapperClasses = [styles.progressStepWrapper];
          if (isFirst) wrapperClasses.push(styles.first);
          if (isLast) wrapperClasses.push(styles.last);
          if (isCompleted) wrapperClasses.push(styles.completed);
          if (isCurrent) wrapperClasses.push(styles.current);

          const labelClass = isCurrent ? styles.activeLabel : isCompleted ? styles.completedLabel : '';

          return (
            <React.Fragment key={step.number}>
              <div className={wrapperClasses.join(' ')}>
                <div className={`${styles.progressStep} ${isCurrent ? styles.active : ''} ${isCompleted ? styles.done : ''}`}>
                  {isCompleted ? (
                    <FaCheck className={styles.checkIcon} aria-hidden="true" />
                  ) : (
                    <div className={styles.stepNumber}>{step.number}</div>
                  )}
                </div>
                <div className={`${styles.stepLabel} ${labelClass}`}>{step.label}</div>
              </div>

              {/* Render connector between steps */}
              {idx < normalizedSteps.length - 1 && (
                <div
                  className={
                    `${styles.connector} ${isCompleted ? styles.connectorCompleted : isCurrent ? styles.connectorCurrent : styles.connectorUpcoming}`
                  }
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}