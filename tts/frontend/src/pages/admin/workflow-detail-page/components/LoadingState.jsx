import React, { memo } from 'react';
import { RefreshCw } from 'lucide-react';
import styles from '../../workflow-page/create-workflow.module.css';

/**
 * Loading state component
 */
const LoadingState = memo(function LoadingState() {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingContent}>
        <RefreshCw className={styles.loadingSpinner} />
        <p className={styles.loadingText}>Loading workflow...</p>
      </div>
    </div>
  );
});

export default LoadingState;
