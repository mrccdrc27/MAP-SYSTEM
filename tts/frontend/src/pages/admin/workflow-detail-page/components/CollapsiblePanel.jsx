import React, { memo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from '../../workflow-page/create-workflow.module.css';

/**
 * Collapsible panel wrapper with toggle buttons
 */
const CollapsiblePanel = memo(function CollapsiblePanel({
  collapsed,
  onToggle,
  position, // 'left' or 'right'
  children,
  collapseTitle,
  expandTitle,
}) {
  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className={`${styles.expandBtn} ${position === 'left' ? styles.expandBtnLeft : styles.expandBtnRight}`}
        title={expandTitle}
      >
        {position === 'left' ? <ChevronRight /> : <ChevronLeft />}
      </button>
    );
  }

  return (
    <div className={styles.relativeContainer}>
      {children}
      <button
        onClick={onToggle}
        className={`${styles.collapseBtn} ${position === 'left' ? styles.collapseBtnLeft : styles.collapseBtnRight}`}
        title={collapseTitle}
      >
        {position === 'left' ? <ChevronLeft /> : <ChevronRight />}
      </button>
    </div>
  );
});

export default CollapsiblePanel;
