// WorkflowSelector.jsx
import React from "react";

export default function WorkflowSelector({ workflows, selectedId, onSelect }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor="workflow-select">Select Workflow:</label>
      <select
        id="workflow-select"
        value={selectedId || ""}
        onChange={(e) => onSelect(e.target.value)}
        style={{ marginLeft: 8 }}
      >
        <option value="">-- Choose --</option>
        {workflows.map((wf) => (
          <option key={wf.workflow_id} value={wf.workflow_id}>
            {wf.name}
          </option>
        ))}
      </select>
    </div>
  );
}
