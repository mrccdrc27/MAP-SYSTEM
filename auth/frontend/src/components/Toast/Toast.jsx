import { useState, useEffect, useCallback } from 'react';
import styles from './Toast.module.css';

const ToastItem = ({ toast, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsClosing(true);
      setTimeout(() => onClose(toast.id), 300);
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast, onClose]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => onClose(toast.id), 300);
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <i className="fa-solid fa-circle-check"></i>;
      case 'error':
        return <i className="fa-solid fa-circle-xmark"></i>;
      case 'warning':
        return <i className="fa-solid fa-triangle-exclamation"></i>;
      case 'info':
      default:
        return <i className="fa-solid fa-circle-info"></i>;
    }
  };

  return (
    <div className={`${styles.toast} ${styles[toast.type]} ${isClosing ? styles.closing : ''}`}>
      <div className={styles.toastIcon}>{getIcon()}</div>
      <div className={styles.toastContent}>
        {toast.title && <h4 className={styles.toastTitle}>{toast.title}</h4>}
        <p className={styles.toastMessage}>{toast.message}</p>
      </div>
      <button className={styles.toastClose} onClick={handleClose}>
        <i className="fa-solid fa-times"></i>
      </button>
    </div>
  );
};

// Toast container component
const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  );
};

// Custom hook for toast notifications
let toastId = 0;
let addToastHandler = null;

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, title, message, duration = 5000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((title, message, duration) => addToast('success', title, message, duration), [addToast]);
  const error = useCallback((title, message, duration) => addToast('error', title, message, duration), [addToast]);
  const warning = useCallback((title, message, duration) => addToast('warning', title, message, duration), [addToast]);
  const info = useCallback((title, message, duration) => addToast('info', title, message, duration), [addToast]);

  // Register the addToast handler for global access
  useEffect(() => {
    addToastHandler = { success, error, warning, info };
    return () => {
      addToastHandler = null;
    };
  }, [success, error, warning, info]);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
    ToastContainer: () => <ToastContainer toasts={toasts} removeToast={removeToast} />,
  };
};

// Global toast function for use outside of React components
export const toast = {
  success: (title, message, duration) => addToastHandler?.success(title, message, duration),
  error: (title, message, duration) => addToastHandler?.error(title, message, duration),
  warning: (title, message, duration) => addToastHandler?.warning(title, message, duration),
  info: (title, message, duration) => addToastHandler?.info(title, message, duration),
};

export default ToastContainer;
