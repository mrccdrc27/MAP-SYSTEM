import styles from "./Component.module.css";

const OngoingTask = ({ tasks }) => {
  const hasTasks = Array.isArray(tasks) && tasks.length > 0;

  return (
    <div className={`${styles.card} ${styles.todayTasks}`}>
      <h2>Ongoing Tasks</h2>
      {hasTasks ? (
        <ul>
          {tasks.map((task) => (
            <li key={task.ticket_id} className={styles.taskItem}>
              <div>
                <strong>{task.ticket_id}</strong> - {task.subject}
              </div>
              <div className={styles.meta}>
                <span
                  className={`${styles.status} ${
                    styles[task.status.toLowerCase().replace(/\s/g, "")]
                  }`}
                >
                  {task.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>No tasks in progress.</p>
      )}
    </div>
  );
};

export default OngoingTask;