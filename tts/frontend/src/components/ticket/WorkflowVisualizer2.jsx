// components/WorkflowTracker.jsx
import React from "react";
import styles from "./WorkflowTrackerBase.module.css";

const statusIcons = {
  done: (
    <span className={styles.icon}>
      <i className="fa-solid fa-circle-check"></i>
    </span>
  ),
  active: (
    <span className={styles.icon}>
      <i className="fa-solid fa-location-pin"></i>
    </span>
  ),
  pending: (
    <span className={styles.icon}>
      <i className="fa-solid fa-spinner"></i>
    </span>
  ),
};

export default function WorkflowVisualizer2({ workflowData, ticketStatus }) {
  // Debug logging to check node statuses
  // console.log("WorkflowVisualizer2 - workflowData:", workflowData);
  // if (workflowData?.nodes) {
  //   workflowData.nodes.forEach((node, index) => {
  //     console.log(`Node ${index}: ${node.label} - Status: ${node.status}`);
  //   });
  // }

  if (
    !workflowData ||
    !Array.isArray(workflowData.nodes) ||
    workflowData.nodes.length === 0
  ) {
    return <div className={styles.loading}>Loading visual workflow...</div>;
  }

  const nodes = workflowData.nodes;
  const isSingle = nodes.length === 1;

  // Fix for last node: if ticket status is "resolved", the last node should be "done" instead of "active"
  const processedNodes = nodes.map((node, index) => {
    const isLastNode = index === nodes.length - 1;
    
    if (isLastNode && node.status === 'active' && ticketStatus?.toLowerCase() === 'resolved') {
      return { ...node, status: 'done' };
    }
    
    return node;
  });

  const renderConnector = (index, currentStatus, nextStatus) => {
    if (index === processedNodes.length - 1) return null;

    const isActive =
      currentStatus === "done" ||
      (currentStatus === "active" && nextStatus !== "done");

    return (
      <div
        className={`${styles.connector} ${isActive ? styles.active : ""}`}
        key={`connector-${index}`}
      />
    );
  };

  return (
    <div className={styles.container}>
      {/* og */}
      <div className={`${styles.workflow} ${isSingle ? styles.single : ""}`}>
        {processedNodes.map((node, index) => {
          const nextNode = processedNodes[index + 1];

          return (
            <React.Fragment key={node.id}>
              <div className={styles.nodeContainer}>
                <div className={`${styles.circle} ${styles[node.status]}`}>
                  {statusIcons[node.status] || "❔"}
                </div>

                <div className={styles.nodeInfo}>
                  <div className={styles.nodeLabel}>{node.label}</div>
                  <div className={styles.nodeRole}>{node.role}</div>
                </div>
              </div>

              {renderConnector(index, node.status, nextNode?.status)}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
