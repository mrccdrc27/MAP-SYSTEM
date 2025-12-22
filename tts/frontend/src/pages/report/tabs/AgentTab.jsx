import { useMemo } from "react";

// components
import ComponentSkeleton from "../../../components/skeleton/ComponentSkeleton";

// charts
import PieChart from "../../../components/charts/PieChart";
import BarChart from "../../../components/charts/BarChart";
import DoughnutChart from "../../../components/charts/DoughnutChart";
import ChartContainer from "../../../components/charts/ChartContainer";

// styles
import styles from "../report.module.css";

export default function AgentTab({ timeFilter, analyticsData = {}, loading, error }) {
  const ticketsReport = analyticsData || {};

  if (loading) {
    return (
      <div className={styles.tabContent}>
        <ComponentSkeleton className="report-skeleton">
          <div className={styles.skeletonContainer}>
            <div className={styles.skeletonHeader}>
              <div className={styles.skeletonTitle}>Loading Agent Analytics...</div>
              <div className={styles.skeletonSubtitle}>Fetching agent performance data</div>
            </div>
            <div className={styles.skeletonGrid}>
              <div className={styles.skeletonCard}>👨‍💼 Agent Performance</div>
              <div className={styles.skeletonCard}>⏱️ SLA Compliance</div>
              <div className={styles.skeletonCard}>📋 Task Distribution</div>
              <div className={styles.skeletonCard}>🎯 Resolution Rates</div>
            </div>
          </div>
        </ComponentSkeleton>
      </div>
    );
  }
  if (error)
    return <div style={{ color: "red", padding: "20px" }}>Error: {error}</div>;
  if (!ticketsReport.sla_compliance && !ticketsReport.dashboard)
    return <div style={{ padding: "20px" }}>No agent data available</div>;

  // Extract data from aggregated response
  const slaCompliance = ticketsReport.sla_compliance || [];
  const dashboard = ticketsReport.dashboard || {};
  const userPerf = ticketsReport.user_performance || [];
  const tasksReport = ticketsReport.task_performance || {};

  // SLA compliance is by priority
  const slaLabels = slaCompliance?.map((s) => s.priority) || [];
  const slaCompliances =
    slaCompliance?.map((s) => Math.round(s.compliance_rate || 0)) || [];
  const slaMetCounts = slaCompliance?.map((s) => s.sla_met) || [];
  const slaBreachedCounts = slaCompliance?.map((s) => s.sla_breached) || [];

  // User Performance data for assignment distribution
  const userLabels =
    userPerf?.map((u) => u.user_name || `User ${u.user_id}`) || [];
  const userResolutionRates =
    userPerf?.map((u) => Math.round(u.resolution_rate || 0)) || [];

  // Task Item Performance by User
  const taskUserPerf = tasksReport?.user_performance || [];
  const taskUserLabels =
    taskUserPerf?.map((u) => u.user_name || `User ${u.user_id}`) || [];
  const taskUserResolved = taskUserPerf?.map((u) => u.resolved || 0) || [];
  const taskUserBreached = taskUserPerf?.map((u) => u.breached || 0) || [];
  const taskUserEscalated = taskUserPerf?.map((u) => u.escalated || 0) || [];

  // Dashboard metrics for KPI
  const slaComplianceRate = dashboard?.sla_compliance_rate || 0;
  const totalUsers = dashboard?.total_users || 0;
  const escalationRate = dashboard?.escalation_rate || 0;

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

          <ChartContainer title="SLA Met vs Breached by Priority">
            <BarChart
              labels={slaLabels}
              dataPoints={slaMetCounts}
              chartTitle="Tasks Met SLA by Priority"
              chartLabel="Count"
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

          <ChartContainer title="User Resolution Rates">
            <PieChart
              labels={userLabels}
              dataPoints={userResolutionRates}
              chartTitle="User Resolution Rates"
              chartLabel="Resolution %"
            />
          </ChartContainer>
        </div>
      </div>

      {/* Per-User Task Item Performance */}
      {taskUserPerf.length > 0 && (
        <div className={styles.chartSection}>
          <h2>Per-User Task Item Performance</h2>
          <div className={styles.userPerformanceTable}>
            <table className={styles.performanceTable}>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Total</th>
                  <th style={{ color: '#7ed321' }}>Resolved</th>
                  <th style={{ color: '#e74c3c' }}>Escalated</th>
                  <th style={{ color: '#f5a623' }}>Breached</th>
                  <th>Resolution Rate</th>
                </tr>
              </thead>
              <tbody>
                {taskUserPerf.slice(0, 10).map((user, idx) => (
                  <tr key={idx}>
                    <td className={styles.userName}>{user.user_name || `User ${user.user_id}`}</td>
                    <td>{user.total_items || 0}</td>
                    <td>
                      <span className={styles.statBadge} style={{ backgroundColor: '#7ed32120', color: '#7ed321' }}>
                        {user.resolved || 0}
                      </span>
                    </td>
                    <td>
                      <span className={styles.statBadge} style={{ backgroundColor: '#e74c3c20', color: '#e74c3c' }}>
                        {user.escalated || 0}
                      </span>
                    </td>
                    <td>
                      <span className={styles.statBadge} style={{ backgroundColor: '#f5a62320', color: '#f5a623' }}>
                        {user.breached || 0}
                      </span>
                    </td>
                    <td>
                      <div className={styles.progressBarContainer}>
                        <div 
                          className={styles.progressBar} 
                          style={{ 
                            width: `${user.resolution_rate || 0}%`,
                            backgroundColor: (user.resolution_rate || 0) >= 80 ? '#7ed321' : (user.resolution_rate || 0) >= 50 ? '#f5a623' : '#e74c3c'
                          }}
                        />
                        <span className={styles.progressText}>{(user.resolution_rate || 0).toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
