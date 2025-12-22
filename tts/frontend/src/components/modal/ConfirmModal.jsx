import React from "react";
import styles from "./confirm-modal.module.css";

export default function ConfirmModal({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure?",
  onConfirm,
  onCancel
}) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            Cancel
          </button>

          <button className={styles.confirmBtn} onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
