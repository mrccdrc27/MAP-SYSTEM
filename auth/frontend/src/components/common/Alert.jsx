import React from 'react';
import styles from './Alert.module.css';

/**
 * Standardized Alert component for inline notifications
 * @param {string} type - info, success, warning, error
 * @param {React.ReactNode} children - Alert content
 * @param {Function} onClose - Optional close handler
 * @param {string} className - Additional CSS classes
 */
const Alert = ({ 
  type = 'info', 
  children, 
  onClose, 
  className = '',
  icon
}) => {
  const alertClasses = [
    styles.alert,
    styles[type] || styles.info,
    className
  ].join(' ');

  const getIcon = () => {
    if (icon) return icon;
    switch (type) {
      case 'success': return <i className="fa-solid fa-circle-check"></i>;
      case 'error': return <i className="fa-solid fa-circle-exclamation"></i>;
      case 'warning': return <i className="fa-solid fa-triangle-exclamation"></i>;
      default: return <i className="fa-solid fa-circle-info"></i>;
    }
  };

  return (
    <div className={alertClasses}>
      <div className={styles.icon}>{getIcon()}</div>
      <div className={styles.content}>{children}</div>
      {onClose && (
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
          &times;
        </button>
      )}
    </div>
  );
};

export default Alert;
