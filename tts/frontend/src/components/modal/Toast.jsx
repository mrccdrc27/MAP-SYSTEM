import React, { useEffect } from 'react';
import styles from './toast.module.css';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const ICON_MAP = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const Toast = ({ type = 'info', message, onClose = () => {}, duration = 5000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const Icon = ICON_MAP[type] || ICON_MAP.info;

  return (
    <div
      className={`${styles.toast} ${styles[type]}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className={styles.left}>
        <span className={styles.toastIcon} aria-hidden>
          <Icon size={20} />
        </span>
        <div className={styles.toastMessage}>{message}</div>
      </div>

      <button
        className={styles.toastClose}
        onClick={onClose}
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;
