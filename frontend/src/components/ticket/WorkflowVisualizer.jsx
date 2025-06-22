import React, { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState
} from "reactflow";
import "reactflow/dist/style.css";

export default function WorkflowVisualizer({ workflowData }) {
  if (!workflowData) {
    return <p style={{ padding: "1rem", fontStyle: "italic" }}>Loading visual workflow...</p>;
  }

  const { nodes: rawNodes, edges: rawEdges } = workflowData;

  const flowNodes = useMemo(() => rawNodes.map((node, index) => {
    const statusColor = {
      done: "#4CAF50",       // Green
      active: "#FF9800",     // Orange
      pending: "#B0BEC5"     // Gray
    }[node.status] || "#ccc";

    return {
      id: node.id,
      data: {
        label: (
          <div style={{ textAlign: "left" }}>
            <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: 4 }}>{node.label}</div>
            <div style={{ fontSize: "12px", color: "#555" }}>{node.role}</div>
            <div
              style={{
                marginTop: 6,
                display: "inline-block",
                fontSize: "11px",
                background: statusColor,
                color: "#fff",
                padding: "2px 6px",
                borderRadius: "12px",
              }}
            >
              {node.status}
            </div>
          </div>
        ),
      },
      position: { x: 0, y: index * 180 },
      style: {
        background: "#fff",
        border: `2px solid ${statusColor}`,
        borderRadius: 12,
        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
        padding: 12,
        width: 260,
      },
    };
  }), [rawNodes]);

  const flowEdges = useMemo(() => rawEdges
    .filter((e) => e.from && e.to)
    .map((edge) => ({
      id: `${edge.from}-${edge.to}`,
      source: edge.from,
      target: edge.to,
      label: edge.action,
      animated: true,
      style: { stroke: "#90A4AE" },
      labelStyle: {
        fill: "#333",
        fontSize: 12,
      },
    })), [rawEdges]);

  const [nodes, , onNodesChange] = useNodesState(flowNodes);
  const [edges, , onEdgesChange] = useEdgesState(flowEdges);

  return (
    <div style={{ height: "80vh", width: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <MiniMap nodeStrokeWidth={2} nodeColor="#ccc" />
        <Controls showZoom={true} showFitView={true} />
        <Background gap={12} color="#eee" />
      </ReactFlow>
    </div>
  );
}
