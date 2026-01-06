import React, { useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import styles from './WeightManagementNode.module.css';

export default function WeightManagementNode({ data }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempWeight, setTempWeight] = useState(data.weight);

  const handleWeightChange = useCallback((e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      setTempWeight(value);
    }
  }, []);

  const handleWeightSubmit = useCallback(() => {
    if (data.onWeightChange) {
      data.onWeightChange(data.step_id, tempWeight);
    }
    setIsEditing(false);
  }, [data, tempWeight]);

  const handleWeightCancel = useCallback(() => {
    setTempWeight(data.weight);
    setIsEditing(false);
  }, [data.weight]);

  const handleNodeClick = useCallback(() => {
    if (!isEditing) {
      setIsEditing(true);
    }
  }, [isEditing]);

  // Calculate weight intensity for visual feedback
  const maxWeight = data.maxWeight || 10;
  const intensity = (data.weight / maxWeight) * 100;

  return (
    <div className={styles.weightNode}>
      <Handle type="target" position={Position.Top} />

      <div 
        className={styles.nodeContent}
        onClick={handleNodeClick}
      >
        <div className={styles.nodeHeader}>
          <div className={styles.stepName}>{data.label}</div>
          <div className={styles.roleTag}>{data.role}</div>
        </div>

        <div className={styles.weightDisplay}>
          <div 
            className={styles.weightBar}
            style={{ width: `${intensity}%` }}
          />
          {isEditing ? (
            <div className={styles.weightInputContainer}>
              <input
                type="number"
                min="1"
                max="100"
                value={tempWeight}
                onChange={handleWeightChange}
                className={styles.weightInput}
                autoFocus
              />
              <button
                className={styles.weightBtn}
                onClick={handleWeightSubmit}
                title="Save weight"
              >
                ✓
              </button>
              <button
                className={`${styles.weightBtn} ${styles.cancelBtn}`}
                onClick={handleWeightCancel}
                title="Cancel"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className={styles.weightValue}>
              <span className={styles.weight}>{data.weight}</span>
              <span className={styles.label}>Weight</span>
            </div>
          )}
        </div>

        <div className={styles.nodeFooter}>
          <div className={styles.info}>Order: {data.order}</div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
