// SLACard.jsx
import styles from './component.module.css';

const SLACard = () => {
  const slaItems = [
    { type: 'At Risk', count: 2 },
    { type: 'Breached', count: 1 },
  ];

  return (
    <div className={`${styles.card} ${styles.slaCards}`}>
      <h2>SLA Alerts</h2>
      <ul>
        {slaItems.map((item, i) => (
          <li key={i}>
            <strong>{item.count}</strong> {item.type}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SLACard;
