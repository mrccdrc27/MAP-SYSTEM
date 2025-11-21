// charts
import PieChart from "../../../components/charts/PieChart";
import BarChart from "../../../components/charts/BarChart";
import DoughnutChart from "../../../components/charts/DoughnutChart";
import ChartContainer from "../../../components/charts/ChartContainer";

// icons
import { AlertTriangle, GitBranch, Clock, Users, TrendingUp } from "lucide-react";

// styles
import styles from "../report.module.css";

export default function TaskItemTab({
  timeFilter,
  analyticsData = {},
  loading,
  error,
}) {
  const tasksReport = analyticsData || {};

  if (loading) return <div style={{ padding: "20px" }}>Loading analytics...</div>;
  if (error) return <div style={{ color: "red", padding: "20px" }}>Error: {error}</div>;
  if (!tasksReport.status_distribution)
    return <div style={{ padding: "20px" }}>No task item data available</div>;

  // Extract data from aggregated response
  const summary = tasksReport.summary || {};
  const statusDist = tasksReport.status_distribution || [];
  const originDist = tasksReport.origin_distribution || [];
  const perf = tasksReport.performance || {};
  const userPerf = tasksReport.user_performance || [];
  const transfers = tasksReport.transfer_analytics || {};

  // Status distribution
  const statusLabels = statusDist.map((s) => s.status) || [];
  const statusCounts = statusDist.map((s) => s.count) || [];

  // Origin distribution
  const originLabels = originDist.map((o) => o.origin) || [];
  const originCounts = originDist.map((o) => o.count) || [];

  // Performance KPIs
  const timeToActionAvg = perf.time_to_action_hours?.average || 0;
  const slaCompliance = perf.sla_compliance?.compliance_rate || 0;
  const activeItems = perf.active_items || 0;
  const overdueItems = perf.overdue_items || 0;

  // User Performance
  const userLabels = userPerf.map((u) => u.user_name || `User ${u.user_id}`) || [];
  const userResolved = userPerf.map((u) => u.resolved) || [];
  const userBreached = userPerf.map((u) => u.breached) || [];
  const userEscalated = userPerf.map((u) => u.escalated) || [];

  // Transfer & Escalation
  const transferrers = transfers.top_transferrers || [];
  const transferrerLabels = transferrers.map((t) => t.role_user__user_full_name || `User ${t.role_user__user_id}`);
  const transferrerCounts = transferrers.map((t) => t.transfer_count);

  const escalationsByStep = transfers.escalations_by_step || [];
  const escalationStepLabels = escalationsByStep.map((e) =>
    e.assigned_on_step__name?.split(" - ")[1] || e.assigned_on_step__name || "Unknown"
  );
  const escalationCounts = escalationsByStep.map((e) => e.escalation_count);

  const kpiData = [
    {
      title: "Avg. Time to Action (hrs)",
      value: timeToActionAvg.toFixed(2),
      icon: <Clock size={28} color="#4a90e2" />,
    },
    {
      title: "SLA Compliance Rate (%)",
      value: slaCompliance.toFixed(1),
      icon: <TrendingUp size={28} color="#7ed321" />,
    },
    {
      title: "Active Items",
      value: activeItems,
      icon: <AlertTriangle size={28} color="#f5a623" />,
    },
    {
      title: "Overdue Items",
      value: overdueItems,
      icon: <AlertTriangle size={28} color="#e74c3c" />,
    },
    {
      title: "Total Transfers",
      value: transfers.total_transfers || 0,
      icon: <GitBranch size={28} color="#50e3c2" />,
    },
    {
      title: "Total Escalations",
      value: transfers.total_escalations || 0,
      icon: <TrendingUp size={28} color="#a850e3" />,
    },
  ];

  return (
    <div className={styles.rpTicketTabSection}>
      {/* KPI */}
      <div className={styles.chartSection}>
        <h2>Task Item KPI</h2>
        <div className={styles.kpiGrid}>
          {kpiData.map((card, index) => (
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

      {/* Task Item Status & Origin */}
      <div className={styles.chartsGrid}>
        <div className={styles.chartSection}>
          <h2>Task Item Status Distribution</h2>
          <div className={styles.chartRow}>
            <ChartContainer title="Task Item Status Breakdown">
              <PieChart
                labels={statusLabels}
                dataPoints={statusCounts}
                chartTitle="Task Item Status"
                chartLabel="Count"
              />
            </ChartContainer>

            <ChartContainer title="Assignment Origin Distribution">
              <DoughnutChart
                labels={originLabels}
                values={originCounts}
                chartTitle="Assignment Origin"
                chartLabel="Count"
              />
            </ChartContainer>
          </div>
        </div>
      </div>

      {/* User Performance */}
      <div className={styles.chartsGrid}>
        <div className={styles.chartSection}>
          <h2>Per-User Task Item Performance</h2>
          <div className={styles.chartRow}>
            <ChartContainer title="Resolved Items per User">
              <BarChart
                labels={userLabels}
                dataPoints={userResolved}
                chartTitle="Resolved Items"
                chartLabel="Count"
              />
            </ChartContainer>

            <ChartContainer title="Escalated Items per User">
              <BarChart
                labels={userLabels}
                dataPoints={userEscalated}
                chartTitle="Escalated Items"
                chartLabel="Count"
              />
            </ChartContainer>

            <ChartContainer title="Breached Items per User">
              <BarChart
                labels={userLabels}
                dataPoints={userBreached}
                chartTitle="Breached Items"
                chartLabel="Count"
              />
            </ChartContainer>
          </div>
        </div>
      </div>

      {/* Transfer & Escalation Analytics */}
      <div className={styles.chartsGrid}>
        <div className={styles.chartSection}>
          <h2>Transfer & Escalation Analytics</h2>
          <div className={styles.chartRow}>
            <ChartContainer title="Top Task Transferrers">
              <BarChart
                labels={transferrerLabels}
                dataPoints={transferrerCounts}
                chartTitle="Task Transfers"
                chartLabel="Count"
              />
            </ChartContainer>

            <ChartContainer title="Escalations by Step">
              <BarChart
                labels={escalationStepLabels}
                dataPoints={escalationCounts}
                chartTitle="Escalations"
                chartLabel="Count"
              />
            </ChartContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
