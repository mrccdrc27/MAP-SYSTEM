import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  getSmoothStepPath, 
  EdgeLabelRenderer, 
  BaseEdge,
  useReactFlow 
} from 'reactflow';
import { X } from 'lucide-react';
import styles from '../workflow-page/create-workflow.module.css';

/**
 * Custom edge component with:
 * - Editable label (double-click to edit when in edit mode)
 * - Delete button (visible on hover when in edit mode)
 */
export default function EditableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  markerEnd,
  style,
  data,
  selected,
}) {
  const { setEdges } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [labelText, setLabelText] = useState(label || '');
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef(null);
  
  const isEditingGraph = data?.isEditingGraph ?? false;

  // Sync label when it changes externally
  useEffect(() => {
    setLabelText(label || '');
  }, [label]);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleDoubleClick = useCallback((e) => {
    if (!isEditingGraph) return;
    e.stopPropagation();
    setIsEditing(true);
  }, [isEditingGraph]);

  const handleLabelChange = useCallback((e) => {
    setLabelText(e.target.value);
  }, []);

  const handleLabelBlur = useCallback(() => {
    setIsEditing(false);
    // Update the edge label
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === id
          ? { ...edge, label: labelText, data: { ...edge.data, hasUnsavedChanges: true } }
          : edge
      )
    );
    // Trigger unsaved changes via data callback if available
    if (data?.onLabelChange) {
      data.onLabelChange(id, labelText);
    }
  }, [id, labelText, setEdges, data]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setLabelText(label || '');
      setIsEditing(false);
    }
  }, [label]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    if (!isEditingGraph) return;
    
    // Mark edge as to_delete instead of removing
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === id
          ? { ...edge, data: { ...edge.data, to_delete: true }, className: 'deleted-edge' }
          : edge
      )
    );
    
    if (data?.onDelete) {
      data.onDelete(id);
    }
  }, [id, isEditingGraph, setEdges, data]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const isReturn = data?.isReturn;
  const isDeleted = data?.to_delete === true;
  
  const edgeStyle = {
    ...style,
    stroke: isDeleted ? '#dc2626' : (isReturn ? '#3b82f6' : '#3b82f6'),
    strokeWidth: selected ? 3 : 2,
    strokeDasharray: isDeleted ? '8,4' : (isReturn ? '5,5' : undefined),
    opacity: isDeleted ? 0.4 : 1,
  };

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={edgeStyle}
      />
      <EdgeLabelRenderer>
        <div
          className={`${styles.edgeLabelWrapper} ${isEditingGraph ? styles.edgeLabelEditable : ''} ${isDeleted ? styles.edgeDeletedLabel : ''}`}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: isDeleted ? 'none' : 'all',
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onDoubleClick={handleDoubleClick}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={labelText}
              onChange={handleLabelChange}
              onBlur={handleLabelBlur}
              onKeyDown={handleKeyDown}
              className={styles.edgeLabelInput}
              onClick={(e) => e.stopPropagation()}
              placeholder="Enter transition name"
            />
          ) : labelText ? (
            <span className={styles.edgeLabelText}>
              {isDeleted ? `${labelText} (deleted)` : labelText}
            </span>
          ) : (
            <span className={`${styles.edgeLabelText} ${styles.edgeLabelPlaceholder}`}>
              {isDeleted ? 'Deleted' : (isEditingGraph ? 'Double-click to name' : 'Transition')}
            </span>
          )}
          
          {/* Delete button - visible on hover in edit mode, hidden if already deleted */}
          {isEditingGraph && isHovered && !isEditing && !isDeleted && (
            <button
              onClick={handleDelete}
              className={styles.edgeDeleteBtn}
              title="Delete transition"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
