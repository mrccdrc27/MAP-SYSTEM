import { useCallback, useState } from 'react';
import api from './axios';

const WORKFLOW_BASE_URL = '/workflows';

export const useCreateWorkflow = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Create a new workflow with optional graph structure
   * @param {Object} workflowData - Basic workflow information
   * @param {string} workflowData.name - Workflow name
   * @param {string} workflowData.description - Workflow description
   * @param {string} workflowData.category - Category name
   * @param {string} workflowData.sub_category - Sub-category name
   * @param {string} workflowData.department - Department name
   * @param {string} [workflowData.end_logic] - Optional end logic
   * @param {Object} [workflowData.low_sla] - Low priority SLA
   * @param {Object} [workflowData.medium_sla] - Medium priority SLA
   * @param {Object} [workflowData.high_sla] - High priority SLA
   * @param {Object} [workflowData.urgent_sla] - Urgent priority SLA
   * @param {Object} [graphData] - Optional workflow graph structure
   * @param {Array} [graphData.nodes] - Array of workflow steps/nodes
   * @param {Array} [graphData.edges] - Array of workflow transitions/edges
   * @returns {Promise<Object>} Created workflow data with graph
   */
  const createWorkflow = useCallback(async (workflowData, graphData = null) => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        workflow: workflowData,
      };

      if (graphData) {
        payload.graph = graphData;
      }

      console.log('📤 Sending workflow creation request:', payload);
      const response = await api.post(`${WORKFLOW_BASE_URL}/`, payload);
      console.log('📥 Received workflow response:', response.data);
      return response.data;
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || 'Failed to create workflow';
      console.error('❌ Workflow creation error:', err);
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createWorkflow, loading, error };
};
