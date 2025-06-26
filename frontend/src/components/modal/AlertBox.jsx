import styles from "./alert-box.module.css";

export default function AlertBox({ type = "info", message, onClose }) {
  if (!message) return null;

  const className =
    type === "success" ? styles.success :
    type === "error" ? styles.error :
    styles.info;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.alertBox} ${className}`}
        onClick={e => e.stopPropagation()} // prevent closing when clicking inside
      >
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close alert">
          &times;
        </button>
        {typeof message === "string" ? message : JSON.stringify(message, null, 2)}
      </div>
    </div>
  );
}
