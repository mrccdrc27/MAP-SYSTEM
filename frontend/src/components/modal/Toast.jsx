import React, { useEffect } from 'react';
import styles from './toast.module.css';

const ICONS = {
  success: <span>✅</span>,
  error: <span>❌</span>,
  info: <span>ℹ️</span>,
  warning: <span>⚠️</span>,
};

const Toast = ({ type = 'info', message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      <span className={styles.toastIcon}>{ICONS[type] || ICONS.info}</span>
      <span className={styles.toastMessage}>{message}</span>
      <button className={styles.toastClose} onClick={onClose}>×</button>
    </div>
  );
};

export default Toast;
