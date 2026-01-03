import { useState, useCallback } from 'react';
import api from './axios';

const WORKFLOW_BASE_URL = '/workflows';

/**
 * Convert a workflow name to a URL-safe slug
 * Replaces spaces with hyphens and encodes special characters
 */
export const workflowNameToSlug = (name) => {
  if (!name) return '';
  return name.trim().replace(/\s+/g, '-');
};

/**
 * Convert a slug back to a workflow name
 * Replaces hyphens with spaces
 */
export const slugToWorkflowName = (slug) => {
  if (!slug) return '';
  return slug.replace(/-/g, ' ');
};

export const useWorkflowAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Get workflow details with graph by ID
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

  // Get workflow details with graph by name (slug)
  const getWorkflowDetailByName = useCallback(async (workflowName) => {
    setLoading(true);
    setError(null);
    try {
      // URL encode the name to handle special characters
      const encodedName = encodeURIComponent(workflowName);
      const response = await api.get(`${WORKFLOW_BASE_URL}/by-name/${encodedName}/`);
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
        `/workflows/transitions/${transitionId}/update-details/`,
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
  // /steps/weights/workflow/2/
  // Get weight management data (SLAs and step weights)
  const getWeightData = useCallback(async (workflowId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/steps/weights/workflow/${workflowId}/`);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch weight data';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update step weights
  const updateStepWeights = useCallback(async (workflowId, stepsData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.put(
        `/steps/weights/workflow/${workflowId}/`,
        { steps: stepsData }
      );
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to update step weights';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getWorkflowDetail,
    getWorkflowDetailByName,
    getWorkflowGraph,
    updateWorkflowGraph,
    updateWorkflowDetails,
    updateStepDetails,
    updateTransitionDetails,
    getWeightData,
    updateStepWeights,
    loading,
    error,
  };
};
