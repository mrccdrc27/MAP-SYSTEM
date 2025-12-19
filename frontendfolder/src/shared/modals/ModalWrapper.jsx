import { useEffect } from "react";
import ReactDOM from "react-dom";
import styles from "./ModalWrapper.module.css";

const ModalWrapper = ({ children, onClose, className, contentProps = {} }) => {
  // Lock background scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  const contentClass = className ? `${styles["modal-content"]} ${className}` : styles["modal-content"];

  return ReactDOM.createPortal(
    <div className={styles["modal-overlay"]} onClick={handleOverlayClick}>
      <div className={contentClass} {...contentProps}>{children}</div>
    </div>,
    document.body
  );
};

export default ModalWrapper;
