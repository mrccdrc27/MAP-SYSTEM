import { useState, useCallback } from "react";
import api from "./axios";

/**
 * Hook for drillable reporting analytics
 * 
 * Provides access to drill-down endpoints that return detailed records
 * when clicking on aggregated analytics data points.
 * 
 * All endpoints support:
 * - Pagination (page, page_size)
 * - Date filtering (start_date, end_date)
 * - Various specific filters depending on endpoint
 */
const useDrilldownAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [drilldownData, setDrilldownData] = useState(null);

  /**
   * Build query string from params object
   */
  const buildQueryString = (params) => {
    const queryParams = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });
    const queryString = queryParams.toString();
    return queryString ? `?${queryString}` : '';
  };

  /**
   * Drill down into tickets by status
   * @param {Object} params - { status, priority, workflow_id, start_date, end_date, page, page_size }
   */
  const drilldownTicketsByStatus = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryString = buildQueryString(params);
      const res = await api.get(`analytics/drilldown/tickets/status/${queryString}`);
      setDrilldownData(res.data);
      return res.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch drilldown data';
      setError(errorMsg);
      console.error('Drilldown error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Drill down into tickets by priority
   * @param {Object} params - { priority, status, start_date, end_date, page, page_size }
   */
  const drilldownTicketsByPriority = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryString = buildQueryString(params);
      const res = await api.get(`analytics/drilldown/tickets/priority/${queryString}`);
      setDrilldownData(res.data);
      return res.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch drilldown data';
      setError(errorMsg);
      console.error('Drilldown error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Drill down into tickets by age bucket
   * @param {Object} params - { age_bucket, status, page, page_size }
   */
  const drilldownTicketsByAge = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryString = buildQueryString(params);
      const res = await api.get(`analytics/drilldown/tickets/age/${queryString}`);
      setDrilldownData(res.data);
      return res.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch drilldown data';
      setError(errorMsg);
      console.error('Drilldown error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Drill down into SLA compliance
   * @param {Object} params - { sla_status, priority, start_date, end_date, page, page_size }
   */
  const drilldownSLACompliance = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryString = buildQueryString(params);
      const res = await api.get(`analytics/drilldown/tickets/sla/${queryString}`);
      setDrilldownData(res.data);
      return res.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch drilldown data';
      setError(errorMsg);
      console.error('Drilldown error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Drill down into user tasks
   * @param {Object} params - { user_id (required), status, start_date, end_date, page, page_size }
   */
  const drilldownUserTasks = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryString = buildQueryString(params);
      const res = await api.get(`analytics/drilldown/user-tasks/${queryString}`);
      setDrilldownData(res.data);
      return res.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch drilldown data';
      setError(errorMsg);
      console.error('Drilldown error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Drill down into workflow tasks
   * @param {Object} params - { workflow_id (required), status, step_id, start_date, end_date, page, page_size }
   */
  const drilldownWorkflowTasks = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryString = buildQueryString(params);
      const res = await api.get(`analytics/drilldown/workflows/${queryString}`);
      setDrilldownData(res.data);
      return res.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch drilldown data';
      setError(errorMsg);
      console.error('Drilldown error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Drill down into step tasks
   * @param {Object} params - { step_id (required), status, page, page_size }
   */
  const drilldownStepTasks = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryString = buildQueryString(params);
      const res = await api.get(`analytics/drilldown/steps/${queryString}`);
      setDrilldownData(res.data);
      return res.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch drilldown data';
      setError(errorMsg);
      console.error('Drilldown error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Drill down into department tasks
   * @param {Object} params - { department (required), status, start_date, end_date, page, page_size }
   */
  const drilldownDepartmentTasks = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryString = buildQueryString(params);
      const res = await api.get(`analytics/drilldown/departments/${queryString}`);
      setDrilldownData(res.data);
      return res.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch drilldown data';
      setError(errorMsg);
      console.error('Drilldown error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Drill down into task items by status
   * @param {Object} params - { status, start_date, end_date, page, page_size }
   */
  const drilldownTaskItemsByStatus = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryString = buildQueryString(params);
      const res = await api.get(`analytics/drilldown/task-items/status/${queryString}`);
      setDrilldownData(res.data);
      return res.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch drilldown data';
      setError(errorMsg);
      console.error('Drilldown error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Drill down into task items by origin
   * @param {Object} params - { origin, start_date, end_date, page, page_size }
   */
  const drilldownTaskItemsByOrigin = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryString = buildQueryString(params);
      const res = await api.get(`analytics/drilldown/task-items/origin/${queryString}`);
      setDrilldownData(res.data);
      return res.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch drilldown data';
      setError(errorMsg);
      console.error('Drilldown error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Drill down into transfers and escalations
   * @param {Object} params - { origin, user_id, start_date, end_date, page, page_size }
   */
  const drilldownTransfers = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryString = buildQueryString(params);
      const res = await api.get(`analytics/drilldown/transfers/${queryString}`);
      setDrilldownData(res.data);
      return res.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch drilldown data';
      setError(errorMsg);
      console.error('Drilldown error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear drilldown data (to close modal/panel)
   */
  const clearDrilldownData = useCallback(() => {
    setDrilldownData(null);
    setError(null);
  }, []);

  return {
    // State
    loading,
    error,
    drilldownData,
    
    // Methods - Tickets
    drilldownTicketsByStatus,
    drilldownTicketsByPriority,
    drilldownTicketsByAge,
    drilldownSLACompliance,
    
    // Methods - Workflows
    drilldownWorkflowTasks,
    drilldownStepTasks,
    drilldownDepartmentTasks,
    
    // Methods - Task Items
    drilldownTaskItemsByStatus,
    drilldownTaskItemsByOrigin,
    drilldownUserTasks,
    drilldownTransfers,
    
    // Utility
    clearDrilldownData,
  };
};

export default useDrilldownAnalytics;
