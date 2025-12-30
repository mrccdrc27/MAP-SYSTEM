import React, { memo } from 'react';
import { X, ChevronLeft } from 'lucide-react';
import styles from './EditPanel.module.css';

/**
 * Unified side panel wrapper for editing steps/transitions
 * Used in both Create and Edit workflow pages
 */
const EditPanel = memo(function EditPanel({
  title,
  subtitle,
  isOpen = true,
  showBackButton = false,
  showCloseButton = true,
  onClose,
  onBack,
  actions,
  children,
  className = ''
}) {
  if (!isOpen) return null;

  return (
    <div className={`${styles.panel} ${className}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {showBackButton && onBack && (
            <button
              className={styles.backBtn}
              onClick={onBack}
              title="Go Back"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <div className={styles.titleGroup}>
            <h3 className={styles.title}>{title}</h3>
            {subtitle && (
              <span className={styles.subtitle}>{subtitle}</span>
            )}
          </div>
        </div>
        {showCloseButton && onClose && (
          <button
            className={styles.closeBtn}
            onClick={onClose}
            title="Close Panel"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className={styles.content}>
        {children}
      </div>

      {/* Actions */}
      {actions && (
        <div className={styles.actions}>
          {actions}
        </div>
      )}
    </div>
  );
});

export default EditPanel;
