import { useMemo } from "react";

// charts
import PieChart from "../../../components/charts/PieChart";
import BarChart from "../../../components/charts/BarChart";
import DoughnutChart from "../../../components/charts/DoughnutChart";
import ChartContainer from "../../../components/charts/ChartContainer";

// styles
import styles from "../report.module.css";

export default function AgentTab({
  displayStyle = "charts",
  timeFilter,
  analyticsData = {},
  loading,
  error,
}) {
  const ticketsReport = analyticsData || {};

  if (loading)
    return <div style={{ padding: "20px" }}>Loading analytics...</div>;
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

  // Render different views based on displayStyle
  if (displayStyle === "list") {
    return (
      <div className={styles.rpTicketTabSection}>
        {/* KPI as List */}
        <div className={styles.chartSection}>
          <h2>Agent Performance KPI</h2>
          <div className={styles.listView}>
            <div className={styles.listItem}>
              <span className={styles.listLabel}>SLA Compliance Rate</span>
              <span className={styles.listValue}>
                {Math.round(slaComplianceRate)}%
              </span>
            </div>
            <div className={styles.listItem}>
              <span className={styles.listLabel}>Total Users</span>
              <span className={styles.listValue}>{totalUsers}</span>
            </div>
            <div className={styles.listItem}>
              <span className={styles.listLabel}>Escalation Rate</span>
              <span className={styles.listValue}>
                {Math.round(escalationRate)}%
              </span>
            </div>
          </div>
        </div>

        {/* SLA Compliance as List */}
        <div className={styles.chartSection}>
          <h2>SLA Compliance by Priority</h2>
          <div className={styles.listView}>
            {slaLabels.map((label, idx) => (
              <div key={idx} className={styles.analyticsSection}>
                <h3>{label}</h3>
                <div className={styles.listItem}>
                  <span className={styles.listLabel}>Compliance Rate</span>
                  <span className={styles.listValue}>
                    {slaCompliances[idx]}%
                  </span>
                </div>
                <div className={styles.listItem}>
                  <span className={styles.listLabel}>Met</span>
                  <span className={styles.listValue}>{slaMetCounts[idx]}</span>
                </div>
                <div className={styles.listItem}>
                  <span className={styles.listLabel}>Breached</span>
                  <span className={styles.listValue}>
                    {slaBreachedCounts[idx]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Performance as List */}
        <div className={styles.chartSection}>
          <h2>User Resolution Rates</h2>
          <div className={styles.listView}>
            {userLabels.map((label, idx) => (
              <div key={idx} className={styles.listItem}>
                <span className={styles.listLabel}>{label}</span>
                <span className={styles.listValue}>
                  {userResolutionRates[idx]}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Per-User Task Item Performance as List */}
        {taskUserLabels.length > 0 && (
          <div className={styles.chartSection}>
            <h2>Per-User Task Item Performance</h2>
            <div className={styles.listView}>
              {taskUserLabels.map((label, idx) => (
                <div key={idx} className={styles.analyticsSection}>
                  <h3>{label}</h3>
                  <div className={styles.listItem}>
                    <span className={styles.listLabel}>Resolved</span>
                    <span className={styles.listValue}>
                      {taskUserResolved[idx]}
                    </span>
                  </div>
                  <div className={styles.listItem}>
                    <span className={styles.listLabel}>Escalated</span>
                    <span className={styles.listValue}>
                      {taskUserEscalated[idx]}
                    </span>
                  </div>
                  <div className={styles.listItem}>
                    <span className={styles.listLabel}>Breached</span>
                    <span className={styles.listValue}>
                      {taskUserBreached[idx]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (displayStyle === "grid") {
    return (
      <div className={styles.rpTicketTabSection}>
        {/* KPI as Grid Table */}
        <div className={styles.chartSection}>
          <h2>Agent Performance KPI</h2>
          <div className={styles.gridTable}>
            <div className={styles.gridHeader}>
              <div>Metric</div>
              <div>Value</div>
            </div>
            <div className={styles.gridRow}>
              <div>SLA Compliance Rate</div>
              <div>{Math.round(slaComplianceRate)}%</div>
            </div>
            <div className={styles.gridRow}>
              <div>Total Users</div>
              <div>{totalUsers}</div>
            </div>
            <div className={styles.gridRow}>
              <div>Escalation Rate</div>
              <div>{Math.round(escalationRate)}%</div>
            </div>
          </div>
        </div>

        {/* SLA Compliance as Grid Table */}
        <div className={styles.chartSection}>
          <h2>SLA Compliance Details</h2>
          <div className={styles.gridTable}>
            <div className={styles.gridHeader}>
              <div>Priority</div>
              <div>Compliance %</div>
              <div>Met</div>
              <div>Breached</div>
            </div>
            {slaLabels.map((label, idx) => (
              <div key={idx} className={styles.gridRow}>
                <div>{label}</div>
                <div>{slaCompliances[idx]}%</div>
                <div>{slaMetCounts[idx]}</div>
                <div>{slaBreachedCounts[idx]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* User Performance as Grid Table */}
        <div className={styles.chartSection}>
          <h2>User Resolution Rates</h2>
          <div className={styles.gridTable}>
            <div className={styles.gridHeader}>
              <div>User</div>
              <div>Resolution Rate %</div>
            </div>
            {userLabels.map((label, idx) => (
              <div key={idx} className={styles.gridRow}>
                <div>{label}</div>
                <div>{userResolutionRates[idx]}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Per-User Task Item Performance as Grid Table */}
        {taskUserLabels.length > 0 && (
          <div className={styles.chartSection}>
            <h2>Per-User Task Item Performance</h2>
            <div className={styles.gridTable}>
              <div className={styles.gridHeader}>
                <div>User</div>
                <div>Resolved</div>
                <div>Escalated</div>
                <div>Breached</div>
              </div>
              {taskUserLabels.map((label, idx) => (
                <div key={idx} className={styles.gridRow}>
                  <div>{label}</div>
                  <div>{taskUserResolved[idx]}</div>
                  <div>{taskUserEscalated[idx]}</div>
                  <div>{taskUserBreached[idx]}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

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
      {taskUserLabels.length > 0 && (
        <div className={styles.chartSection}>
          <h2>Per-User Task Item Performance</h2>
          <div className={styles.chartRow}>
            <ChartContainer title="Resolved Items per User">
              <BarChart
                labels={taskUserLabels}
                dataPoints={taskUserResolved}
                chartTitle="Resolved Items"
                chartLabel="Count"
              />
            </ChartContainer>

            <ChartContainer title="Escalated Items per User">
              <BarChart
                labels={taskUserLabels}
                dataPoints={taskUserEscalated}
                chartTitle="Escalated Items"
                chartLabel="Count"
              />
            </ChartContainer>

            <ChartContainer title="Breached Items per User">
              <BarChart
                labels={taskUserLabels}
                dataPoints={taskUserBreached}
                chartTitle="Breached Items"
                chartLabel="Count"
              />
            </ChartContainer>
          </div>
        </div>
      )}
    </div>
  );
}
