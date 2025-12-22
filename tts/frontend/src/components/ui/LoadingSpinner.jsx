import styles from "./loading-spinner.module.css";

export default function LoadingSpinner({ height = "300px" }) {
  return (
    <div className={styles.loaderOverlay} style={{ height }}>
      <div className={styles.loader}></div>
    </div>
  );
}
