// style
import styles from "./chart-container.module.css";

export default function ChartContainer({ title, children, className, icon }) {
  return (
    <div className={`${styles.chartContainer} ${className || ''}`}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {icon && icon}
        {title}
      </h3>
      <div className={styles.chart}>
        <div className={styles.chartPlaceholder}>
          {children}
        </div>
      </div>
    </div>
  );
}
