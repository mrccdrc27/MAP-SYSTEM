import useUsersApi from "../../../../api/useUsersApi";
import styles from "./add-agent.module.css";
import { useState } from "react";

export default function ActivateAgent({ agent, closeActivateAgent }) {
  const { activateUser } = useUsersApi();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleStatus = async () => {
    setIsSubmitting(true);
    await activateUser(agent.id, !agent.is_active); // toggle status
    setIsSubmitting(false);
    closeActivateAgent();
  };

  return (
    <div className={styles.aaOverlayWrapper} onClick={closeActivateAgent}>
      <div className={styles.addAgentModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.aaExit} onClick={closeActivateAgent}>
          <i className="fa-solid fa-xmark"></i>
        </div>

        <div className={styles.aaHeader}>
          <h2>{agent.is_active ? "Deactivate Agent" : "Activate Agent"}</h2>
        </div>

        <div className={styles.aaBody}>
          <div className={styles.aaWrapper}>
            <p>
              Are you sure you want to{" "}
              <strong>{agent.is_active ? "deactivate" : "activate"}</strong>{" "}
              <strong>{agent.first_name} {agent.last_name}</strong>?
            </p>

            <button
              onClick={handleToggleStatus}
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Processing..."
                : agent.is_active
                ? "Deactivate"
                : "Activate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
