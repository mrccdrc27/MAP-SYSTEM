// styles
import styles from "./quick-action.module.css";

// react
import { useNavigate } from "react-router-dom";

export default function QuickAction() {
  const navigate = useNavigate();

  return (
    <div className={styles.quickActionSection}>
      <button
        className={styles.actionButton}
        onClick={() => navigate("/admin/workflow")}
      >
        <i className="fas fa-plus"></i>
        Create Workflow
      </button>
      <button
        className={styles.actionButton}
        onClick={() => navigate("/admin/agent")}
      >
        <i className="fas fa-edit"></i>
        Invite Agent
      </button>
      <button className={styles.actionButton}>
        <i className="fa-solid fa-users"></i>
        Active Agent
      </button>
      {/* <button className={styles.actionButton}>
        <i className="fas fa-sync"></i>
        Atake?
      </button> */}
    </div>
  );
}
