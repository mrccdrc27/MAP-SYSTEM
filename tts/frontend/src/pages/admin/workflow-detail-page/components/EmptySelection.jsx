import React, { memo } from 'react';
import { MousePointer } from 'lucide-react';
import styles from './EmptySelection.module.css';

/**
 * Empty selection state component for sidebar panels
 * Shows when no step or transition is selected
 */
const EmptySelection = memo(function EmptySelection({ 
  title = 'No selection',
  message = 'Click on a step or transition to edit'
}) {
  return (
    <div className={styles.container}>
      <div className={styles.iconWrapper}>
        <MousePointer size={32} className={styles.icon} />
      </div>
      <p className={styles.title}>{title}</p>
      <p className={styles.message}>{message}</p>
    </div>
  );
});

export default EmptySelection;
