import styles from './error.module.css';

export default function NotFound() {
  return (
    <div className={styles.notFoundPage}>
      <div>
        <img src="/500.svg" alt="Not Found" />
      </div>
      <div>Internal Server Error.</div>
    </div>
  );
}
