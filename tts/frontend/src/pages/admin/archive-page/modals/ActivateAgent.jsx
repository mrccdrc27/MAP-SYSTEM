import useFetchWorkflows from "../../../../api/useFetchWorkflows";
import useTaskAssigner from "../../../../api/useTaskAssigner";
import styles from "./add-agent.module.css";
import { useState } from "react";

export default function TicketTaskAssign({ closeAssignTicket, ticket_id }) {
  const { workflows, loading: loadingWorkflows, error: errorWorkflows } = useFetchWorkflows();
  const { assignTask, loading: assigning, error, success } = useTaskAssigner();
  const [selectedWorkflow, setSelectedWorkflow] = useState("");

  const handleChange = (e) => {
    setSelectedWorkflow(e.target.value);
  };

  const handleAssign = async () => {
    if (!selectedWorkflow || !ticket_id) return;
    await assignTask({ ticket_id, workflow_id: selectedWorkflow });
  };

  return (
    <div className={styles.aaOverlayWrapper} onClick={closeAssignTicket}>
      <div className={styles.addAgentModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.aaExit} onClick={closeAssignTicket}>
          <i className="fa-solid fa-xmark"></i>
        </div>

        <div className={styles.aaBody}>
          <div className={styles.aaWrapper}>
            <label htmlFor="workflow-select">Select Workflow</label>

            {loadingWorkflows ? (
              <p>Loading workflows...</p>
            ) : errorWorkflows ? (
              <p style={{ color: "red" }}>Error loading workflows.</p>
            ) : (
              <select
                id="workflow-select"
                value={selectedWorkflow}
                onChange={handleChange}
                className={styles.dropdown}
              >
                <option value="" disabled>Select a workflow</option>
                {workflows.map((workflow) => (
                  <option key={workflow.workflow_id} value={workflow.workflow_id}>
                    {workflow.name || workflow.workflow_id}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handleAssign}
              className={styles.assignButton}
              disabled={assigning || !selectedWorkflow}
            >
              {assigning ? "Assigning..." : "Assign Task"}
            </button>

            {error && <p style={{ color: "red" }}>{error}</p>}
            {success && <p style={{ color: "green" }}>Task successfully assigned!</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
