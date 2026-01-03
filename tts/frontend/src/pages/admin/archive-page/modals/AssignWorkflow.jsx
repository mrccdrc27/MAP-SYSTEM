import React, { useState, useEffect } from "react";
import styles from "./assign-workflow.module.css";
import api from "../../../../api/axios";

export default function AssignWorkflow({ ticket, onClose, onSuccess }) {
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingWorkflows, setFetchingWorkflows] = useState(true);
  const [error, setError] = useState("");

  // Fetch available workflows on mount
  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        setFetchingWorkflows(true);
        const response = await api.get("workflows/");
        // Filter to only show active/initialized workflows
        const activeWorkflows = (response.data || []).filter(
          (wf) => wf.status === "initialized" || wf.status === "active"
        );
        setWorkflows(activeWorkflows);
      } catch (err) {
        console.error("Failed to fetch workflows:", err);
        setError("Failed to load workflows");
      } finally {
        setFetchingWorkflows(false);
      }
    };

    fetchWorkflows();
  }, []);

  const handleAssign = async () => {
    if (!selectedWorkflow) {
      setError("Please select a workflow");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Call the task assignment API
      await api.post("tickets/assign-task/", {
        ticket_id: ticket.ticket_number || ticket.ticket_id,
        workflow_id: selectedWorkflow
      });
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to assign workflow:", err);
      setError(err.response?.data?.detail || "Failed to assign workflow. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Assign Ticket to Workflow</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Ticket Info */}
          <div className={styles.ticketInfo}>
            <div className={styles.infoRow}>
              <span className={styles.label}>Ticket #:</span>
              <span className={styles.value}>{ticket?.ticket_number || "-"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Subject:</span>
              <span className={styles.value}>{ticket?.ticket_subject || "-"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Priority:</span>
              <span className={`${styles.value} ${styles[`priority-${(ticket?.ticket_priority || "medium").toLowerCase()}`]}`}>
                {ticket?.ticket_priority || "Medium"}
              </span>
            </div>
          </div>

          {/* Workflow Selection */}
          <div className={styles.formGroup}>
            <label htmlFor="workflow-select">Select Workflow:</label>
            {fetchingWorkflows ? (
              <p className={styles.loadingText}>Loading workflows...</p>
            ) : workflows.length === 0 ? (
              <p className={styles.noWorkflows}>No active workflows available</p>
            ) : (
              <select
                id="workflow-select"
                value={selectedWorkflow}
                onChange={(e) => setSelectedWorkflow(e.target.value)}
                className={styles.workflowSelect}
                disabled={loading}
              >
                <option value="">-- Select a workflow --</option>
                {workflows.map((wf) => (
                  <option key={wf.workflow_id} value={wf.workflow_id}>
                    {wf.name} ({wf.status})
                  </option>
                ))}
              </select>
            )}
          </div>

          {error && <p className={styles.errorMessage}>{error}</p>}
        </div>

        <div className={styles.modalFooter}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className={styles.assignButton}
            onClick={handleAssign}
            disabled={loading || fetchingWorkflows || !selectedWorkflow}
          >
            {loading ? "Assigning..." : "Assign Workflow"}
          </button>
        </div>
      </div>
    </div>
  );
}
