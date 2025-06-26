import React from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
} from "reactflow";
import "reactflow/dist/style.css";

import { useEffect } from "react";

export default function WorkflowCanvas({ nodesData, edgesData, onNodesChange, onEdgesChange,onNodeClick,onEdgeClick,
}) {
  const [nodes, setNodes, handleNodesChange] = useNodesState(nodesData);
  const [edges, setEdges, handleEdgesChange] = useEdgesState(edgesData);

  useEffect(() => {
    setNodes(nodesData);
  }, [nodesData]);

  useEffect(() => {
    setEdges(edgesData);
  }, [edgesData]);


  const onConnect = (params) =>
    setEdges((eds) => addEdge({ ...params, animated: true, label: "New Transition" }, eds));

  return (
    <div style={{ height: "80vh", width: "100%" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={(ch) => {
            handleNodesChange(ch);
            onNodesChange(nodes);
          }}
          onEdgesChange={(ch) => {
            handleEdgesChange(ch);
            onEdgesChange(edges);
          }}
        onNodeClick={(_, node) => onNodeClick && onNodeClick(node)}
        onEdgeClick={(_, edge) => onEdgeClick && onEdgeClick(edge)}
          onConnect={onConnect}
          fitView
        >

        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}
