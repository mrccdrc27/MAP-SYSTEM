import api from "../axios"; // axios instance

export const fetchWorkflowGraph = (workflowId) =>
  api.get(`/api/graph/${workflowId}/`).then((res) => res.data)

export const saveWorkflowGraph = (payload) =>
  api.post(`/api/workflows/save-graph/`, payload);
