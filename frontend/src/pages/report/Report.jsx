import { useState, useEffect } from "react";

// components
import AdminNav from "../../components/navigation/AdminNav";
import TimeFilter from "../../components/component/TimeFilter";
import ErrorBoundary from "../../components/ErrorBoundary";
import TicketTab from "./tabs/TicketTab";
import WorkflowTab from "./tabs/WorkflowTab";
import AgentTab from "./tabs/AgentTab";
import IntegrationTab from "./tabs/IntegrationTab";
import TaskItemTab from "./tabs/TaskItemTab";

// hooks
import useReportingAnalytics from "../../api/useReportingAnalytics";

// styles
import styles from "./report.module.css";

export default function Report() {
  const [activeTab, setActiveTab] = useState("ticket");
  const [timeFilter, setTimeFilter] = useState({ startDate: null, endDate: null });
  
  // Unified reporting analytics hook
  const {
    loading,
    error,
    ticketsReport,
    workflowsReport,
    tasksReport,
    fetchAllAnalytics,
  } = useReportingAnalytics();

  // Fetch all analytics on component mount
  useEffect(() => {
    fetchAllAnalytics();
  }, [fetchAllAnalytics]);

  const handleTabClick = (e, tab) => {
    e.preventDefault();
    setActiveTab(tab);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case "ticket":
        return <TicketTab timeFilter={timeFilter} analyticsData={ticketsReport} loading={loading} error={error} />;
      case "workflow":
        return <WorkflowTab timeFilter={timeFilter} analyticsData={workflowsReport} loading={loading} error={error} />;
      case "agent":
        return <AgentTab timeFilter={timeFilter} analyticsData={ticketsReport} loading={loading} error={error} />;
      case "taskitem":
        return <TaskItemTab timeFilter={timeFilter} analyticsData={tasksReport} loading={loading} error={error} />;
      case "integration":
        return <IntegrationTab analyticsData={ticketsReport} loading={loading} error={error} />;
      default:
        return <TicketTab timeFilter={timeFilter} analyticsData={ticketsReport} loading={loading} error={error} />;
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
            {["ticket", "workflow", "agent", "taskitem", "integration"].map((tab) => (
              <a
                key={tab}
                href="#"
                onClick={(e) => handleTabClick(e, tab)}
                className={`${styles.rpTabLink} ${
                  activeTab === tab ? styles.active : ""
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </a>
            ))}
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