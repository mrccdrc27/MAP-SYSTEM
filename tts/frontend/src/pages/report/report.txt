import { useState, useEffect } from "react";

// components
import AdminNav from "../../components/navigation/AdminNav";
import PieChart from "../../components/charts/PieChart";
import BarChart from "../../components/charts/BarChart";
import LineChart from "../../components/charts/LineChart";
import DoughnutChart from "../../components/charts/DoughnutChart";
import ChartContainer from "../../components/charts/ChartContainer";
import TimeFilter from "../../components/component/TimeFilter";
import IntegrationStatusCard from "./components/IntegrationStatusCard";

// table
import TicketTable from "../../tables/admin/TicketTable";
import DynamicTable from "../../tables/components/DynamicTable";

// styles
import styles from "./report.module.css";
import general from "../../style/general.module.css";

// lucide icons
import {
  Ticket,
  FolderOpen,
  CheckCircle,
  Clock,
  HardDrive,
} from "lucide-react";

export default function Report() {
  // State for report data
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("ticket");

  useEffect(() => {
    fetch("/src/pages/report/reportData.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load data");
        return res.json();
      })
      .then((data) => {
        setReportData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleTabClick = (e, tab) => {
    e.preventDefault();
    setActiveTab(tab);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!reportData) return <div>No data available.</div>;

  // KPI Cards
  const kpiCardData = [
    {
      title: "Total Tickets",
      value: reportData.kpi.totalTickets,
      icon: <Ticket size={28} color="#4a90e2" />,
    },
    {
      title: "Open Tickets",
      value: reportData.kpi.openTickets,
      icon: <FolderOpen size={28} color="#f5a623" />,
    },
    {
      title: "Closed Tickets",
      value: reportData.kpi.closedTickets,
      icon: <CheckCircle size={28} color="#7ed321" />,
    },
    {
      title: "Avg. Resolution Time",
      value: reportData.kpi.avgResolutionTime,
      icon: <Clock size={28} color="#50e3c2" />,
    },
    {
      title: "Storage Used",
      value: reportData.kpi.storageUsed,
      icon: <HardDrive size={28} color="#a850e3ff" />,
    },
  ];

  return (
    <>
      <AdminNav />
      <main className={styles.reportPage}>
        <section className={styles.rpHeader}>
          <h1>Reporting and Analytics</h1>
          {/* <p>View and analyze ticket data</p> */}
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
            <TimeFilter />
          </div>

          {activeTab === "ticket" && (
            <div className={styles.rpTicketTabSection}>
              {/* KPI */}
              <div className={styles.chartSection}>
                <h2>Ticket KPI</h2>
                <div className={styles.kpiGrid}>
                  {kpiCardData.map((card, index) => (
                    <div key={index} className={styles.kpiCard}>
                      <div>
                        <p>{card.title}</p>
                        <h2>{card.value}</h2>
                      </div>
                      <div>
                        <span className={styles.kpiIcon}>{card.icon}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* chartsGrid - Ticket*/}
              <div className={styles.chartsGrid}>
                {/* Ticket Analytics Section */}
                <div className={styles.chartSection}>
                  <h2>Ticket Analytics</h2>
                  <div className={styles.chartRow}>
                    <ChartContainer title="Tickets by Status">
                      <PieChart
                        labels={["Open", "Closed", "Pending"]}
                        dataPoints={[
                          reportData.kpi.openTickets,
                          reportData.kpi.closedTickets,
                          reportData.kpi.pendingTickets,
                        ]}
                        chartTitle="Tickets by Status"
                        chartLabel="Status"
                      />
                    </ChartContainer>
                    <ChartContainer title="Tickets by Priority">
                      <PieChart
                        labels={["High", "Medium", "Low"]}
                        dataPoints={[
                          reportData.tickets.filter(
                            (t) => t.priority === "High"
                          ).length,
                          reportData.tickets.filter(
                            (t) => t.priority === "Medium"
                          ).length,
                          reportData.tickets.filter((t) => t.priority === "Low")
                            .length,
                        ]}
                        chartTitle="Tickets by Priority"
                        chartLabel="Priority"
                      />
                    </ChartContainer>
                    <ChartContainer title="Tickets by Category">
                      <BarChart
                        labels={[
                          ...new Set(reportData.tickets.map((t) => t.category)),
                        ]}
                        dataPoints={[
                          ...new Set(reportData.tickets.map((t) => t.category)),
                        ].map(
                          (cat) =>
                            reportData.tickets.filter((t) => t.category === cat)
                              .length
                        )}
                        chartTitle="Tickets by Category"
                        chartLabel="Category"
                      />
                    </ChartContainer>
                  </div>
                </div>

                {/* Time-Based Metrics */}
                <div className={styles.chartSection}>
                  <h2>Time-Based Metrics</h2>
                  <div className={styles.chartRow}>
                    <ChartContainer title="Tickets Over Time">
                      <LineChart
                        labels={reportData.tickets.map((t) =>
                          t.created_at.slice(0, 10)
                        )}
                        dataPoints={reportData.tickets.map((_, idx) => idx + 1)}
                        chartTitle="Tickets Over Time"
                        chartLabel="Tickets"
                      />
                    </ChartContainer>
                    <ChartContainer title="Resolution Time Trends">
                      <BarChart
                        labels={reportData.tickets
                          .filter((t) => t.resolved_at)
                          .map((t) => t.created_at.slice(0, 10))}
                        dataPoints={reportData.tickets
                          .filter((t) => t.resolved_at)
                          .map((t, idx) => idx + 1)}
                        chartTitle="Resolution Time Trends"
                        chartLabel="Resolved"
                      />
                    </ChartContainer>
                  </div>
                </div>
                {/* Archive & Trends */}
                <div className={styles.chartSection}>
                  <h2>Archive & Trends</h2>
                  <div className={styles.chartRow}>
                    <ChartContainer title="Archived Tickets Overview">
                      <PieChart
                        labels={["Archived", "Active"]}
                        dataPoints={[0, reportData.kpi.totalTickets]}
                        chartTitle="Archived Tickets Overview"
                        chartLabel="Archive"
                      />
                    </ChartContainer>
                    <ChartContainer title="Volume Trends">
                      <LineChart
                        labels={reportData.tickets.map((t) =>
                          t.created_at.slice(0, 10)
                        )}
                        dataPoints={reportData.tickets.map((_, idx) => idx + 1)}
                        chartTitle="Volume Trends"
                        chartLabel="Tickets"
                      />
                    </ChartContainer>
                  </div>
                </div>
              </div>

              {/* Table Section */}
              <div className={styles.rpSection}>
                <div className={styles.rpTableSection}>
                  <div className={general.tpTable}>
                    <TicketTable tickets={reportData.tickets} error={error} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* chartsGrid - Workflow */}
          {activeTab === "workflow" && (
            <div className={styles.chartsGrid}>
              {/* Workflow Analytics */}
              <div className={styles.chartSection}>
                <h2>Workflow Analytics</h2>
                <div className={styles.chartRow}>
                  <ChartContainer title="Workflow Usage">
                    <BarChart
                      labels={reportData.workflows.map((w) => w.name)}
                      dataPoints={reportData.workflows.map((w) => w.usage)}
                      chartTitle="Workflow Usage"
                      chartLabel="Usage"
                    />
                  </ChartContainer>
                  <ChartContainer title="Workflow Completion Rates">
                    <BarChart
                      labels={reportData.workflows.map((w) => w.name)}
                      dataPoints={reportData.workflows.map(
                        (w) => w.completionRate * 100
                      )}
                      chartTitle="Workflow Completion Rates (%)"
                      chartLabel="Completion Rate"
                    />
                  </ChartContainer>
                  <ChartContainer title="Average Time per Workflow Step">
                    <LineChart
                      labels={reportData.workflows.map((w) => w.name)}
                      dataPoints={reportData.workflows.map((w) =>
                        parseFloat(w.avgStepTime)
                      )}
                      chartTitle="Average Step Time (h)"
                      chartLabel="Avg Step Time"
                    />
                  </ChartContainer>
                </div>
              </div>
            </div>
          )}

          {/* chartsGrid - Agent*/}
          {activeTab === "agent" && (
            <div className={styles.chartsGrid}>
              {/* Agent Performance */}
              <div className={styles.chartSection}>
                <h2>Agent Performance</h2>
                <div className={styles.chartRow}>
                  <ChartContainer title="Tickets Handled per Agent">
                    <DoughnutChart
                      labels={reportData.agents.map((a) => a.name)}
                      values={reportData.agents.map((a) => a.ticketsHandled)}
                      chartTitle="Tickets Handled per Agent"
                      chartLabel="Tickets"
                    />
                  </ChartContainer>
                  <ChartContainer title="Average Response Time by Agent">
                    <BarChart
                      labels={reportData.agents.map((a) => a.name)}
                      dataPoints={reportData.agents.map((a) =>
                        parseFloat(a.avgResponseTime.replace(/[^\d.]/g, ""))
                      )}
                      chartTitle="Avg Response Time (h)"
                      chartLabel="Response Time"
                    />
                  </ChartContainer>
                </div>
              </div>

              {/* User & Department Insights */}
              <div className={styles.chartSection}>
                <h2>User & Department Insights</h2>
                <div className={styles.chartRow}>
                  <ChartContainer title="Tickets by Department">
                    <PieChart
                      labels={[
                        ...new Set(reportData.agents.map((a) => a.department)),
                      ]}
                      dataPoints={[
                        ...new Set(reportData.agents.map((a) => a.department)),
                      ].map((dep) =>
                        reportData.agents
                          .filter((a) => a.department === dep)
                          .reduce((sum, a) => sum + a.ticketsHandled, 0)
                      )}
                      chartTitle="Tickets by Department"
                      chartLabel="Department"
                    />
                  </ChartContainer>
                  <ChartContainer title="Top Recurring Issues">
                    <LineChart
                      labels={[
                        ...new Set(reportData.tickets.map((t) => t.category)),
                      ]}
                      dataPoints={[
                        ...new Set(reportData.tickets.map((t) => t.category)),
                      ].map(
                        (cat) =>
                          reportData.tickets.filter((t) => t.category === cat)
                            .length
                      )}
                      chartTitle="Top Recurring Issues"
                      chartLabel="Issues"
                    />
                  </ChartContainer>
                </div>
              </div>
            </div>
          )}

          {/* Integration */}
          {activeTab === "integration" && (
            <div className={styles.chartsGrid}>
              <div className={styles.chartSection}>
                <h2>Integration Status</h2>
                <div className={styles.chartRow}>
                  <IntegrationStatusCard />
                </div>
              </div>
              <div className={styles.chartSection}>
                <h2>Integration Metrics</h2>
                <div className={styles.chartRow}>
                  <ChartContainer title="Status of Integrations">
                    <PieChart
                      labels={reportData.integrations.map((i) => i.name)}
                      dataPoints={reportData.integrations.map((i) =>
                        i.status === "Active" ? 1 : 0
                      )}
                      chartTitle="Status of Integrations"
                      chartLabel="Active"
                    />
                  </ChartContainer>
                  <ChartContainer title="Response Times by Integration">
                    <LineChart
                      labels={reportData.integrations.map((i) => i.name)}
                      dataPoints={reportData.integrations.map(
                        (i) =>
                          parseFloat(i.responseTime.replace(/[^\d.]/g, "")) || 0
                      )}
                      chartTitle="Response Times (ms)"
                      chartLabel="Response Time"
                    />
                  </ChartContainer>
                  <ChartContainer title="Error Rates by Integration">
                    <BarChart
                      labels={reportData.integrations.map((i) => i.name)}
                      dataPoints={reportData.integrations.map(
                        (i) => i.errorRate * 100
                      )}
                      chartTitle="Error Rates (%)"
                      chartLabel="Error Rate"
                    />
                  </ChartContainer>
                </div>
              </div>
              <div className={styles.chartRow}>
                <div className={styles.chartSection}>
                  <h2>API Logs</h2>
                  <DynamicTable />
                </div>
                <div className={styles.chartSection}>
                  <h2>Integration Logs</h2>
                  <DynamicTable />
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
