import { useState, useCallback } from 'react';
import api from './axios';

const WORKFLOW_BASE_URL = '/workflows';

export const useWorkflowAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get workflow details with graph
  const getWorkflowDetail = useCallback(async (workflowId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`${WORKFLOW_BASE_URL}/${workflowId}/detail/`);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch workflow details';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get workflow graph only
  const getWorkflowGraph = useCallback(async (workflowId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`${WORKFLOW_BASE_URL}/${workflowId}/graph/`);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch workflow graph';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update workflow graph (nodes and edges)
  const updateWorkflowGraph = useCallback(async (workflowId, graphData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.put(
        `${WORKFLOW_BASE_URL}/${workflowId}/update-graph/`,
        graphData
      );
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to update workflow graph';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update workflow details (metadata)
  const updateWorkflowDetails = useCallback(async (workflowId, detailsData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.put(
        `${WORKFLOW_BASE_URL}/${workflowId}/update-details/`,
        detailsData
      );
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to update workflow details';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update step details
  const updateStepDetails = useCallback(async (stepId, stepData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.put(
        `/workflows/steps/${stepId}/update-details/`,
        stepData
      );
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to update step details';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update transition details
  const updateTransitionDetails = useCallback(async (transitionId, transitionData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.put(
        `/transition/${transitionId}/update-details/`,
        transitionData
      );
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to update transition details';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getWorkflowDetail,
    getWorkflowGraph,
    updateWorkflowGraph,
    updateWorkflowDetails,
    updateStepDetails,
    updateTransitionDetails,
    loading,
    error,
  };
};
