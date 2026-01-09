// charts
import PieChart from "../../../components/charts/PieChart";
import BarChart from "../../../components/charts/BarChart";
import LineChart from "../../../components/charts/LineChart";
import DoughnutChart from "../../../components/charts/DoughnutChart";
import ChartContainer from "../../../components/charts/ChartContainer";

// components
import DrilldownModal, { DRILLDOWN_COLUMNS } from "../components/DrilldownModal";

// hooks
import useDrilldownAnalytics from "../../../api/useDrilldownAnalytics";

// icons
import {
  Ticket,
  FolderOpen,
  CheckCircle,
  Clock,
  HardDrive,
  TrendingUp,
} from "lucide-react";

// react
import { useState } from "react";

// styles
import styles from "../report.module.css";

export default function TicketTab({ timeFilter, analyticsData = {}, trendData = {}, fetchTrendData, categoryData = {}, loading, error }) {
  const ticketsReport = analyticsData || {};
  const ticketTrends = trendData || {};
  const categoryAnalytics = categoryData || {};
  
  // Trend filter state
  const [trendDays, setTrendDays] = useState(30);
  
  // Debug log to check category data
  console.log('TicketTab categoryData:', categoryData);
  console.log('TicketTab categoryAnalytics:', categoryAnalytics);
  
  // Drilldown state
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownTitle, setDrilldownTitle] = useState('');
  const [drilldownColumns, setDrilldownColumns] = useState([]);
  const [drilldownParams, setDrilldownParams] = useState({});
  const [drilldownType, setDrilldownType] = useState('');
  
  const {
    loading: drilldownLoading,
    drilldownData,
    drilldownTicketsByStatus,
    drilldownTicketsByPriority,
    drilldownTicketsByAge,
    drilldownSLACompliance,
    clearDrilldownData,
  } = useDrilldownAnalytics();

  // Extract analytics data from aggregated response
  const dashboard = ticketsReport.dashboard || {};

  if (loading && !dashboard?.total_tickets) return <div style={{ padding: "20px" }}>Loading analytics...</div>;
  if (error) return <div style={{ color: "red", padding: "20px" }}>Error: {error}</div>;
  if (!dashboard?.total_tickets) return <div style={{ padding: "20px" }}>No data available</div>;

  const statusSummary = ticketsReport.status_summary || [];
  const priorityDistribution = ticketsReport.priority_distribution || [];
  const ticketAge = ticketsReport.ticket_age || [];

  // Storage used (fallback if not available)
  const totalTickets = dashboard?.total_tickets || 0;
  const completedTickets = dashboard?.completed_tickets || 0;
  const pendingTickets = dashboard?.pending_tickets || 0;
  const inProgressTickets = dashboard?.in_progress_tickets || 0;
  const avgResolutionTime = dashboard?.avg_resolution_time_hours || 0;
  const slaCompliance = dashboard?.sla_compliance_rate || 0;
  const escalationRate = dashboard?.escalation_rate || 0;

  // Drilldown handlers
  const handleStatusClick = async (status) => {
    setDrilldownTitle(`Tickets - ${status}`);
    setDrilldownColumns(DRILLDOWN_COLUMNS.tickets);
    setDrilldownType('status');
    setDrilldownParams({ status });
    setDrilldownOpen(true);
    await drilldownTicketsByStatus({ 
      status, 
      start_date: timeFilter?.startDate?.toISOString()?.split('T')[0],
      end_date: timeFilter?.endDate?.toISOString()?.split('T')[0],
    });
  };

  const handlePriorityClick = async (priority) => {
    setDrilldownTitle(`Tickets - ${priority} Priority`);
    setDrilldownColumns(DRILLDOWN_COLUMNS.tickets);
    setDrilldownType('priority');
    setDrilldownParams({ priority });
    setDrilldownOpen(true);
    await drilldownTicketsByPriority({ 
      priority,
      start_date: timeFilter?.startDate?.toISOString()?.split('T')[0],
      end_date: timeFilter?.endDate?.toISOString()?.split('T')[0],
    });
  };

  const handleAgeClick = async (ageBucket) => {
    setDrilldownTitle(`Tickets - ${ageBucket}`);
    setDrilldownColumns(DRILLDOWN_COLUMNS.ticketsSimple);
    setDrilldownType('age');
    setDrilldownParams({ age_bucket: ageBucket });
    setDrilldownOpen(true);
    await drilldownTicketsByAge({ age_bucket: ageBucket });
  };

  const handleDrilldownPageChange = async (page) => {
    const params = { 
      ...drilldownParams, 
      page,
      start_date: timeFilter?.startDate?.toISOString()?.split('T')[0],
      end_date: timeFilter?.endDate?.toISOString()?.split('T')[0],
    };
    
    if (drilldownType === 'status') {
      await drilldownTicketsByStatus(params);
    } else if (drilldownType === 'priority') {
      await drilldownTicketsByPriority(params);
    } else if (drilldownType === 'age') {
      await drilldownTicketsByAge(params);
    }
  };

  const handleCloseDrilldown = () => {
    setDrilldownOpen(false);
    clearDrilldownData();
  };

  const handleTrendDaysChange = async (e) => {
    const days = parseInt(e.target.value);
    setTrendDays(days);
    if (fetchTrendData) {
      await fetchTrendData(days);
    }
  };

  const kpiCardData = [
    {
      title: "Total Tickets",
      value: totalTickets,
      icon: <Ticket size={28} color="#4a90e2" />,
    },
    {
      title: "Completed Tickets",
      value: completedTickets,
      icon: <CheckCircle size={28} color="#7ed321" />,
    },
    {
      title: "Pending Tickets",
      value: pendingTickets,
      icon: <FolderOpen size={28} color="#f5a623" />,
    },
    {
      title: "In Progress Tickets",
      value: inProgressTickets,
      icon: <Clock size={28} color="#50e3c2" />,
    },
    {
      title: "Pending Tickets",
      value: dashboard?.pending_tickets || 0,
      icon: <HardDrive size={28} color="#a850e3ff" />,
    },
  ];

  // Priority distribution data
  const priorityLabels = priorityDistribution?.map(p => p.priority) || [];
  const priorityDataPoints = priorityDistribution?.map(p => p.count) || [];

  // Status summary data
  const statusLabels = statusSummary?.map(s => s.status) || [];
  const statusDataPoints = statusSummary?.map(s => s.count) || [];

  // Ticket age data - backend returns age_bucket not age_range
  const ageLabels = ticketAge?.map(t => t.age_bucket) || [];
  const ageDataPoints = ticketAge?.map(t => t.count) || [];

  // Ticket trend data (created vs resolved)
  const trendLabels = ticketTrends?.trends?.map(t => t.date) || [];
  const trendDatasets = [
    {
      label: 'Created',
      data: ticketTrends?.trends?.map(t => t.created) || [],
      borderColor: '#4a90e2',
    },
    {
      label: 'Resolved',
      data: ticketTrends?.trends?.map(t => t.resolved) || [],
      borderColor: '#7ed321',
    },
  ];

  // Category analytics data
  const categoryDistribution = categoryAnalytics?.by_category || [];
  const subCategoryDistribution = categoryAnalytics?.by_sub_category || [];
  const departmentDistribution = categoryAnalytics?.by_department || [];

  const categoryLabels = categoryDistribution.map(c => c.category || 'Unspecified');
  const categoryDataPoints = categoryDistribution.map(c => c.count);
  
  const subCategoryLabels = subCategoryDistribution.map(s => s.sub_category || 'Unspecified');
  const subCategoryDataPoints = subCategoryDistribution.map(s => s.count);
  
  const departmentLabels = departmentDistribution.map(d => d.department || 'Unspecified');
  const departmentDataPoints = departmentDistribution.map(d => d.count);

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
        {/* Ticket Trend Section */}
        <div className={styles.chartSection}>
          <div className={styles.trendHeader}>
            <h2>Ticket Trends (Last {trendDays} Days)</h2>
            <select 
              className={styles.trendSelect}
              value={trendDays}
              onChange={handleTrendDaysChange}
            >
              <option value={7}>Last 7 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={90}>Last 90 Days</option>
              <option value={180}>Last 180 Days</option>
              <option value={365}>Last 365 Days</option>
            </select>
          </div>
          <div className={styles.chartRow}>
            <ChartContainer title="Ticket Creation vs Resolution Trend">
              <LineChart
                labels={trendLabels}
                dataPoints={trendDatasets}
                chartTitle="Ticket Trends Over Time"
                chartLabel="Tickets"
              />
            </ChartContainer>
          </div>
          {ticketTrends?.summary && (
            <div className={styles.kpiGrid} style={{ marginTop: '1rem' }}>
              <div className={styles.kpiCard}>
                <div>
                  <p>Total Created (30 days)</p>
                  <h2>{ticketTrends.summary.total_created || 0}</h2>
                </div>
                <div>
                  <span className={styles.kpiIcon}><Ticket size={28} color="#4a90e2" /></span>
                </div>
              </div>
              <div className={styles.kpiCard}>
                <div>
                  <p>Total Resolved (30 days)</p>
                  <h2>{ticketTrends.summary.total_resolved || 0}</h2>
                </div>
                <div>
                  <span className={styles.kpiIcon}><CheckCircle size={28} color="#7ed321" /></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Ticket Analytics Section */}
        <div className={styles.chartSection}>
          <h2>Ticket Analytics <span className={styles.clickHint}>(click chart segments to drill down)</span></h2>
          <div className={styles.chartRow}>
            <ChartContainer title="Tickets by Status">
              <PieChart
                labels={statusLabels}
                dataPoints={statusDataPoints}
                chartTitle="Tickets by Status"
                chartLabel="Status"
                onClick={({ label }) => handleStatusClick(label)}
              />
            </ChartContainer>
            <ChartContainer title="Tickets by Priority">
              <PieChart
                labels={priorityLabels}
                dataPoints={priorityDataPoints}
                chartTitle="Tickets by Priority"
                chartLabel="Priority"
                onClick={({ label }) => handlePriorityClick(label)}
              />
            </ChartContainer>
            <ChartContainer title="Ticket Age Distribution">
              <BarChart
                labels={ageLabels}
                dataPoints={ageDataPoints}
                chartTitle="Ticket Age Distribution"
                chartLabel="Count"
                horizontal={true}
                onClick={({ label }) => handleAgeClick(label)}
              />
            </ChartContainer>
          </div>
        </div>

        {/* Category Analytics Section */}
        {(categoryLabels.length > 0 || subCategoryLabels.length > 0 || departmentLabels.length > 0) && (
          <div className={styles.chartSection}>
            <h2>Ticket Category Analytics</h2>
            <div className={styles.chartRow}>
              <ChartContainer title="Tickets by Category">
                <PieChart
                  labels={categoryLabels}
                  dataPoints={categoryDataPoints}
                  chartTitle="Tickets by Category"
                  chartLabel="Category"
                />
              </ChartContainer>
              <ChartContainer title="Tickets by Sub-Category">
                <BarChart
                  labels={subCategoryLabels}
                  dataPoints={subCategoryDataPoints}
                  chartTitle="Tickets by Sub-Category"
                  chartLabel="Count"
                  horizontal={true}
                />
              </ChartContainer>
              <ChartContainer title="Tickets by Department">
                <DoughnutChart
                  labels={departmentLabels}
                  values={departmentDataPoints}
                  chartTitle="Tickets by Department"
                  chartLabel="Department"
                />
              </ChartContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
