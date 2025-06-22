// components/WorkflowTracker.jsx
import React from "react";

const statusIcons = {
  done: "✅",
  active: "🟠",
  pending: "⏳",
};

const statusColors = {
  done: "#4CAF50",
  active: "#FF9800",
  pending: "#B0BEC5",
};

export default function WorkflowTracker2({ workflowData }) {
  if (!workflowData) {
    return <p>Loading tracker...</p>;
  }

  return (
    <div style={{ padding: "1rem" }}>
      <h3 style={{ marginBottom: "1rem" }}>Workflow Progress</h3>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {workflowData.nodes.map((node) => (
          <li
            key={node.id}
            style={{
              marginBottom: "1rem",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              backgroundColor: "#f9f9f9",
              borderLeft: `6px solid ${statusColors[node.status] || "#ccc"}`,
            }}
          >
            <div style={{ fontSize: "18px", fontWeight: 500 }}>
              {statusIcons[node.status] || "❔"} {node.label}
            </div>
            <div style={{ fontSize: "14px", color: "#555" }}>
              Role: <strong>{node.role}</strong>
            </div>
            {node.instruction && (
              <div style={{ fontSize: "13px", marginTop: "4px", color: "#777" }}>
                📘 {node.instruction}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
