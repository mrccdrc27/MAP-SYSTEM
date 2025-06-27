import styles from "./Component.module.css";

const TodayTasks = ({ tasks }) => {
  const hasTasks = Array.isArray(tasks) && tasks.length > 0;

  return (
    <div className={`${styles.card} ${styles.todayTasks}`}>
      <h2>Today’s Tasks</h2>
      {hasTasks ? (
        <ul>
          {tasks.map((task) => (
            <li key={task.ticket_id} className={styles.taskItem}>
              <span>
                {task.ticket_id} - {task.subject}
              </span>
              <span
                className={`${styles.status} ${
                  styles[task.status.toLowerCase().replace(/\s/g, "")]
                }`}
              >
                {task.status}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>No tasks for today.</p>
      )}
    </div>
  );
};

export default TodayTasks;
