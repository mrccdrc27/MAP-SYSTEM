import { useMemo } from "react";

// charts
import PieChart from "../../../components/charts/PieChart";
import BarChart from "../../../components/charts/BarChart";
import DoughnutChart from "../../../components/charts/DoughnutChart";
import ChartContainer from "../../../components/charts/ChartContainer";

// styles
import styles from "../report.module.css";

export default function AgentTab({ timeFilter, analyticsData = {}, loading, error }) {
  const ticketsReport = analyticsData || {};

  if (loading) return <div style={{ padding: "20px" }}>Loading analytics...</div>;
  if (error) return <div style={{ color: "red", padding: "20px" }}>Error: {error}</div>;
  if (!ticketsReport.sla_compliance && !ticketsReport.dashboard)
    return <div style={{ padding: "20px" }}>No agent data available</div>;

  // Extract data from aggregated response
  const slaCompliance = ticketsReport.sla_compliance || [];
  const dashboard = ticketsReport.dashboard || {};

  // SLA compliance is by priority
  const slaLabels = slaCompliance?.map(s => s.priority) || [];
  const slaCompliances = slaCompliance?.map(s => Math.round(s.compliance_rate || 0)) || [];
  const slaMetCounts = slaCompliance?.map(s => s.sla_met) || [];
  const slaBreachedCounts = slaCompliance?.map(s => s.sla_breached) || [];

  // Dashboard metrics for KPI
  const slaComplianceRate = dashboard?.sla_compliance_rate || 0;
  const totalUsers = dashboard?.total_users || 0;
  const escalationRate = dashboard?.escalation_rate || 0;
  const avgResolutionTime = dashboard?.avg_resolution_time_hours || 0;

  return (
    <div className={styles.chartsGrid}>
      {/* Agent Performance */}
      <div className={styles.chartSection}>
        <h2>Agent & SLA Performance</h2>
        <div className={styles.chartRow}>
          <ChartContainer title="SLA Compliance by Priority">
            <DoughnutChart
              labels={slaLabels}
              values={slaCompliances}
              chartTitle="SLA Compliance Rate (%)"
              chartLabel="Compliance %"
            />
          </ChartContainer>

          <ChartContainer title="SLA Met vs Breached">
            <BarChart
              labels={slaLabels}
              dataPoints={teamAvgTime}
              chartTitle="Avg Response Time (mins)"
              chartLabel="Minutes"
            />
          </ChartContainer>
        </div>
      </div>

      {/* SLA & Assignment Insights */}
      <div className={styles.chartSection}>
        <h2>SLA & Assignment Insights</h2>
        <div className={styles.chartRow}>
          <ChartContainer title="SLA Compliance by Priority">
            <BarChart
              labels={slaLabels}
              dataPoints={slaCompliances}
              chartTitle="SLA Compliance (%)"
              chartLabel="Percentage"
            />
          </ChartContainer>

          <ChartContainer title="Assignment Distribution by Role">
            <PieChart
              labels={assignmentLabels}
              dataPoints={assignmentCounts}
              chartTitle="Assignment Distribution"
              chartLabel="Assignments"
            />
          </ChartContainer>
        </div>
      </div>
    </div>
  );
}
