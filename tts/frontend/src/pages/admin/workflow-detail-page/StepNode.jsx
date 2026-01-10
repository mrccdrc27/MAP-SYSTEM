import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { Circle, Flag, ChevronDown, ChevronUp, X } from 'lucide-react';
import styles from '../workflow-page/create-workflow.module.css';
import StepNodeInlineForm from './StepNodeInlineForm';

/**
 * 6-Handle Step Node for Complex Workflow State Machines
 * Now with inline expandable editing capabilities
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [formData, setFormData] = useState({
    label: data.label || '',
    role: data.role || '',
    description: data.description || '',
    instruction: data.instruction || '',
    is_start: data.is_start || false,
    is_end: data.is_end || false,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const nodeRef = useRef(null);

  // Sync form data when data changes externally
  useEffect(() => {
    setFormData({
      label: data.label || '',
      role: data.role || '',
      description: data.description || '',
      instruction: data.instruction || '',
      is_start: data.is_start || false,
      is_end: data.is_end || false,
    });
    setHasChanges(false);
  }, [data.label, data.role, data.description, data.instruction, data.is_start, data.is_end]);

  const handleNodeClick = useCallback((e) => {
    // Don't trigger click when interacting with form elements
    if (e.target.closest('input, textarea, select, button')) {
      return;
    }
    if (data.onStepClick) {
      data.onStepClick(data);
    }
  }, [data]);

  const handleToggleExpand = useCallback((e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  const handleSave = useCallback((e) => {
    e.stopPropagation();
    if (data.onUpdateStep) {
      data.onUpdateStep(data.id, {
        name: formData.label,
        label: formData.label,
        role: formData.role,
        description: formData.description,
        instruction: formData.instruction,
        is_start: formData.is_start,
        is_end: formData.is_end,
      });
    }
    setHasChanges(false);
  }, [data.id, data.onUpdateStep, formData]);

  const handleCancel = useCallback((e) => {
    e.stopPropagation();
    setFormData({
      label: data.label || '',
      role: data.role || '',
      description: data.description || '',
      instruction: data.instruction || '',
      is_start: data.is_start || false,
      is_end: data.is_end || false,
    });
    setHasChanges(false);
  }, [data]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    if (data.onDeleteStep && !formData.is_start && !formData.is_end) {
      data.onDeleteStep(data.id);
    }
  }, [data.id, data.onDeleteStep, formData.is_start, formData.is_end]);

  // Stop propagation for input interactions to prevent node dragging
  const handleInputMouseDown = useCallback((e) => {
    e.stopPropagation();
  }, []);

  // Determine node type for handle rendering - use formData for immediate visual feedback
  const isStartNode = formData.is_start;
  const isEndNode = formData.is_end;
  const isRegularNode = !isStartNode && !isEndNode;
  const isDeleted = data.to_delete === true;

  const nodeClasses = [
    styles.stepNode,
    selected && styles.stepNodeSelected,
    isStartNode && styles.stepNodeStart,
    isEndNode && styles.stepNodeEnd,
    isExpanded && styles.stepNodeExpanded,
    isDeleted && styles.stepNodeDeleted,
  ].filter(Boolean).join(' ');

  const roles = data.availableRoles || [];
  
  // Check if we can delete this node (not start/end, delete handler exists, and not already deleted)
  const canDelete = data.onDeleteStep && !isStartNode && !isEndNode && !isDeleted;

  return (
    <div 
      ref={nodeRef}
      className={nodeClasses} 
      onClick={handleNodeClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={isExpanded ? { minWidth: '320px', maxWidth: '400px' } : {}}
    >
      {/* Quick Delete Button - visible on hover when not expanded */}
      {canDelete && isHovered && !isExpanded && (
        <button
          onClick={handleDelete}
          onMouseDown={handleInputMouseDown}
          className={styles.stepNodeQuickDelete}
          title="Delete step"
        >
          <X size={12} />
        </button>
      )}
      
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
      
      {/* Right Target @ 70% - For regular and start nodes (to receive return/reject flows) */}
      {(isRegularNode || isStartNode) && (
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
          {/* Header - Always Visible */}
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
            {/* Expand/Collapse Toggle */}
            <button
              onClick={handleToggleExpand}
              onMouseDown={handleInputMouseDown}
              className={styles.stepNodeExpandBtn}
              title={isExpanded ? 'Collapse' : 'Expand to edit'}
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
          
          {/* Collapsed View - Role & Description Summary */}
          {!isExpanded && (
            <>
              {data.role && (
                <div className={styles.stepNodeRole}>{data.role}</div>
              )}
              {data.description && (
                <div className={styles.stepNodeDescription}>{data.description}</div>
              )}
            </>
          )}
          
          {/* Expanded View - Inline Edit Form */}
          {isExpanded && (
            <StepNodeInlineForm
              formData={formData}
              roles={roles}
              hasChanges={hasChanges}
              isStartNode={isStartNode}
              isEndNode={isEndNode}
              onChange={handleChange}
              onSave={handleSave}
              onCancel={handleCancel}
              onDelete={data.onDeleteStep ? handleDelete : null}
              onMouseDown={handleInputMouseDown}
            />
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
