import { useState } from "react";

// components
import AdminNav from "../../components/navigation/AdminNav";
import TimeFilter from "../../components/component/TimeFilter";
import ErrorBoundary from "../../components/ErrorBoundary";
import TicketTab from "./tabs/TicketTab";
import WorkflowTab from "./tabs/WorkflowTab";
import AgentTab from "./tabs/AgentTab";
import IntegrationTab from "./tabs/IntegrationTab";

// styles
import styles from "./report.module.css";

export default function Report() {
  const [activeTab, setActiveTab] = useState("ticket");
  const [timeFilter, setTimeFilter] = useState({ startDate: null, endDate: null });

  // Data will now be fetched in each tab via hooks

  const handleTabClick = (e, tab) => {
    e.preventDefault();
    setActiveTab(tab);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case "ticket":
        return <TicketTab timeFilter={timeFilter}/>;
      case "workflow":
        return <WorkflowTab timeFilter={timeFilter} />;
      case "agent":
        return <AgentTab timeFilter={timeFilter} />;
      case "integration":
        return <IntegrationTab />;
      default:
        return <TicketTab />;
    }
  };

  // Loading and error states will be handled in each tab

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
            {["ticket", "workflow", "agent", "integration"].map((tab) => (
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