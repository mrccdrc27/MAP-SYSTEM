import { useEffect } from "react";
import ReactDOM from "react-dom";
import styles from "./ModalWrapper.module.css";

const SIZE_MAP = {
  sm: '540px',
  md: '720px',
  lg: '980px',
  xl: '1200px',
  full: '100vw',
};

const ModalWrapper = ({ children, onClose, className, contentProps = {}, size, maxWidth, disableEscClose = false, disableOutsideClick = false }) => {
  // Lock background scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  // Handle ESC key to close modal (unless disabled)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key || e.code;
      // Support both modern and legacy values
      if (key === "Escape" || key === "Esc") {
        if (disableEscClose) {
          // Prevent other handlers (and default) from reacting to ESC while disabled
          try {
            e.preventDefault();
          } catch (_) {}
          try {
            e.stopPropagation();
          } catch (_) {}
          return;
        }
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [disableEscClose, onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      // If ESC close is disabled, we also disallow outside-click closing.
      if (disableEscClose || disableOutsideClick) return;
      onClose?.();
    }
  };

  const contentClass = className ? `${styles["modal-content"]} ${className}` : styles["modal-content"];

  // Resolve width from size or explicit maxWidth. Clamp to viewport using min(..., 95vw).
  const resolved = maxWidth || (size ? SIZE_MAP[size] : undefined);
  const widthStyle = resolved ? { maxWidth: `min(${resolved}, 95vw)` } : undefined;

  const mergedContentProps = { ...contentProps, style: { ...(contentProps.style || {}), ...(widthStyle || {}) } };

  return ReactDOM.createPortal(
    <div className={styles["modal-overlay"]} onClick={handleOverlayClick}>
      <div className={contentClass} {...mergedContentProps}>
        {onClose && (
          <button aria-label="Close modal" className={styles['modal-close']} onClick={() => onClose?.()}>
            ×
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
};

export default ModalWrapper;
