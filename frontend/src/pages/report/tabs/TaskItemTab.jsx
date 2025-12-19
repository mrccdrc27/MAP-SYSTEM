// charts
import PieChart from "../../../components/charts/PieChart";
import BarChart from "../../../components/charts/BarChart";
import DoughnutChart from "../../../components/charts/DoughnutChart";
import LineChart from "../../../components/charts/LineChart";
import ChartContainer from "../../../components/charts/ChartContainer";

// components
import DrilldownModal, { DRILLDOWN_COLUMNS } from "../components/DrilldownModal";

// hooks
import useDrilldownAnalytics from "../../../api/useDrilldownAnalytics";

// icons
import { AlertTriangle, GitBranch, Clock, Users, TrendingUp, Activity, ArrowUpRight, CheckCircle } from "lucide-react";

// react
import { useState } from "react";

// styles
import styles from "../report.module.css";

export default function TaskItemTab({
  timeFilter,
  analyticsData = {},
  trendData = {},
  loading,
  error,
}) {
  const tasksReport = analyticsData || {};
  const taskItemTrends = trendData || {};

  // Drilldown state
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownTitle, setDrilldownTitle] = useState('');
  const [drilldownColumns, setDrilldownColumns] = useState([]);
  const [drilldownParams, setDrilldownParams] = useState({});
  const [drilldownType, setDrilldownType] = useState('');
  
  const {
    loading: drilldownLoading,
    drilldownData,
    drilldownTaskItemsByStatus,
    drilldownTaskItemsByOrigin,
    drilldownUserTasks,
    drilldownTransfers,
    clearDrilldownData,
  } = useDrilldownAnalytics();

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
  const slaCompliance =
    perf.sla_compliance?.summary?.current_compliance_rate_percent || 0;
  const activeItems = perf.active_items || 0;
  const overdueItems = perf.overdue_items || 0;

  // User Performance
  const userLabels =
    userPerf.map((u) => u.user_name || `User ${u.user_id}`) || [];
  const userResolved = userPerf.map((u) => u.resolved) || [];
  const userBreached = userPerf.map((u) => u.breached) || [];
  const userEscalated = userPerf.map((u) => u.escalated) || [];

  // Transfer & Escalation
  const transferrers = transfers.top_transferrers || [];
  const transferrerLabels = transferrers.map(
    (t) => t.role_user__user_full_name || `User ${t.role_user__user_id}`
  );
  const transferrerCounts = transferrers.map((t) => t.transfer_count);

  const escalationsByStep = transfers.escalations_by_step || [];
  const escalationStepLabels = escalationsByStep.map(
    (e) =>
      e.assigned_on_step__name?.split(" - ")[1] ||
      e.assigned_on_step__name ||
      "Unknown"
  );
  const escalationCounts = escalationsByStep.map((e) => e.escalation_count);

  // Drilldown handlers
  const handleStatusClick = async (status) => {
    setDrilldownTitle(`Task Items - ${status}`);
    setDrilldownColumns(DRILLDOWN_COLUMNS.taskItems);
    setDrilldownType('status');
    setDrilldownParams({ status });
    setDrilldownOpen(true);
    await drilldownTaskItemsByStatus({ 
      status, 
      start_date: timeFilter?.startDate?.toISOString()?.split('T')[0],
      end_date: timeFilter?.endDate?.toISOString()?.split('T')[0],
    });
  };

  const handleOriginClick = async (origin) => {
    setDrilldownTitle(`Task Items - ${origin}`);
    setDrilldownColumns(DRILLDOWN_COLUMNS.taskItems);
    setDrilldownType('origin');
    setDrilldownParams({ origin });
    setDrilldownOpen(true);
    await drilldownTaskItemsByOrigin({ 
      origin,
      start_date: timeFilter?.startDate?.toISOString()?.split('T')[0],
      end_date: timeFilter?.endDate?.toISOString()?.split('T')[0],
    });
  };

  const handleUserClick = async (userId, userName) => {
    setDrilldownTitle(`Tasks for ${userName}`);
    setDrilldownColumns(DRILLDOWN_COLUMNS.userTasks);
    setDrilldownType('user');
    setDrilldownParams({ user_id: userId });
    setDrilldownOpen(true);
    await drilldownUserTasks({ 
      user_id: userId,
      start_date: timeFilter?.startDate?.toISOString()?.split('T')[0],
      end_date: timeFilter?.endDate?.toISOString()?.split('T')[0],
    });
  };

  const handleTransferClick = async (origin = null) => {
    setDrilldownTitle(origin ? `${origin} Records` : 'Transfers & Escalations');
    setDrilldownColumns(DRILLDOWN_COLUMNS.transfers);
    setDrilldownType('transfer');
    setDrilldownParams({ origin });
    setDrilldownOpen(true);
    await drilldownTransfers({ 
      origin,
      start_date: timeFilter?.startDate?.toISOString()?.split('T')[0],
      end_date: timeFilter?.endDate?.toISOString()?.split('T')[0],
    });
  };

  const handleDrilldownPageChange = async (page) => {
    const params = { 
      ...drilldownParams, 
      page,
      start_date: timeFilter?.startDate?.toISOString()?.split('T')[0],
      end_date: timeFilter?.endDate?.toISOString()?.split('T')[0],
    };
    
    if (drilldownType === 'status') {
      await drilldownTaskItemsByStatus(params);
    } else if (drilldownType === 'origin') {
      await drilldownTaskItemsByOrigin(params);
    } else if (drilldownType === 'user') {
      await drilldownUserTasks(params);
    } else if (drilldownType === 'transfer') {
      await drilldownTransfers(params);
    }
  };

  const handleCloseDrilldown = () => {
    setDrilldownOpen(false);
    clearDrilldownData();
  };

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

  // Task Item Trend data
  const trendLabels = taskItemTrends?.trends?.map(t => t.date) || [];
  const trendDatasets = [
    {
      label: 'New',
      data: taskItemTrends?.trends?.map(t => t.new) || [],
      borderColor: '#4a90e2',
    },
    {
      label: 'In Progress',
      data: taskItemTrends?.trends?.map(t => t.in_progress) || [],
      borderColor: '#f5a623',
    },
    {
      label: 'Escalated',
      data: taskItemTrends?.trends?.map(t => t.escalated) || [],
      borderColor: '#e74c3c',
    },
    {
      label: 'Transferred',
      data: taskItemTrends?.trends?.map(t => t.transferred) || [],
      borderColor: '#50e3c2',
    },
    {
      label: 'Resolved',
      data: taskItemTrends?.trends?.map(t => t.resolved) || [],
      borderColor: '#7ed321',
    },
  ];

  return (
    <div className={styles.rpTicketTabSection}>
      {/* Drilldown Modal */}
      <DrilldownModal
        isOpen={drilldownOpen}
        onClose={handleCloseDrilldown}
        title={drilldownTitle}
        data={drilldownData}
        columns={drilldownColumns}
        onPageChange={handleDrilldownPageChange}
        loading={drilldownLoading}
      />
      
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
        {/* Task Item Trend Section */}
        <div className={styles.chartSection}>
          <h2>Task Item Trends (Last 30 Days)</h2>
          <div className={styles.chartRow}>
            <ChartContainer title="Task Item Status Trends Over Time">
              <LineChart
                labels={trendLabels}
                dataPoints={trendDatasets}
                chartTitle="Task Item Status Trends"
                chartLabel="Count"
              />
            </ChartContainer>
          </div>
          {taskItemTrends?.summary && (
            <div className={styles.kpiGrid} style={{ marginTop: '1rem' }}>
              <div className={styles.kpiCard}>
                <div>
                  <p>New (30 days)</p>
                  <h2>{taskItemTrends.summary.new || 0}</h2>
                </div>
                <div>
                  <span className={styles.kpiIcon}><Activity size={28} color="#4a90e2" /></span>
                </div>
              </div>
              <div className={styles.kpiCard}>
                <div>
                  <p>In Progress (30 days)</p>
                  <h2>{taskItemTrends.summary.in_progress || 0}</h2>
                </div>
                <div>
                  <span className={styles.kpiIcon}><Clock size={28} color="#f5a623" /></span>
                </div>
              </div>
              <div className={styles.kpiCard}>
                <div>
                  <p>Escalated (30 days)</p>
                  <h2>{taskItemTrends.summary.escalated || 0}</h2>
                </div>
                <div>
                  <span className={styles.kpiIcon}><ArrowUpRight size={28} color="#e74c3c" /></span>
                </div>
              </div>
              <div className={styles.kpiCard}>
                <div>
                  <p>Transferred (30 days)</p>
                  <h2>{taskItemTrends.summary.transferred || 0}</h2>
                </div>
                <div>
                  <span className={styles.kpiIcon}><GitBranch size={28} color="#50e3c2" /></span>
                </div>
              </div>
              <div className={styles.kpiCard}>
                <div>
                  <p>Resolved (30 days)</p>
                  <h2>{taskItemTrends.summary.resolved || 0}</h2>
                </div>
                <div>
                  <span className={styles.kpiIcon}><CheckCircle size={28} color="#7ed321" /></span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.chartSection}>
          <h2>Task Item Status Distribution <span className={styles.clickHint}>(click to drill down)</span></h2>
          <div className={styles.chartRow}>
            <ChartContainer title="Task Item Status Breakdown">
              <PieChart
                labels={statusLabels}
                dataPoints={statusCounts}
                chartTitle="Task Item Status"
                chartLabel="Count"
                onClick={({ label }) => handleStatusClick(label)}
              />
            </ChartContainer>

            <ChartContainer title="Assignment Origin Distribution">
              <DoughnutChart
                labels={originLabels}
                values={originCounts}
                chartTitle="Assignment Origin"
                chartLabel="Count"
                onClick={({ label }) => handleOriginClick(label)}
              />
            </ChartContainer>
          </div>
        </div>
      </div>

      {/* Transfer & Escalation Analytics */}
      <div className={styles.chartsGrid}>
        <div className={styles.chartSection}>
          <h2>Transfer & Escalation Analytics <span className={styles.clickHint}>(click to drill down)</span></h2>
          <div className={styles.chartRow}>
            <ChartContainer title="Top Task Transferrers">
              <BarChart
                labels={transferrerLabels}
                dataPoints={transferrerCounts}
                chartTitle="Task Transfers"
                chartLabel="Count"
                onClick={() => handleTransferClick('Transferred')}
              />
            </ChartContainer>

            <ChartContainer title="Escalations by Step">
              <BarChart
                labels={escalationStepLabels}
                dataPoints={escalationCounts}
                chartTitle="Escalations"
                chartLabel="Count"
                onClick={() => handleTransferClick('Escalation')}
              />
            </ChartContainer>
          </div>
        </div>
      </div>

      {/* User Performance Section */}
      {userPerf.length > 0 && (
        <div className={styles.chartsGrid}>
          <div className={styles.chartSection}>
            <h2>User Performance Overview</h2>
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
                  {userPerf.slice(0, 10).map((user, idx) => (
                    <tr key={idx} onClick={() => handleUserClick(user.user_id, user.user_name)}>
                      <td className={styles.userName}>{user.user_name || `User ${user.user_id}`}</td>
                      <td>{user.total_items}</td>
                      <td>
                        <span className={styles.statBadge} style={{ backgroundColor: '#7ed32120', color: '#7ed321' }}>
                          {user.resolved}
                        </span>
                      </td>
                      <td>
                        <span className={styles.statBadge} style={{ backgroundColor: '#e74c3c20', color: '#e74c3c' }}>
                          {user.escalated}
                        </span>
                      </td>
                      <td>
                        <span className={styles.statBadge} style={{ backgroundColor: '#f5a62320', color: '#f5a623' }}>
                          {user.breached}
                        </span>
                      </td>
                      <td>
                        <div className={styles.progressBarContainer}>
                          <div 
                            className={styles.progressBar} 
                            style={{ 
                              width: `${user.resolution_rate || 0}%`,
                              backgroundColor: user.resolution_rate >= 80 ? '#7ed321' : user.resolution_rate >= 50 ? '#f5a623' : '#e74c3c'
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
        </div>
      )}
    </div>
  );
}
