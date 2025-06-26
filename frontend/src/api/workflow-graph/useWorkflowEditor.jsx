import { useEffect, useState } from "react";
import { fetchWorkflowGraph, saveWorkflowGraph } from "./workflow";
import { v4 as uuidv4 } from "uuid";

export function useWorkflowEditor(workflowId) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);

  const save = async () => {
    const stepPayload = nodes.map((node) => ({
      id: node.id,
      label: node.data.labelText || "",
      instruction: node.data.instruction || "",
      role: node.data.role || "",
      status: node.data.status || "draft",
    }));
  
    try {
      await saveWorkflowGraph({
        workflow_id: workflowId,
        nodes: stepPayload,
        edges: [], // omit or send if needed later
      });
      console.log("Steps saved!");
    } catch (err) {
      console.error("Error saving steps:", err);
    }
  };

  
  useEffect(() => {
    if (!workflowId) return;
    setLoading(true);
    fetchWorkflowGraph(workflowId)
      .then((data) => {
        // ✅ 1. Transform nodes with position and style
        const flowNodes = data.nodes.map((node, index) => ({
          id: node.id,
          data: {
            label: (
              <div>
                <strong>{node.label}</strong>
                <br />
                <em>{node.role}</em>
                <br />
                <small>{node.instruction}</small>
              </div>
            ),
            role: node.role,
            labelText: node.label,
            instruction: node.instruction,
            status: node.status,
          },
          position: { x: 0, y: index * 150 },
          style: {
            border: "2px solid",
            borderColor:
              node.status === "done"
                ? "green"
                : node.status === "active"
                ? "orange"
                : "gray",
            padding: 10,
            borderRadius: 10,
            width: 250,
          },
        }));

        // ✅ 2. Transform edges
        const flowEdges = data.edges
          .filter((e) => e.from && e.to)
          .map((edge) => ({
            id: `${edge.from}-${edge.to}`,
            source: edge.from,
            target: edge.to,
            label: edge.action,
            animated: true,
            style: { stroke: "#555" },
            labelStyle: {
              fill: "#000",
              fontWeight: 600,
            },
          }));

        setNodes(flowNodes);
        setEdges(flowEdges);
      })
      .catch((err) => console.error("Failed to load workflow graph:", err))
      .finally(() => setLoading(false));
  }, [workflowId]);

  // ✅ Add Step Function
  const addStep = () => {
    const newId = uuidv4(); // requires `import { v4 as uuidv4 } from 'uuid'`
    const newNode = {
      id: newId,
      data: {
        label: (
          <div>
            <strong>New Step</strong>
            <br />
            <em>Role</em>
            <br />
            <small>Instruction</small>
          </div>
        ),
      },
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      style: {
        border: "2px solid gray",
        padding: 10,
        borderRadius: 10,
        width: 250,
      },
    };
    setNodes((prev) => [...prev, newNode]);
  };

  const updateNode = (id, newData) => {
    setNodes((prev) =>
      prev.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                ...newData,
                label: (
                  <div>
                    <strong>{newData.labelText}</strong>
                    <br />
                    <em>{newData.role}</em>
                    <br />
                    <small>{newData.instruction}</small>
                  </div>
                ),
              },
            }
          : node
      )
    );
  };

  const updateEdge = (id, newData) => {
    setEdges((prev) =>
      prev.map((edge) =>
        edge.id === id
          ? {
              ...edge,
              label: newData.action,
            }
          : edge
      )
    );
  };
  
  return {
    nodes,
    setNodes,
    edges,
    setEdges,
    save,
    loading,
    addStep,
    updateNode,   // ✅ make sure this is included
    updateEdge, 
  };
}
