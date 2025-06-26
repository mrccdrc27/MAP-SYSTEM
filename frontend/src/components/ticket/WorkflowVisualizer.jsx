import React, { useMemo, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { fetchWorkflowGraph } from "../../api/workflow-graph/workflow";

export default function WorkflowVisualizer() {
  const { uuid } = useParams();
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uuid) return;

    setLoading(true);
    fetchWorkflowGraph(uuid)
      .then((data) => {
        setGraphData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching graph:", err);
        setError(err.message || "Unknown error");
        setLoading(false);
      });
  }, [uuid]);

  // Safe fallback values for hooks
  const rawNodes = graphData?.nodes || [];
  const rawEdges = graphData?.edges || [];

  const flowNodes = useMemo(() => rawNodes.map((node, index) => {
    const statusColor = {
      done: "#4CAF50",
      active: "#FF9800",
      pending: "#B0BEC5",
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

  // Render logic
  if (loading) {
    return <p style={{ padding: "1rem", fontStyle: "italic" }}>Loading visual workflow...</p>;
  }

  if (error) {
    return <p style={{ padding: "1rem", color: "red" }}>Error: {error}</p>;
  }

  if (!graphData) {
    return <p style={{ padding: "1rem", fontStyle: "italic" }}>No workflow data found.</p>;
  }

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
        <Controls showZoom showFitView />
        <Background gap={12} color="#eee" />
      </ReactFlow>
    </div>
  );
}
