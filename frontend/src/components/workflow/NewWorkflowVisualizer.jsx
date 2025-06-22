import React, { useEffect, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
} from "reactflow";
import "reactflow/dist/style.css";
import axios from "axios";
import dagre from "dagre";

const START_NODE_ID = "start-node";
const END_NODE_ID = "end-node";
const nodeWidth = 250;
const nodeHeight = 120; // increased for multi-line label spacing

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

function getLayoutedElements(nodes, edges, direction = "TB") {
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 100,    // horizontal spacing
    ranksep: 150,    // vertical spacing
    marginx: 50,
    marginy: 50,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: nodeWidth,
      height: nodeHeight,
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const { x, y } = dagreGraph.node(node.id);
    node.position = { x, y };
    node.targetPosition = "top";
    node.sourcePosition = "bottom";
  });

  return { nodes, edges };
}

export default function WorkflowVisualizer({ workflowId }) {
  const [workflow, setWorkflow] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  // Fetch workflow graph
  useEffect(() => {
    async function fetchWorkflow() {
      try {
        const res = await axios.get(`http://192.168.100.6:2000/api/graph/${workflowId}/`);
        setWorkflow(res.data);
      } catch (err) {
        console.error("Failed to fetch workflow:", err);
      }
    }
    if (workflowId) fetchWorkflow();
  }, [workflowId]);

  // Build nodes and edges
  useEffect(() => {
    if (!workflow) return;

    const baseNodes = workflow.nodes.map((step) => ({
      id: step.id,
      type: "default",
      data: {
        label: (
          <div>
            <strong>{step.label}</strong>
            <div><small>Role: {step.role}</small></div>
            <div><small>Status: {step.status}</small></div>
          </div>
        ),
      },
      position: { x: 0, y: 0 }, // will be set by Dagre
    }));

    const startNode = {
      id: START_NODE_ID,
      type: "input",
      data: { label: "Start" },
      position: { x: 0, y: 0 },
    };

    const endNode = {
      id: END_NODE_ID,
      type: "output",
      data: { label: "End" },
      position: { x: 0, y: 0 },
    };

    const baseEdges = workflow.edges.map((edge) => {
      const source = edge.from || START_NODE_ID;
      const target = edge.to || END_NODE_ID;
      const isToEnd = edge.to === null;
    
      return {
        id: `${source}-${target}`,
        source,
        target,
        label: edge.action,
        animated: true,
        style: {
          strokeWidth: 2,
          stroke: isToEnd ? "#dc3545" : "#333", // red if ending
        },
        markerEnd: {
          type: "arrowclosed",
          color: isToEnd ? "#dc3545" : "#333",
        },
        labelBgPadding: [6, 4],
        labelBgBorderRadius: 8,
        labelBgStyle: {
          fill: "#ffffff",
          stroke: "#ccc",
          strokeWidth: 1,
        },
        labelStyle: {
          fontSize: 12,
          fill: "#000",
        },
      };
    });
    

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      [...baseNodes, startNode, endNode],
      baseEdges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [workflow]);

  return (
<div style={{ width: "100%", height: "600px" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesConnectable={true}
        nodesDraggable={true}
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}
