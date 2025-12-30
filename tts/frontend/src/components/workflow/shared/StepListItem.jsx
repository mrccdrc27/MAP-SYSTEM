import React, { memo } from 'react';
import {
  Play, CheckCircle, Pause, CircleDot, GitBranch, Users,
  GripVertical, Edit2, Trash2, ChevronRight, AlertCircle
} from 'lucide-react';
import styles from './StepListItem.module.css';

/**
 * Visual icon based on step type
 */
const getStepIcon = (type) => {
  switch (type?.toLowerCase()) {
    case 'initial':
    case 'start':
      return <Play size={16} />;
    case 'terminal':
    case 'end':
      return <CheckCircle size={16} />;
    case 'hold':
    case 'pause':
      return <Pause size={16} />;
    case 'decision':
      return <GitBranch size={16} />;
    case 'approval':
      return <Users size={16} />;
    default:
      return <CircleDot size={16} />;
  }
};

/**
 * Color based on step type
 */
const getStepColor = (type) => {
  switch (type?.toLowerCase()) {
    case 'initial':
    case 'start':
      return '#22c55e';
    case 'terminal':
    case 'end':
      return '#f43f5e';
    case 'hold':
    case 'pause':
      return '#f59e0b';
    case 'decision':
      return '#8b5cf6';
    case 'approval':
      return '#06b6d4';
    default:
      return '#3b82f6';
  }
};

/**
 * Unified step list item component
 * Used in both Create and Edit workflow pages
 */
const StepListItem = memo(function StepListItem({
  step,
  index,
  isSelected = false,
  isDraggable = false,
  hasError = false,
  errorMessage = '',
  showActions = true,
  showRole = true,
  onClick,
  onEdit,
  onDelete,
  onDragStart,
  className = ''
}) {
  const color = getStepColor(step.type);
  const icon = getStepIcon(step.type);

  const handleClick = () => {
    if (onClick) onClick(step, index);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    if (onEdit) onEdit(step, index);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(step, index);
  };

  return (
    <div
      className={`
        ${styles.stepItem}
        ${isSelected ? styles.selected : ''}
        ${hasError ? styles.hasError : ''}
        ${onClick ? styles.clickable : ''}
        ${className}
      `}
      onClick={handleClick}
      draggable={isDraggable}
      onDragStart={onDragStart}
    >
      {/* Drag Handle */}
      {isDraggable && (
        <div className={styles.dragHandle}>
          <GripVertical size={16} />
        </div>
      )}

      {/* Icon */}
      <div
        className={styles.iconWrapper}
        style={{ background: `${color}20`, color }}
      >
        {icon}
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.header}>
          <span className={styles.name}>{step.name || step.label || 'Untitled Step'}</span>
          <span
            className={styles.typeBadge}
            style={{ background: `${color}15`, color, borderColor: `${color}30` }}
          >
            {step.type || 'Standard'}
          </span>
        </div>

        {showRole && step.assignedRole && (
          <div className={styles.roleInfo}>
            <Users size={12} />
            <span>{step.assignedRole}</span>
          </div>
        )}

        {hasError && errorMessage && (
          <div className={styles.errorInfo}>
            <AlertCircle size={12} />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className={styles.actions}>
          {onEdit && (
            <button
              className={styles.actionBtn}
              onClick={handleEdit}
              title="Edit Step"
            >
              <Edit2 size={14} />
            </button>
          )}
          {onDelete && (
            <button
              className={`${styles.actionBtn} ${styles.deleteBtn}`}
              onClick={handleDelete}
              title="Delete Step"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}

      {/* Chevron for clickable items */}
      {onClick && !showActions && (
        <ChevronRight size={16} className={styles.chevron} />
      )}
    </div>
  );
});

export default StepListItem;
