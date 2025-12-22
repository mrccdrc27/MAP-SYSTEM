import { useState, useCallback } from "react";
import api from "./axios";

/**
 * API endpoint configuration for reporting analytics
 * Organized by category for easy maintenance and extensibility
 */
const ENDPOINTS = {
  // Ticket Analytics (granular)
  tickets: {
    dashboard: 'analytics/tickets/dashboard/',
    status: 'analytics/tickets/status/',
    priority: 'analytics/tickets/priority/',
    age: 'analytics/tickets/age/',
    sla: 'analytics/tickets/sla/',
  },
  // Workflow Analytics (granular)
  workflows: {
    metrics: 'analytics/workflows/metrics/',
    departments: 'analytics/workflows/departments/',
    steps: 'analytics/workflows/steps/',
  },
  // Task Item Analytics (granular)
  tasks: {
    status: 'analytics/tasks/status/',
    origin: 'analytics/tasks/origin/',
    performance: 'analytics/tasks/performance/',
    users: 'analytics/tasks/users/',
    transfers: 'analytics/tasks/transfers/',
  },
  // Trend Analytics
  trends: {
    tickets: 'analytics/ticket-trends/',
    taskItems: 'analytics/task-item-trends/',
  },
  // Category Analytics
  categories: {
    tickets: 'analytics/ticket-categories/',
  },
  // Operational Insights
  insights: {
    overview: 'analytics/insights/',
    workload: 'analytics/insights/workload/',
    slaRisk: 'analytics/insights/sla-risk/',
    anomalies: 'analytics/insights/anomalies/',
    health: 'analytics/insights/health/',
  },
  // Legacy aggregated endpoints (deprecated - for backward compatibility)
  legacy: {
    tickets: 'analytics/reports/tickets/',
    workflows: 'analytics/reports/workflows/',
    tasks: 'analytics/reports/tasks/',
  },
};

/**
 * Build query string from date range parameters
 */
const buildQueryString = (dateRange = null, additionalParams = {}) => {
  const params = new URLSearchParams();
  
  if (dateRange?.start_date) {
    params.append('start_date', dateRange.start_date);
  }
  if (dateRange?.end_date) {
    params.append('end_date', dateRange.end_date);
  }
  
  Object.entries(additionalParams).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      params.append(key, value);
    }
  });
  
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
};

/**
 * Unified hook for reporting analytics
 * 
 * Provides access to granular and aggregated analytics endpoints:
 * 
 * TICKET ANALYTICS:
 * - ticketDashboard: KPI metrics (total, completed, pending, in-progress)
 * - ticketStatus: Status distribution
 * - ticketPriority: Priority distribution
 * - ticketAge: Age bucket distribution
 * - ticketSLA: SLA compliance by priority
 * 
 * WORKFLOW ANALYTICS:
 * - workflowMetrics: Workflow performance metrics
 * - departmentAnalytics: Department-level analytics
 * - stepPerformance: Step-level performance
 * 
 * TASK ITEM ANALYTICS:
 * - taskStatus: Task item status distribution
 * - taskOrigin: Task item origin distribution
 * - taskPerformance: Time to action, SLA compliance
 * - userPerformance: Per-user metrics
 * - transferAnalytics: Transfer/escalation metrics
 * 
 * TRENDS:
 * - ticketTrends: Ticket creation/resolution trends
 * - taskItemTrends: Task item status trends
 * 
 * CATEGORIES:
 * - ticketCategories: Category, sub-category, department breakdown
 * 
 * All endpoints support date filtering via dateRange parameter:
 * { start_date: 'YYYY-MM-DD', end_date: 'YYYY-MM-DD' }
 */
const useReportingAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Ticket Analytics State
  const [ticketDashboard, setTicketDashboard] = useState(null);
  const [ticketStatus, setTicketStatus] = useState(null);
  const [ticketPriority, setTicketPriority] = useState(null);
  const [ticketAge, setTicketAge] = useState(null);
  const [ticketSLA, setTicketSLA] = useState(null);
  
  // Workflow Analytics State
  const [workflowMetrics, setWorkflowMetrics] = useState(null);
  const [departmentAnalytics, setDepartmentAnalytics] = useState(null);
  const [stepPerformance, setStepPerformance] = useState(null);
  
  // Task Item Analytics State
  const [taskStatus, setTaskStatus] = useState(null);
  const [taskOrigin, setTaskOrigin] = useState(null);
  const [taskPerformance, setTaskPerformance] = useState(null);
  const [userPerformance, setUserPerformance] = useState(null);
  const [transferAnalytics, setTransferAnalytics] = useState(null);
  
  // Trend Analytics State
  const [ticketTrends, setTicketTrends] = useState(null);
  const [taskItemTrends, setTaskItemTrends] = useState(null);
  
  // Category Analytics State
  const [ticketCategories, setTicketCategories] = useState(null);
  
  // Operational Insights State
  const [operationalInsights, setOperationalInsights] = useState(null);
  const [workloadAnalysis, setWorkloadAnalysis] = useState(null);
  const [slaRiskReport, setSlaRiskReport] = useState(null);
  const [anomalyDetection, setAnomalyDetection] = useState(null);
  const [serviceHealth, setServiceHealth] = useState(null);
  
  // Legacy state (for backward compatibility)
  const [ticketsReport, setTicketsReport] = useState(null);
  const [workflowsReport, setWorkflowsReport] = useState(null);
  const [tasksReport, setTasksReport] = useState(null);

  // ==================== GENERIC FETCH HELPER ====================
  
  const fetchEndpoint = useCallback(async (endpoint, dateRange = null, additionalParams = {}) => {
    const queryString = buildQueryString(dateRange, additionalParams);
    const response = await api.get(`${endpoint}${queryString}`);
    return response.data;
  }, []);

  // ==================== TICKET ANALYTICS ====================

  const fetchTicketDashboard = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(ENDPOINTS.tickets.dashboard, dateRange);
      setTicketDashboard(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch ticket dashboard');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  const fetchTicketStatus = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(ENDPOINTS.tickets.status, dateRange);
      setTicketStatus(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch ticket status');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  const fetchTicketPriority = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(ENDPOINTS.tickets.priority, dateRange);
      setTicketPriority(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch ticket priority');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  const fetchTicketAge = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(ENDPOINTS.tickets.age, dateRange);
      setTicketAge(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch ticket age');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  const fetchTicketSLA = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(ENDPOINTS.tickets.sla, dateRange);
      setTicketSLA(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch ticket SLA');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  /**
   * Fetch all ticket analytics in parallel
   */
  const fetchAllTicketAnalytics = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        fetchEndpoint(ENDPOINTS.tickets.dashboard, dateRange),
        fetchEndpoint(ENDPOINTS.tickets.status, dateRange),
        fetchEndpoint(ENDPOINTS.tickets.priority, dateRange),
        fetchEndpoint(ENDPOINTS.tickets.age, dateRange),
        fetchEndpoint(ENDPOINTS.tickets.sla, dateRange),
      ]);
      
      const [dashboard, status, priority, age, sla] = results.map(r => 
        r.status === 'fulfilled' ? r.value : null
      );
      
      setTicketDashboard(dashboard);
      setTicketStatus(status);
      setTicketPriority(priority);
      setTicketAge(age);
      setTicketSLA(sla);
      
      return { dashboard, status, priority, age, sla };
    } catch (err) {
      setError('Failed to fetch ticket analytics');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  // ==================== WORKFLOW ANALYTICS ====================

  const fetchWorkflowMetrics = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(ENDPOINTS.workflows.metrics, dateRange);
      setWorkflowMetrics(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch workflow metrics');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  const fetchDepartmentAnalytics = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(ENDPOINTS.workflows.departments, dateRange);
      setDepartmentAnalytics(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch department analytics');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  const fetchStepPerformance = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(ENDPOINTS.workflows.steps, dateRange);
      setStepPerformance(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch step performance');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  /**
   * Fetch all workflow analytics in parallel
   */
  const fetchAllWorkflowAnalytics = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        fetchEndpoint(ENDPOINTS.workflows.metrics, dateRange),
        fetchEndpoint(ENDPOINTS.workflows.departments, dateRange),
        fetchEndpoint(ENDPOINTS.workflows.steps, dateRange),
      ]);
      
      const [metrics, departments, steps] = results.map(r => 
        r.status === 'fulfilled' ? r.value : null
      );
      
      setWorkflowMetrics(metrics);
      setDepartmentAnalytics(departments);
      setStepPerformance(steps);
      
      return { metrics, departments, steps };
    } catch (err) {
      setError('Failed to fetch workflow analytics');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  // ==================== TASK ITEM ANALYTICS ====================

  const fetchTaskStatus = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(ENDPOINTS.tasks.status, dateRange);
      setTaskStatus(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch task status');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  const fetchTaskOrigin = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(ENDPOINTS.tasks.origin, dateRange);
      setTaskOrigin(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch task origin');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  const fetchTaskPerformance = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(ENDPOINTS.tasks.performance, dateRange);
      setTaskPerformance(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch task performance');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  const fetchUserPerformance = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(ENDPOINTS.tasks.users, dateRange);
      setUserPerformance(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch user performance');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  const fetchTransferAnalytics = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(ENDPOINTS.tasks.transfers, dateRange);
      setTransferAnalytics(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch transfer analytics');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  /**
   * Fetch all task item analytics in parallel
   */
  const fetchAllTaskAnalytics = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        fetchEndpoint(ENDPOINTS.tasks.status, dateRange),
        fetchEndpoint(ENDPOINTS.tasks.origin, dateRange),
        fetchEndpoint(ENDPOINTS.tasks.performance, dateRange),
        fetchEndpoint(ENDPOINTS.tasks.users, dateRange),
        fetchEndpoint(ENDPOINTS.tasks.transfers, dateRange),
      ]);
      
      const [status, origin, performance, users, transfers] = results.map(r => 
        r.status === 'fulfilled' ? r.value : null
      );
      
      setTaskStatus(status);
      setTaskOrigin(origin);
      setTaskPerformance(performance);
      setUserPerformance(users);
      setTransferAnalytics(transfers);
      
      return { status, origin, performance, users, transfers };
    } catch (err) {
      setError('Failed to fetch task analytics');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  // ==================== TREND ANALYTICS ====================

  const fetchTicketTrends = useCallback(async (days = 30) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(ENDPOINTS.trends.tickets, null, { days });
      setTicketTrends(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch ticket trends');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  const fetchTaskItemTrends = useCallback(async (days = 30) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(ENDPOINTS.trends.taskItems, null, { days });
      setTaskItemTrends(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch task item trends');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  // ==================== CATEGORY ANALYTICS ====================

  const fetchTicketCategories = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(ENDPOINTS.categories.tickets, dateRange);
      setTicketCategories(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch ticket categories');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  // ==================== OPERATIONAL INSIGHTS ====================

  /**
   * Fetch comprehensive operational insights
   * Returns alerts, health score, and aggregated system analysis
   */
  const fetchOperationalInsights = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(ENDPOINTS.insights.overview, dateRange);
      setOperationalInsights(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch operational insights');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  /**
   * Fetch detailed workload analysis per agent
   */
  const fetchWorkloadAnalysis = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(ENDPOINTS.insights.workload, dateRange);
      setWorkloadAnalysis(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch workload analysis');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  /**
   * Fetch SLA risk report with at-risk and breached tickets
   */
  const fetchSlaRiskReport = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(ENDPOINTS.insights.slaRisk, dateRange);
      setSlaRiskReport(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch SLA risk report');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  /**
   * Fetch anomaly detection results
   */
  const fetchAnomalyDetection = useCallback(async (days = 7) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(ENDPOINTS.insights.anomalies, null, { days });
      setAnomalyDetection(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch anomaly detection');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  /**
   * Fetch service health summary
   */
  const fetchServiceHealth = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(ENDPOINTS.insights.health, dateRange);
      setServiceHealth(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch service health');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  /**
   * Fetch all operational insights in parallel
   */
  const fetchAllInsights = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        fetchEndpoint(ENDPOINTS.insights.overview, dateRange),
        fetchEndpoint(ENDPOINTS.insights.workload, dateRange),
        fetchEndpoint(ENDPOINTS.insights.slaRisk, dateRange),
        fetchEndpoint(ENDPOINTS.insights.anomalies, null, { days: 7 }),
        fetchEndpoint(ENDPOINTS.insights.health, dateRange),
      ]);
      
      const [overview, workload, slaRisk, anomalies, health] = results.map(r => 
        r.status === 'fulfilled' ? r.value : null
      );
      
      setOperationalInsights(overview);
      setWorkloadAnalysis(workload);
      setSlaRiskReport(slaRisk);
      setAnomalyDetection(anomalies);
      setServiceHealth(health);
      
      return { overview, workload, slaRisk, anomalies, health };
    } catch (err) {
      setError('Failed to fetch operational insights');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  // ==================== UNIFIED FETCH ALL ====================

  /**
   * Fetch all analytics in parallel (granular endpoints)
   * This replaces the legacy fetchAllAnalytics for new implementations
   */
  const fetchAllAnalytics = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const results = await Promise.allSettled([
        // Ticket analytics
        fetchEndpoint(ENDPOINTS.tickets.dashboard, dateRange),
        fetchEndpoint(ENDPOINTS.tickets.status, dateRange),
        fetchEndpoint(ENDPOINTS.tickets.priority, dateRange),
        fetchEndpoint(ENDPOINTS.tickets.age, dateRange),
        fetchEndpoint(ENDPOINTS.tickets.sla, dateRange),
        // Workflow analytics
        fetchEndpoint(ENDPOINTS.workflows.metrics, dateRange),
        fetchEndpoint(ENDPOINTS.workflows.departments, dateRange),
        fetchEndpoint(ENDPOINTS.workflows.steps, dateRange),
        // Task analytics
        fetchEndpoint(ENDPOINTS.tasks.status, dateRange),
        fetchEndpoint(ENDPOINTS.tasks.origin, dateRange),
        fetchEndpoint(ENDPOINTS.tasks.performance, dateRange),
        fetchEndpoint(ENDPOINTS.tasks.users, dateRange),
        fetchEndpoint(ENDPOINTS.tasks.transfers, dateRange),
        // Trends
        fetchEndpoint(ENDPOINTS.trends.tickets, null, { days: 30 }),
        fetchEndpoint(ENDPOINTS.trends.taskItems, null, { days: 30 }),
        // Categories
        fetchEndpoint(ENDPOINTS.categories.tickets, dateRange),
      ]);

      const extractData = (result) => result.status === 'fulfilled' ? result.value : null;

      // Set all state
      setTicketDashboard(extractData(results[0]));
      setTicketStatus(extractData(results[1]));
      setTicketPriority(extractData(results[2]));
      setTicketAge(extractData(results[3]));
      setTicketSLA(extractData(results[4]));
      setWorkflowMetrics(extractData(results[5]));
      setDepartmentAnalytics(extractData(results[6]));
      setStepPerformance(extractData(results[7]));
      setTaskStatus(extractData(results[8]));
      setTaskOrigin(extractData(results[9]));
      setTaskPerformance(extractData(results[10]));
      setUserPerformance(extractData(results[11]));
      setTransferAnalytics(extractData(results[12]));
      setTicketTrends(extractData(results[13]));
      setTaskItemTrends(extractData(results[14]));
      setTicketCategories(extractData(results[15]));

      // Build legacy-compatible ticketsReport for backward compatibility
      const legacyTicketsReport = {
        dashboard: extractData(results[0]),
        status_summary: extractData(results[1])?.status_summary || [],
        priority_distribution: extractData(results[2])?.priority_distribution || [],
        ticket_age: extractData(results[3])?.ticket_age || [],
        sla_compliance: extractData(results[4])?.sla_compliance || [],
      };
      setTicketsReport(legacyTicketsReport);

      // Build legacy-compatible workflowsReport
      const legacyWorkflowsReport = {
        workflow_metrics: extractData(results[5])?.workflow_metrics || [],
        department_analytics: extractData(results[6])?.department_analytics || [],
        step_performance: extractData(results[7])?.step_performance || [],
      };
      setWorkflowsReport(legacyWorkflowsReport);

      // Build legacy-compatible tasksReport
      const legacyTasksReport = {
        status_distribution: extractData(results[8])?.status_distribution || [],
        origin_distribution: extractData(results[9])?.origin_distribution || [],
        performance: extractData(results[10]) || {},
        user_performance: extractData(results[11])?.user_performance || [],
        transfer_analytics: extractData(results[12]) || {},
      };
      setTasksReport(legacyTasksReport);

      return {
        tickets: {
          dashboard: extractData(results[0]),
          status: extractData(results[1]),
          priority: extractData(results[2]),
          age: extractData(results[3]),
          sla: extractData(results[4]),
        },
        workflows: {
          metrics: extractData(results[5]),
          departments: extractData(results[6]),
          steps: extractData(results[7]),
        },
        tasks: {
          status: extractData(results[8]),
          origin: extractData(results[9]),
          performance: extractData(results[10]),
          users: extractData(results[11]),
          transfers: extractData(results[12]),
        },
        trends: {
          tickets: extractData(results[13]),
          taskItems: extractData(results[14]),
        },
        categories: {
          tickets: extractData(results[15]),
        },
        // Legacy format for backward compatibility
        ticketsReport: legacyTicketsReport,
        workflowsReport: legacyWorkflowsReport,
        tasksReport: legacyTasksReport,
        ticketTrends: extractData(results[13]),
        taskItemTrends: extractData(results[14]),
        ticketCategories: extractData(results[15]),
      };
    } catch (err) {
      setError('Failed to fetch analytics');
      console.error('Analytics fetch error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  // ==================== LEGACY METHODS (DEPRECATED) ====================

  /**
   * @deprecated Use fetchTicketDashboard + fetchTicketStatus + etc. instead
   */
  const fetchTicketsReport = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(ENDPOINTS.legacy.tickets, dateRange);
      setTicketsReport(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch tickets report');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  /**
   * @deprecated Use fetchWorkflowMetrics + fetchDepartmentAnalytics + etc. instead
   */
  const fetchWorkflowsReport = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(ENDPOINTS.legacy.workflows, dateRange);
      setWorkflowsReport(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch workflows report');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  /**
   * @deprecated Use fetchTaskStatus + fetchTaskOrigin + etc. instead
   */
  const fetchTasksReport = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndpoint(ENDPOINTS.legacy.tasks, dateRange);
      setTasksReport(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch tasks report');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  return {
    // Loading/Error State
    loading,
    error,
    
    // Ticket Analytics State (granular)
    ticketDashboard,
    ticketStatus,
    ticketPriority,
    ticketAge,
    ticketSLA,
    
    // Workflow Analytics State (granular)
    workflowMetrics,
    departmentAnalytics,
    stepPerformance,
    
    // Task Item Analytics State (granular)
    taskStatus,
    taskOrigin,
    taskPerformance,
    userPerformance,
    transferAnalytics,
    
    // Trend Analytics State
    ticketTrends,
    taskItemTrends,
    
    // Category Analytics State
    ticketCategories,
    
    // Operational Insights State
    operationalInsights,
    workloadAnalysis,
    slaRiskReport,
    anomalyDetection,
    serviceHealth,
    
    // Legacy State (for backward compatibility)
    ticketsReport,
    workflowsReport,
    tasksReport,
    
    // Ticket Analytics Methods (granular)
    fetchTicketDashboard,
    fetchTicketStatus,
    fetchTicketPriority,
    fetchTicketAge,
    fetchTicketSLA,
    fetchAllTicketAnalytics,
    
    // Workflow Analytics Methods (granular)
    fetchWorkflowMetrics,
    fetchDepartmentAnalytics,
    fetchStepPerformance,
    fetchAllWorkflowAnalytics,
    
    // Task Item Analytics Methods (granular)
    fetchTaskStatus,
    fetchTaskOrigin,
    fetchTaskPerformance,
    fetchUserPerformance,
    fetchTransferAnalytics,
    fetchAllTaskAnalytics,
    
    // Trend Analytics Methods
    fetchTicketTrends,
    fetchTaskItemTrends,
    
    // Category Analytics Methods
    fetchTicketCategories,
    
    // Operational Insights Methods
    fetchOperationalInsights,
    fetchWorkloadAnalysis,
    fetchSlaRiskReport,
    fetchAnomalyDetection,
    fetchServiceHealth,
    fetchAllInsights,
    
    // Unified Methods
    fetchAllAnalytics,
    
    // Legacy Methods (deprecated)
    fetchTicketsReport,
    fetchWorkflowsReport,
    fetchTasksReport,
  };
};

export default useReportingAnalytics;
