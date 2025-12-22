import React, { useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { Circle, Flag } from 'lucide-react';
import styles from './WorkflowEditorLayout.module.css';

export default function StepNode({ data, selected }) {

  const handleNodeClick = useCallback(() => {
    if (data.onStepClick) {
      data.onStepClick(data);
    }
  }, [data]);

  const nodeClasses = [
    styles.stepNode,
    selected && styles.stepNodeSelected,
    data.is_start && styles.stepNodeStart,
    data.is_end && styles.stepNodeEnd,
  ].filter(Boolean).join(' ');

  return (
    <div className={nodeClasses} onClick={handleNodeClick}>
      {!data.is_start && (
        <>
          <Handle type="target" position={Position.Top} id="top" className={styles.stepNodeHandle} />
          <Handle type="target" position={Position.Left} id="left" className={styles.stepNodeHandle} />
          <Handle type="target" position={Position.Right} id="right" className={styles.stepNodeHandle} />
        </>
      )}
      
      <div className={styles.stepNodeContent}>
        <div className={styles.stepNodeBody}>
          <div className={styles.stepNodeHeader}>
            <span className={styles.stepNodeLabel}>{data.label}</span>
            {data.is_start && (
              <span className={`${styles.stepNodeBadge} ${styles.stepNodeBadgeStart}`}>
                <Circle className={styles.stepNodeBadgeIcon} />
                START
              </span>
            )}
            {data.is_end && (
              <span className={`${styles.stepNodeBadge} ${styles.stepNodeBadgeEnd}`}>
                <Flag className={styles.stepNodeBadgeIcon} />
                END
              </span>
            )}
          </div>
          {data.role && (
            <div className={styles.stepNodeRole}>{data.role}</div>
          )}
          {data.description && (
            <div className={styles.stepNodeDescription}>{data.description}</div>
          )}
        </div>
      </div>

      {!data.is_end && (
        <>
          <Handle type="source" position={Position.Bottom} id="bottom" className={styles.stepNodeHandle} />
          <Handle type="source" position={Position.Left} id="left" className={styles.stepNodeHandle} />
          <Handle type="source" position={Position.Right} id="right" className={styles.stepNodeHandle} />
        </>
      )}
    </div>
  );
}
