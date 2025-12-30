import React, { useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { Circle, Flag } from 'lucide-react';
import styles from './WorkflowEditorLayout.module.css';

/**
 * 6-Handle Step Node for Complex Workflow State Machines
 * 
 * REGULAR NODES (not start/end) - Full 6 handles:
 * - Top: Target (in-T) - Primary incoming flow
 * - Bottom: Source (out-B) - Primary outgoing flow
 * - Left: in-L (30%) Target + out-L (70%) Source
 * - Right: out-R (30%) Source + in-R (70%) Target
 * 
 * START NODE - Only 1 output handle:
 * - out-B (Bottom) - Single source to begin flow
 * 
 * END NODE - Only 1 input handle:
 * - in-T (Top) - Single target to receive final flow
 */
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

  // Determine node type for handle rendering
  const isStartNode = data.is_start;
  const isEndNode = data.is_end;
  const isRegularNode = !isStartNode && !isEndNode;

  return (
    <div className={nodeClasses} onClick={handleNodeClick}>
      {/* ===== TARGET HANDLES (Incoming) ===== */}
      
      {/* Top - Primary incoming (for END nodes: only handle, for REGULAR: one of many) */}
      {(isEndNode || isRegularNode) && (
        <Handle 
          type="target" 
          position={Position.Top} 
          id="in-T" 
          className={`${styles.stepNodeHandle} ${styles.handleTarget} ${styles.handleTop}`}
          title="Primary Input (Top)"
        />
      )}
      
      {/* Left Target @ 30% - Only for regular nodes */}
      {isRegularNode && (
        <Handle 
          type="target" 
          position={Position.Left} 
          id="in-L" 
          className={`${styles.stepNodeHandle} ${styles.handleTarget} ${styles.handleLeftTop}`}
          style={{ top: '30%' }}
          title="Input from Left"
        />
      )}
      
      {/* Right Target @ 70% - Only for regular nodes */}
      {isRegularNode && (
        <Handle 
          type="target" 
          position={Position.Right} 
          id="in-R" 
          className={`${styles.stepNodeHandle} ${styles.handleTarget} ${styles.handleRightBottom}`}
          style={{ top: '70%' }}
          title="Return Input (Right)"
        />
      )}
      
      {/* ===== NODE CONTENT ===== */}
      <div className={styles.stepNodeContent}>
        <div className={styles.stepNodeBody}>
          <div className={styles.stepNodeHeader}>
            <span className={styles.stepNodeLabel}>{data.label}</span>
            {isStartNode && (
              <span className={`${styles.stepNodeBadge} ${styles.stepNodeBadgeStart}`}>
                <Circle className={styles.stepNodeBadgeIcon} />
                START
              </span>
            )}
            {isEndNode && (
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

      {/* ===== SOURCE HANDLES (Outgoing) ===== */}
      
      {/* Bottom - Primary outgoing (for START nodes: only handle, for REGULAR: one of many) */}
      {(isStartNode || isRegularNode) && (
        <Handle 
          type="source" 
          position={Position.Bottom} 
          id="out-B" 
          className={`${styles.stepNodeHandle} ${styles.handleSource} ${styles.handleBottom}`}
          title="Primary Output (Bottom)"
        />
      )}
      
      {/* Left Source @ 70% - Only for regular nodes */}
      {isRegularNode && (
        <Handle 
          type="source" 
          position={Position.Left} 
          id="out-L" 
          className={`${styles.stepNodeHandle} ${styles.handleSource} ${styles.handleLeftBottom}`}
          style={{ top: '70%' }}
          title="Return Output (Left)"
        />
      )}
      
      {/* Right Source @ 30% - Only for regular nodes */}
      {isRegularNode && (
        <Handle 
          type="source" 
          position={Position.Right} 
          id="out-R" 
          className={`${styles.stepNodeHandle} ${styles.handleSource} ${styles.handleRightTop}`}
          style={{ top: '30%' }}
          title="Progress Output (Right)"
        />
      )}
    </div>
  );
}
