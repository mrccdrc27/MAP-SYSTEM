// PerformanceSnapshot.jsx
import styles from './Component.module.css';

const PerformanceSnapshot = () => {
  const stats = [
    { label: 'Avg. Resolution Time', value: '2h 14m' },
    { label: 'Tickets Resolved This Week', value: 12 },
    { label: 'SLA Compliance', value: '92%' },
  ];

  return (
    <div className={`${styles.card} ${styles.performanceSnapshot}`}>
      <h2>Performance Snapshot</h2>
      <ul>
        {stats.map((stat, index) => (
          <li key={index} className={styles.performanceListItem}>
            <span className={styles.label}>{stat.label}</span>
            <span className={styles.value}>{stat.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PerformanceSnapshot;
