import styles from './error.module.css';

export default function NotFound() {
  return (
    <div className={styles.notFoundPage}>
      <div>
        <img src="/404.svg" alt="Not Found" />
      </div>
      <div>Sorry, the page you are looking for is unavailable.</div>
    </div>
  );
}
