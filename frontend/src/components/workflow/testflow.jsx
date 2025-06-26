import React from "react";
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
} from "reactflow";
import "reactflow/dist/style.css";

export default function TestFlow() {
  const nodes = [
    {
      id: "start",
      type: "input",
      data: { label: "Start" },
      position: { x: 0, y: 100 },
    },
    {
      id: "1",
      data: { label: "Submit Form" },
      position: { x: 200, y: 100 },
    },
    {
      id: "2",
      data: { label: "Review Documents" },
      position: { x: 400, y: 100 },
    },
    {
      id: "3",
      data: { label: "Final Approval" },
      position: { x: 600, y: 100 },
    },
    {
      id: "end",
      type: "output",
      data: { label: "End" },
      position: { x: 800, y: 100 },
    },
  ];

  const edges = [
    { id: "e0", source: "start", target: "1", animated: true, label: "start" },
    { id: "e1", source: "1", target: "2", label: "submit", animated: true },
    { id: "e2", source: "2", target: "3", label: "approve", animated: true },
    { id: "e3", source: "3", target: "end", label: "complete", animated: true },
    { id: "e4", source: "2", target: "1", label: "reject", animated: true },
  ];

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
