import { useState, useCallback } from "react";
import api from "./axios";

/**
 * Unified hook for aggregated reporting analytics
 * 
 * Provides access to 3 aggregated endpoints:
 * - ticketsReport: Tickets analytics (dashboard, status, SLA, priority, age)
 * - workflowsReport: Workflows analytics (metrics, departments, steps)
 * - tasksReport: Task items analytics (status, origin, performance, transfers)
 * 
 * Supports time filtering via query parameters:
 * - start_date: ISO 8601 date string (YYYY-MM-DD)
 * - end_date: ISO 8601 date string (YYYY-MM-DD)
 */
const useReportingAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State for aggregated endpoints
  const [ticketsReport, setTicketsReport] = useState(null);
  const [workflowsReport, setWorkflowsReport] = useState(null);
  const [tasksReport, setTasksReport] = useState(null);

  /**
   * Fetch all analytics in parallel
   * Optional: pass dateRange object with start_date and end_date
   */
  const fetchAllAnalytics = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    
    try {
      // Build query parameters
      let queryParams = new URLSearchParams();
      if (dateRange?.start_date) {
        queryParams.append('start_date', dateRange.start_date);
      }
      if (dateRange?.end_date) {
        queryParams.append('end_date', dateRange.end_date);
      }
      const queryString = queryParams.toString();
      const qPrefix = queryString ? '?' : '';

      // Fetch all 3 endpoints in parallel
      const [ticketsRes, workflowsRes, tasksRes] = await Promise.all([
        api.get(`analytics/reports/tickets/${qPrefix}${queryString}`),
        api.get(`analytics/reports/workflows/${qPrefix}${queryString}`),
        api.get(`analytics/reports/tasks/${qPrefix}${queryString}`),
      ]);

      setTicketsReport(ticketsRes.data);
      setWorkflowsReport(workflowsRes.data);
      setTasksReport(tasksRes.data);

      return {
        ticketsReport: ticketsRes.data,
        workflowsReport: workflowsRes.data,
        tasksReport: tasksRes.data,
      };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch analytics';
      setError(errorMsg);
      console.error('Analytics fetch error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch only tickets report
   * Optional: pass dateRange object with start_date and end_date
   */
  const fetchTicketsReport = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      let queryParams = new URLSearchParams();
      if (dateRange?.start_date) {
        queryParams.append('start_date', dateRange.start_date);
      }
      if (dateRange?.end_date) {
        queryParams.append('end_date', dateRange.end_date);
      }
      const queryString = queryParams.toString();
      const qPrefix = queryString ? '?' : '';

      const res = await api.get(`analytics/reports/tickets/${qPrefix}${queryString}`);
      setTicketsReport(res.data);
      return res.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch tickets report';
      setError(errorMsg);
      console.error('Tickets report fetch error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch only workflows report
   * Optional: pass dateRange object with start_date and end_date
   */
  const fetchWorkflowsReport = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      let queryParams = new URLSearchParams();
      if (dateRange?.start_date) {
        queryParams.append('start_date', dateRange.start_date);
      }
      if (dateRange?.end_date) {
        queryParams.append('end_date', dateRange.end_date);
      }
      const queryString = queryParams.toString();
      const qPrefix = queryString ? '?' : '';

      const res = await api.get(`analytics/reports/workflows/${qPrefix}${queryString}`);
      setWorkflowsReport(res.data);
      return res.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch workflows report';
      setError(errorMsg);
      console.error('Workflows report fetch error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch only tasks report
   * Optional: pass dateRange object with start_date and end_date
   */
  const fetchTasksReport = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      let queryParams = new URLSearchParams();
      if (dateRange?.start_date) {
        queryParams.append('start_date', dateRange.start_date);
      }
      if (dateRange?.end_date) {
        queryParams.append('end_date', dateRange.end_date);
      }
      const queryString = queryParams.toString();
      const qPrefix = queryString ? '?' : '';

      const res = await api.get(`analytics/reports/tasks/${qPrefix}${queryString}`);
      setTasksReport(res.data);
      return res.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch tasks report';
      setError(errorMsg);
      console.error('Tasks report fetch error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // State
    loading,
    error,
    ticketsReport,
    workflowsReport,
    tasksReport,
    
    // Methods
    fetchAllAnalytics,
    fetchTicketsReport,
    fetchWorkflowsReport,
    fetchTasksReport,
  };
};

export default useReportingAnalytics;

