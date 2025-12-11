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
 * Plus trend endpoints:
 * - ticketTrends: Ticket creation/resolution trends over time
 * - taskItemTrends: Task item status trends over time
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
  
  // State for trend endpoints
  const [ticketTrends, setTicketTrends] = useState(null);
  const [taskItemTrends, setTaskItemTrends] = useState(null);
  
  // State for category analytics
  const [ticketCategories, setTicketCategories] = useState(null);

  /**
   * Fetch all analytics in parallel (including trends)
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
      const queryPrefix = queryString ? `?${queryString}` : '';

      // Fetch all endpoints in parallel (including trends and categories)
      // Use Promise.allSettled to handle individual failures gracefully
      const results = await Promise.allSettled([
        api.get(`analytics/reports/tickets/${queryPrefix}`),
        api.get(`analytics/reports/workflows/${queryPrefix}`),
        api.get(`analytics/reports/tasks/${queryPrefix}`),
        api.get(`analytics/ticket-trends/?days=30`),
        api.get(`analytics/task-item-trends/?days=30`),
        api.get(`analytics/ticket-categories/${queryPrefix}`),
      ]);

      const [ticketsRes, workflowsRes, tasksRes, ticketTrendsRes, taskItemTrendsRes, ticketCategoriesRes] = results;

      // Extract data from fulfilled promises, null for rejected
      const ticketsData = ticketsRes.status === 'fulfilled' ? ticketsRes.value.data : null;
      const workflowsData = workflowsRes.status === 'fulfilled' ? workflowsRes.value.data : null;
      const tasksData = tasksRes.status === 'fulfilled' ? tasksRes.value.data : null;
      const ticketTrendsData = ticketTrendsRes.status === 'fulfilled' ? ticketTrendsRes.value.data : null;
      const taskItemTrendsData = taskItemTrendsRes.status === 'fulfilled' ? taskItemTrendsRes.value.data : null;
      const ticketCategoriesData = ticketCategoriesRes.status === 'fulfilled' ? ticketCategoriesRes.value.data : null;

      setTicketsReport(ticketsData);
      setWorkflowsReport(workflowsData);
      setTasksReport(tasksData);
      setTicketTrends(ticketTrendsData);
      setTaskItemTrends(taskItemTrendsData);
      setTicketCategories(ticketCategoriesData);

      // Log any failures for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const endpoints = ['tickets', 'workflows', 'tasks', 'ticket-trends', 'task-item-trends', 'ticket-categories'];
          console.warn(`Analytics fetch failed for ${endpoints[index]}:`, result.reason);
        }
      });

      return {
        ticketsReport: ticketsData,
        workflowsReport: workflowsData,
        tasksReport: tasksData,
        ticketTrends: ticketTrendsData,
        taskItemTrends: taskItemTrendsData,
        ticketCategories: ticketCategoriesData,
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
      const queryPrefix = queryString ? `?${queryString}` : '';

      const res = await api.get(`analytics/reports/tickets/${queryPrefix}`);
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
      const queryPrefix = queryString ? `?${queryString}` : '';

      const res = await api.get(`analytics/reports/workflows/${queryPrefix}`);
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
      const queryPrefix = queryString ? `?${queryString}` : '';

      const res = await api.get(`analytics/reports/tasks/${queryPrefix}`);
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

  /**
   * Fetch ticket trends (created vs resolved over time)
   * Optional: pass days parameter (default: 30)
   */
  const fetchTicketTrends = useCallback(async (days = 30) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`analytics/ticket-trends/?days=${days}`);
      setTicketTrends(res.data);
      return res.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch ticket trends';
      setError(errorMsg);
      console.error('Ticket trends fetch error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch task item trends (status changes over time)
   * Optional: pass days parameter (default: 30)
   */
  const fetchTaskItemTrends = useCallback(async (days = 30) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`analytics/task-item-trends/?days=${days}`);
      setTaskItemTrends(res.data);
      return res.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch task item trends';
      setError(errorMsg);
      console.error('Task item trends fetch error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch ticket category analytics (category, sub_category, department)
   * Optional: pass dateRange object with start_date and end_date
   */
  const fetchTicketCategories = useCallback(async (dateRange = null) => {
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
      const queryPrefix = queryString ? `?${queryString}` : '';

      const res = await api.get(`analytics/ticket-categories/${queryPrefix}`);
      setTicketCategories(res.data);
      return res.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch ticket categories';
      setError(errorMsg);
      console.error('Ticket categories fetch error:', err);
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
    ticketTrends,
    taskItemTrends,
    ticketCategories,
    
    // Methods
    fetchAllAnalytics,
    fetchTicketsReport,
    fetchWorkflowsReport,
    fetchTasksReport,
    fetchTicketTrends,
    fetchTaskItemTrends,
    fetchTicketCategories,
  };
};

export default useReportingAnalytics;

