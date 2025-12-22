// src/components/ticket/CommentUtilities.jsx
import React from 'react';
import styles from './ticketComments.module.css';

// Loading spinner component
export const LoadingSpinner = () => (
  <div className={styles.loadingSpinner}>
    <div className={styles.loadingDots}>
      <div className={styles.loadingDot}></div>
      <div className={styles.loadingDot}></div>
      <div className={styles.loadingDot}></div>
    </div>
  </div>
);

// Empty state component
export const EmptyState = () => (
  <div className={styles.emptyStateContainer}>
    <i className="fa-regular fa-comments styles.emptyStateIcon"></i>
    <p className={styles.emptyStateText}>
      No comments yet. Be the first to start a conversation!
    </p>
  </div>
);

// Error state component
export const ErrorState = ({ message, onRetry }) => (
  <div className={styles.errorMessage}>
    <p>{message}</p>
    {onRetry && (
      <button onClick={onRetry} className={styles.actionButton}>
        <i className="fa-solid fa-rotate"></i> Retry
      </button>
    )}
  </div>
);