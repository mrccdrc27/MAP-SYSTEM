// WorkflowManager.jsx
import React, { useState, useEffect } from "react";
import WorkflowCanvas from "./WorkflowCanvas";
import WorkflowSelector from "./WorkflowSelector";
import WorkflowFormSidebar from "./WorkflowFormSidebar";
import { useWorkflowEditor } from "../../api/workflow-graph/useWorkflowEditor";
import api from "../../api/axios";

export default function WorkflowManager() {
  const [workflowId, setWorkflowId] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);

  const {
    nodes,
    setNodes,
    edges,
    setEdges,
    save,
    loading,
    addStep,
    addTransition,
    updateNode,
    updateEdge
  } = useWorkflowEditor(workflowId);

  useEffect(() => {
    api.get("api/workflows/").then((res) => setWorkflows(res.data));
  }, []);

  return (
    <div style={{ display: "flex" }}>
      <div style={{ flex: 1 }}>
        <h2>Workflow Builder</h2>
        <WorkflowSelector
          workflows={workflows}
          selectedId={workflowId}
          onSelect={setWorkflowId}
        />

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <div style={{ marginBottom: 10 }}>
              <button onClick={addStep}>+ Add Step</button>
              <button onClick={addTransition}>+ Add Transition</button>
              <button onClick={save}>💾 Save</button>
            </div>

            <WorkflowCanvas
              nodesData={nodes}
              edgesData={edges}
              onNodesChange={setNodes}
              onEdgesChange={setEdges}
              onNodeClick={(node) => setSelectedElement(node)}
              onEdgeClick={(edge) => setSelectedElement(edge)}
            />
          </>
        )}
      </div>

      <WorkflowFormSidebar
        element={selectedElement}
        onClose={() => setSelectedElement(null)}
        onUpdateNode={updateNode}
        onUpdateEdge={updateEdge}
      />
    </div>
  );
}
