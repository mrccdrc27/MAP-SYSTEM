import { useMemo } from "react";

// components
import ComponentSkeleton from "../../../components/skeleton/ComponentSkeleton";

// charts
import PieChart from "../../../components/charts/PieChart";
import BarChart from "../../../components/charts/BarChart";
import DoughnutChart from "../../../components/charts/DoughnutChart";
import ChartContainer from "../../../components/charts/ChartContainer";

// icons
import { 
  Users, 
  ShieldCheck, 
  AlertTriangle, 
  UserCheck,
  Zap,
  Clock,
  ListChecks,
  User,
  Trophy,
  BarChart2,
  CheckCircle
} from "lucide-react";

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
              <div className={styles.skeletonCard}>
                <Users size={16} style={{ marginRight: '8px' }} />
                Agent Performance
              </div>
              <div className={styles.skeletonCard}>
                <ShieldCheck size={16} style={{ marginRight: '8px' }} />
                SLA Compliance
              </div>
              <div className={styles.skeletonCard}>
                <Zap size={16} style={{ marginRight: '8px' }} />
                Task Distribution
              </div>
              <div className={styles.skeletonCard}>
                <UserCheck size={16} style={{ marginRight: '8px' }} />
                Resolution Rates
              </div>
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
  const slaComplianceRate = Math.round(dashboard?.sla_compliance_rate || 0);
  const totalUsers = dashboard?.total_users || 0;
  const escalationRate = Math.round(dashboard?.escalation_rate || 0);

  return (
    <div className={styles.tabContent}>
      {/* KPI Section */}
      <div className={styles.chartSection} style={{ marginBottom: '24px' }}>
        <h2>Agent & SLA KPI</h2>
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div>
              <p>SLA Compliance</p>
              <h2>{slaComplianceRate}%</h2>
            </div>
            <div className={styles.kpiIcon}>
              <ShieldCheck size={28} color="#7ed321" />
            </div>
          </div>
          <div className={styles.kpiCard}>
            <div>
              <p>Total Agents</p>
              <h2>{totalUsers}</h2>
            </div>
            <div className={styles.kpiIcon}>
              <Users size={28} color="#4a90e2" />
            </div>
          </div>
          <div className={styles.kpiCard}>
            <div>
              <p>Escalation Rate</p>
              <h2>{escalationRate}%</h2>
            </div>
            <div className={styles.kpiIcon}>
              <AlertTriangle size={28} color="#f5a623" />
            </div>
          </div>
          <div className={styles.kpiCard}>
            <div>
              <p>Avg. Response</p>
              <h2>{"< 2h"}</h2>
            </div>
            <div className={styles.kpiIcon}>
              <Clock size={28} color="#50e3c2" />
            </div>
          </div>
        </div>
      </div>

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
    </div>

      {/* Per-User Task Item Performance */}
      {taskUserPerf.length > 0 && (
        <div className={styles.chartSection} style={{ marginTop: '24px' }}>
          <div className={styles.trendHeader}>
            <h2>
              <Trophy size={20} style={{ marginRight: '8px', color: '#f1c40f' }} />
              Per-User Task Item Performance
            </h2>
            <small style={{ color: 'var(--secondary-color)' }}>Showing top agents by activity</small>
          </div>
          <div className={styles.tableResponsive}>
            <table className={styles.performanceTable}>
              <thead>
                <tr>
                  <th><User size={14} style={{ marginRight: '6px' }} /> Agent</th>
                  <th className={styles.textCenter}><Zap size={14} style={{ marginRight: '6px' }} /> Total</th>
                  <th className={styles.textCenter}><CheckCircle size={14} style={{ marginRight: '6px' }} /> Resolved</th>
                  <th className={styles.textCenter}><AlertTriangle size={14} style={{ marginRight: '6px' }} /> Escalated</th>
                  <th className={styles.textCenter}><Clock size={14} style={{ marginRight: '6px' }} /> Breached</th>
                  <th className={styles.textCenter}><BarChart2 size={14} style={{ marginRight: '6px' }} /> Resolution Rate</th>
                </tr>
              </thead>
              <tbody>
                {taskUserPerf.slice(0, 10).map((user, idx) => {
                  const initials = (user.user_name || 'U')
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2);
                  
                  const resRate = Math.round(user.resolution_rate || 0);
                  let badgeStatusClass = styles.badgeSuccess;
                  if (resRate < 80) badgeStatusClass = styles.badgeWarning;
                  if (resRate < 50) badgeStatusClass = styles.badgeDanger;

                  return (
                    <tr key={idx}>
                      <td>
                        <div className={styles.userInfo}>
                          <div className={styles.userAvatar} style={{
                            backgroundColor: `hsl(${(idx * 137) % 360}, 70%, 85%)`,
                            color: `hsl(${(idx * 137) % 360}, 70%, 30%)`,
                            border: 'none'
                          }}>
                            {initials}
                          </div>
                          <span className={styles.userName}>{user.user_name || `User ${user.user_id}`}</span>
                        </div>
                      </td>
                      <td className={styles.textCenter}>
                        <span className={styles.statsBold}>{user.total_items || 0}</span>
                      </td>
                      <td className={styles.textCenter}>
                        <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                          {user.resolved || 0}
                        </span>
                      </td>
                      <td className={styles.textCenter}>
                        <span className={`${styles.badge} ${styles.badgeDanger}`}>
                          {user.escalated || 0}
                        </span>
                      </td>
                      <td className={styles.textCenter}>
                        <span className={`${styles.badge} ${styles.badgeWarning}`}>
                          {user.breached || 0}
                        </span>
                      </td>
                      <td>
                        <div className={styles.progressContainer}>
                          <div className={styles.progressStats}>
                            <span className={`${styles.badge} ${badgeStatusClass}`}>{resRate}%</span>
                          </div>
                          <div className={styles.progressBar}>
                            <div 
                              className={styles.progressFill} 
                              style={{ 
                                width: `${resRate}%`,
                                backgroundColor: resRate >= 80 ? '#2ecc71' : resRate >= 50 ? '#f1c40f' : '#e74c3c'
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
