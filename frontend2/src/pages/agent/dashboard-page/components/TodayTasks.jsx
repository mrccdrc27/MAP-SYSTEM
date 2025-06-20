// TodayTasks.jsx
import styles from './component.module.css';

const TodayTasks = () => {
  const tasks = [
    { id: 'TK-1012', title: 'Email Issue', status: 'In Progress' },
    { id: 'TK-1013', title: 'Password Reset', status: 'New' },
  ];

  return (
    <div className={`${styles.card} ${styles.todayTasks}`}>
      <h2>Today’s Tasks</h2>
      <ul>
        {tasks.map(task => (
          <li key={task.id} className={styles.taskItem}>
            <span>{task.id} - {task.title}</span>
            <span className={`${styles.status} ${styles[task.status.toLowerCase().replace(" ", "")]}`}>
              {task.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TodayTasks;
