import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

// components
import AdminNav from "../../components/navigation/AdminNav";
import TimeFilter from "../../components/component/TimeFilter";
import ErrorBoundary from "../../components/ErrorBoundary";
import TicketTab from "./tabs/TicketTab";
import WorkflowTab from "./tabs/WorkflowTab";
import AgentTab from "./tabs/AgentTab";
import IntegrationTab from "./tabs/IntegrationTab";
import TaskItemTab from "./tabs/TaskItemTab";
import InsightsTab from "./tabs/InsightsTab";

// hooks
import useReportingAnalytics from "../../api/useReportingAnalytics";

// styles
import styles from "./report.module.css";

export default function Report() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || "taskitem";
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [timeFilter, setTimeFilter] = useState({ startDate: null, endDate: null });
  
  // Unified reporting analytics hook
  const {
    loading,
    error,
    ticketsReport,
    workflowsReport,
    tasksReport,
    ticketTrends,
    taskItemTrends,
    ticketCategories,
    fetchAllAnalytics,
  } = useReportingAnalytics();

  // Fetch all analytics on component mount
  useEffect(() => {
    fetchAllAnalytics();
  }, [fetchAllAnalytics]);

  // Sync activeTab with URL query parameters
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") || "taskitem";
    setActiveTab(tabFromUrl);
  }, [searchParams]);

  // Refetch analytics when time filter changes
  useEffect(() => {
    if (timeFilter.startDate || timeFilter.endDate) {
      // Convert dates to ISO format (YYYY-MM-DD)
      const dateRange = {
        start_date: timeFilter.startDate ? timeFilter.startDate.toISOString().split('T')[0] : null,
        end_date: timeFilter.endDate ? timeFilter.endDate.toISOString().split('T')[0] : null,
      };
      fetchAllAnalytics(dateRange);
    }
  }, [timeFilter, fetchAllAnalytics]);

  const handleTabClick = (e, tab) => {
    e.preventDefault();
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const renderActiveTab = () => {
    const agentData = {
      ...ticketsReport,
      task_performance: tasksReport,
    };

    switch (activeTab) {
      case "taskitem":
        return <TaskItemTab timeFilter={timeFilter} analyticsData={tasksReport} trendData={taskItemTrends} loading={loading} error={error} />;
      case "agent":
        return <AgentTab timeFilter={timeFilter} analyticsData={agentData} loading={loading} error={error} />;
      case "ticket":
        return <TicketTab timeFilter={timeFilter} analyticsData={ticketsReport} trendData={ticketTrends} categoryData={ticketCategories} loading={loading} error={error} />;
      case "workflow":
        return <WorkflowTab timeFilter={timeFilter} analyticsData={workflowsReport} loading={loading} error={error} />;
      case "integration":
        return <IntegrationTab analyticsData={ticketsReport} loading={loading} error={error} />;
      case "insights":
        return <InsightsTab timeFilter={timeFilter} />;
      default:
        return <TaskItemTab timeFilter={timeFilter} analyticsData={tasksReport} trendData={taskItemTrends} loading={loading} error={error} />;
    }
  };

  // Show loading or error at top level
  if (error) {
    return (
      <>
        <AdminNav />
        <main className={styles.reportPage}>
          <section className={styles.rpHeader}>
            <h1>Reporting and Analytics</h1>
          </section>
          <section className={styles.rpBody}>
            <div style={{ color: "red", padding: "20px" }}>Error: {error}</div>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <AdminNav />
      <main className={styles.reportPage}>
        <section className={styles.rpHeader}>
          <h1>Reporting and Analytics</h1>
        </section>

        <section className={styles.rpBody}>
          {/* Tabs */}
          <div className={styles.rpTabs}>
            {["taskitem", "agent", "ticket", "workflow", "insights", "integration"].map((tab) => {
              const tabLabels = {
                taskitem: "Tasks",
                agent: "Agent",
                ticket: "Ticket",
                workflow: "Workflow",
                insights: "Insights",
                integration: "Integration"
              };
              return (
                <a
                  key={tab}
                  href="#"
                  onClick={(e) => handleTabClick(e, tab)}
                  className={`${styles.rpTabLink} ${
                    activeTab === tab ? styles.active : ""
                  }`}
                >
                  {tabLabels[tab]}
                </a>
              );
            })}
          </div>

          {/* Time Filter */}
          <div className={styles.timeFilter}>
            <TimeFilter onFilterApply={setTimeFilter}/>
          </div>

          {/* Render Active Tab */}
          <ErrorBoundary>
            {renderActiveTab()}
          </ErrorBoundary>
        </section>
      </main>
    </>
  );
}