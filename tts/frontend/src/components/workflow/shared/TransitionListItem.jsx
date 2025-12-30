import React, { memo } from 'react';
import { ArrowRight, Trash2, Edit2 } from 'lucide-react';
import styles from './TransitionListItem.module.css';

/**
 * Unified transition list item component
 * Used in both Create and Edit workflow pages
 */
const TransitionListItem = memo(function TransitionListItem({
  transition,
  fromStepName,
  toStepName,
  isSelected = false,
  showActions = true,
  onClick,
  onEdit,
  onDelete,
  className = ''
}) {
  const handleClick = () => {
    if (onClick) onClick(transition);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    if (onEdit) onEdit(transition);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(transition);
  };

  // Get display names
  const sourceName = fromStepName || transition.source || transition.from_step_name || 'Unknown';
  const targetName = toStepName || transition.target || transition.to_step_name || 'Unknown';
  const label = transition.label || transition.name || '';

  return (
    <div
      className={`
        ${styles.transitionItem}
        ${isSelected ? styles.selected : ''}
        ${onClick ? styles.clickable : ''}
        ${className}
      `}
      onClick={handleClick}
    >
      {/* Route visualization */}
      <div className={styles.route}>
        <span className={styles.stepName}>{sourceName}</span>
        <div className={styles.arrow}>
          <ArrowRight size={14} />
        </div>
        <span className={styles.stepName}>{targetName}</span>
      </div>

      {/* Label */}
      {label && (
        <div className={styles.label}>
          "{label}"
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className={styles.actions}>
          {onEdit && (
            <button
              className={styles.actionBtn}
              onClick={handleEdit}
              title="Edit Transition"
            >
              <Edit2 size={14} />
            </button>
          )}
          {onDelete && (
            <button
              className={`${styles.actionBtn} ${styles.deleteBtn}`}
              onClick={handleDelete}
              title="Delete Transition"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
});

export default TransitionListItem;
