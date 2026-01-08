// react
import { useMemo } from "react";

// components
import ComponentSkeleton from "../../../components/skeleton/ComponentSkeleton";

// charts
import BarChart from "../../../components/charts/BarChart";
import ChartContainer from "../../../components/charts/ChartContainer";
import PieChart from "../../../components/charts/PieChart";
import DoughnutChart from "../../../components/charts/DoughnutChart";

// icons
import { 
  Layers, 
  Activity, 
  CheckCircle, 
  TrendingUp,
  Workflow,
  ClipboardList
} from "lucide-react";

// styles
import styles from "../report.module.css";

// Helper function to count occurrences by field
const countByField = (data, field) => {
  return data.reduce((acc, item) => {
    const key = item[field] || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
};

export default function WorkflowTab({ timeFilter, analyticsData = {}, loading, error }) {
  const workflowsReport = analyticsData || {};

  const workflowMetrics = useMemo(() => workflowsReport.workflow_metrics || [], [workflowsReport]);
  const departmentAnalytics = useMemo(() => workflowsReport.department_analytics || [], [workflowsReport]);
  const stepPerformance = useMemo(() => workflowsReport.step_performance || [], [workflowsReport]);

  const kpis = useMemo(() => {
    const totalTasks = workflowMetrics.reduce((acc, w) => acc + (w.total_tasks || 0), 0);
    const totalCompleted = workflowMetrics.reduce((acc, w) => acc + (w.completed_tasks || 0), 0);
    const totalWorkflows = workflowMetrics.length;
    const avgCompletionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

    return { totalTasks, totalCompleted, totalWorkflows, avgCompletionRate };
  }, [workflowMetrics]);

  if (loading) {
    return (
      <div className={styles.tabContent}>
        <ComponentSkeleton className="report-skeleton">
          <div className={styles.skeletonContainer}>
            <div className={styles.skeletonHeader}>
              <div className={styles.skeletonTitle}>Loading Workflow Analytics...</div>
              <div className={styles.skeletonSubtitle}>Fetching workflow performance data</div>
            </div>
            <div className={styles.skeletonGrid}>
              <div className={styles.skeletonCard}>
                <Layers size={16} style={{ marginRight: '8px' }} />
                Workflow Metrics
              </div>
              <div className={styles.skeletonCard}>
                <Activity size={16} style={{ marginRight: '8px' }} />
                Department Analytics
              </div>
              <div className={styles.skeletonCard}>
                <ClipboardList size={16} style={{ marginRight: '8px' }} />
                Step Performance
              </div>
              <div className={styles.skeletonCard}>
                <TrendingUp size={16} style={{ marginRight: '8px' }} />
                Processing Times
              </div>
            </div>
          </div>
        </ComponentSkeleton>
      </div>
    );
  }
  if (error) return <div style={{ color: "red", padding: "20px" }}>Error: {error}</div>;
  if (!workflowMetrics.length && !departmentAnalytics.length && !stepPerformance.length)
    return <div style={{ padding: "20px" }}>No workflow data available</div>;

  // Extract data for charts
  const workflowLabels = workflowMetrics?.map(w => w.workflow_name) || [];
  const workflowDataPoints = workflowMetrics?.map(w => w.total_tasks) || [];
  const workflowCompletionRates = workflowMetrics?.map(w => Math.round(w.completion_rate || 0)) || [];

  const deptLabels = departmentAnalytics?.map(d => d.department || "Unknown") || [];
  const deptDataPoints = departmentAnalytics?.map(d => d.total_tickets) || [];

  const stepLabels = stepPerformance?.map(s => s.step_name?.split(' - ')[1] || s.step_name) || [];
  const stepDataPoints = stepPerformance?.map(s => s.total_tasks) || [];

  return (
    <div className={styles.tabContent}>
      {/* KPI Section */}
      <div className={styles.chartSection} style={{ marginBottom: '24px' }}>
        <h2>Workflow KPI</h2>
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div>
              <p>Total Tasks</p>
              <h2>{kpis.totalTasks}</h2>
            </div>
            <div className={styles.kpiIcon}>
              <ClipboardList size={28} color="#4a90e2" />
            </div>
          </div>
          <div className={styles.kpiCard}>
            <div>
              <p>Avg. Completion Rate</p>
              <h2>{kpis.avgCompletionRate}%</h2>
            </div>
            <div className={styles.kpiIcon}>
              <TrendingUp size={28} color="#a850e3" />
            </div>
          </div>
          <div className={styles.kpiCard}>
            <div>
              <p>Active Workflows</p>
              <h2>{kpis.totalWorkflows}</h2>
            </div>
            <div className={styles.kpiIcon}>
              <Workflow size={28} color="#f5a623" />
            </div>
          </div>
          <div className={styles.kpiCard}>
            <div>
              <p>Completed Tasks</p>
              <h2>{kpis.totalCompleted}</h2>
            </div>
            <div className={styles.kpiIcon}>
              <CheckCircle size={28} color="#7ed321" />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        {/* Workflow Performance Section - Focus on the requested fixes */}
        <div className={styles.chartSection}>
          <h2>Workflow Execution & Completion</h2>
          <div className={styles.chartRow}>
            <ChartContainer title="Workflows by Execution Count">
              <BarChart
                labels={workflowLabels}
                dataPoints={workflowDataPoints}
                chartTitle="Tasks per Workflow"
                chartLabel="Count"
                horizontal={true}
              />
            </ChartContainer>

            <ChartContainer title="Workflow Completion Rates">
              <BarChart
                labels={workflowLabels}
                dataPoints={workflowCompletionRates}
                chartTitle="Completion Rate per Workflow (%)"
                chartLabel="Percentage"
                horizontal={true}
              />
            </ChartContainer>
          </div>
        </div>

        {/* Breakdown Section */}
        <div className={styles.chartSection}>
          <h2>Department & Step Performance</h2>
          <div className={styles.chartRow}>
            <ChartContainer title="Workflows by Department">
              <DoughnutChart
                labels={deptLabels}
                values={deptDataPoints}
                chartTitle="Department Distribution"
                chartLabel="Tickets"
              />
            </ChartContainer>

            <ChartContainer title="Step Performance">
              <BarChart
                labels={stepLabels}
                dataPoints={stepDataPoints}
                chartTitle="Tasks Distribution by Step"
                chartLabel="Count"
                horizontal={true}
              />
            </ChartContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
