// src/api/useWorkflowVersions.jsx
import { useState, useCallback } from 'react';
import api from './axios';

/**
 * Hook for managing workflow versions (history and rollback)
 * @param {number|string} workflowId - The workflow ID to fetch versions for
 */
const useWorkflowVersions = (workflowId) => {
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch all versions for the workflow
   */
  const fetchVersions = useCallback(async () => {
    if (!workflowId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/workflows/${workflowId}/versions/`);
      setVersions(response.data);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch workflow versions';
      setError(errorMsg);
      console.error('Error fetching workflow versions:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  /**
   * Fetch a specific version's full definition
   * @param {number|string} versionId - The version ID to fetch
   */
  const fetchVersionDetail = useCallback(async (versionId) => {
    if (!workflowId || !versionId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/workflows/${workflowId}/versions/${versionId}/`);
      setSelectedVersion(response.data);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch version details';
      setError(errorMsg);
      console.error('Error fetching version details:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  /**
   * Rollback workflow to a specific version
   * @param {number|string} versionId - The version ID to rollback to
   */
  const rollbackToVersion = useCallback(async (versionId) => {
    if (!workflowId || !versionId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post(`/workflows/${workflowId}/versions/${versionId}/rollback/`);
      // Refresh versions list after rollback
      await fetchVersions();
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to rollback workflow';
      setError(errorMsg);
      console.error('Error rolling back workflow:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [workflowId, fetchVersions]);

  /**
   * Clear the selected version
   */
  const clearSelectedVersion = useCallback(() => {
    setSelectedVersion(null);
  }, []);

  return {
    versions,
    selectedVersion,
    loading,
    error,
    fetchVersions,
    fetchVersionDetail,
    rollbackToVersion,
    clearSelectedVersion,
  };
};

export default useWorkflowVersions;
