import React, { useEffect, useState } from "react";
import ReactFlow, { Background, Controls, MiniMap } from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";
import styles from "./WorkflowVisualizer.module.css";
import { useWorkflowRefresh } from "./WorkflowRefreshContext";
import api from "../../api/axios";  // ← use your shared axios instance

const nodeWidth = 200;
const nodeHeight = 80;
const START = "start-node",
  END = "end-node";

function getLayout(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "TB",
    nodesep: 150,
    ranksep: 120,
    marginx: 50,
    marginy: 50,
    align: "UL",
  });
  nodes.forEach((n) =>
    g.setNode(n.id, { width: nodeWidth, height: nodeHeight })
  );
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  const layoutedNodes = nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: { x: pos.x - nodeWidth / 2, y: pos.y - nodeHeight / 2 },
      targetPosition: "top",
      sourcePosition: "bottom",
    };
  });
  return { nodes: preventOverlaps(layoutedNodes), edges };
}

function preventOverlaps(nodes) {
  const fixed = [...nodes];
  const minDist = 50;
  for (let i = 0; i < fixed.length; i++) {
    for (let j = i + 1; j < fixed.length; j++) {
      const a = fixed[i],
        b = fixed[j];
      const dx = a.position.x - b.position.x;
      const dy = a.position.y - b.position.y;
      const dist = Math.hypot(dx, dy);
      const required =
        Math.hypot(nodeWidth + minDist, nodeHeight + minDist) / 2;
      if (dist < required && dist > 0) {
        const sepX = (dx / dist) * (required - dist) / 2;
        const sepY = (dy / dist) * (required - dist) / 2;
        a.position.x += sepX;
        a.position.y += sepY;
        b.position.x -= sepX;
        b.position.y -= sepY;
      }
    }
  }
  return fixed;
}

export default function WorkflowVisualizer({ workflowId }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const { refreshKey } = useWorkflowRefresh();

  useEffect(() => {
    if (!workflowId) return;

    api
      .get(`/api/graph/${workflowId}/`)       // ← use api instead of axios, relative to baseURL
      .then(({ data }) => {
        const hasStart = data.edges.some((e) => !e.from);
        const hasEnd = data.edges.some((e) => !e.to);

        const nodeData = data.nodes.map((n) => ({
          id: n.id,
          data: { label: n.label },
          position: { x: 0, y: 0 },
        }));
        if (hasStart)
          nodeData.push({
            id: START,
            data: { label: "Start" },
            position: { x: 0, y: 0 },
            type: "input",
          });
        if (hasEnd)
          nodeData.push({
            id: END,
            data: { label: "End" },
            position: { x: 0, y: 0 },
            type: "output",
          });

        const edgeData = data.edges.map((e, i) => ({
          id: `e${i}`,
          source: e.from || START,
          target: e.to || END,
          label: e.action,
          animated: true,
          markerEnd: { type: "arrowclosed" },
          style: { strokeWidth: 2 },
          labelStyle: { fontSize: 10 },
        }));

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayout(
          nodeData,
          edgeData
        );
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
      })
      .catch((err) => console.error("Error loading workflow:", err));
  }, [workflowId, refreshKey]);

  return (
    <div className={styles.canvasContainer}>
      <div className={styles.reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={false}
          nodesConnectable={false}
          minZoom={0.1}
          maxZoom={2}
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
}
