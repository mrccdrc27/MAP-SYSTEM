// styles
import styles from "./quick-action.module.css";

// react
import { useNavigate } from "react-router-dom";

// hooks
import { useAuth } from "../../../../context/AuthContext";

export default function QuickAction() {
  const navigate = useNavigate();
  const { isAdmin, hasTtsAccess } = useAuth();

  // Admin quick actions
  if (typeof isAdmin === "function" && isAdmin()) {
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

        <button
          className={styles.actionButton}
          onClick={() => navigate("/admin/archive")}
        >
          <i className="fa-solid fa-ticket"></i>
          View All Tickets
        </button>
      </div>
    );
  }

  // Agent quick actions
  if (typeof hasTtsAccess === "function" && hasTtsAccess()) {
    return (
      <div className={styles.quickActionSection}>
        <button
          className={styles.actionButton}
          onClick={() => navigate("/ticket")}
        >
          <i className="fas fa-plus"></i>
          New Ticket
        </button>
      </div>
    );
  }

  return null;
}
