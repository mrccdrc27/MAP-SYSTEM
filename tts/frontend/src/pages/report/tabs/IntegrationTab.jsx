import ComponentSkeleton from "../../../components/skeleton/ComponentSkeleton";
import PieChart from "../../../components/charts/PieChart";
import BarChart from "../../../components/charts/BarChart";
import LineChart from "../../../components/charts/LineChart";
import ChartContainer from "../../../components/charts/ChartContainer";
import IntegrationStatusCard from "../components/IntegrationStatusCard";
import DynamicTable from "../../../tables/components/DynamicTable";

// icons
import { 
  Plug, 
  Activity, 
  Zap, 
  AlertCircle,
  Link as LinkIcon
} from "lucide-react";

import styles from "../report.module.css";
// import { useIntegrationReportData } from "../reportHooks";  // Commented out since we're using mock data

export default function IntegrationTab({ analyticsData, loading, error }) {
  // Dummy data simulation
  const reportData = {
    integrations: [
      {
        name: "Integration A",
        status: "Active",
        responseTime: "200ms",
        errorRate: 0.05,
      },
      {
        name: "Integration B",
        status: "Inactive",
        responseTime: "500ms",
        errorRate: 0.12,
      },
      {
        name: "Integration C",
        status: "Active",
        responseTime: "300ms",
        errorRate: 0.03,
      },
      {
        name: "Integration D",
        status: "Active",
        responseTime: "100ms",
        errorRate: 0.02,
      },
    ],
  };

  const loadingState = loading || false;
  const errorState = error || null;

  if (loadingState) {
    return (
      <div className={styles.tabContent}>
        <ComponentSkeleton className="report-skeleton">
          <div className={styles.skeletonContainer}>
            <div className={styles.skeletonHeader}>
              <div className={styles.skeletonTitle}>Loading Integration Analytics...</div>
              <div className={styles.skeletonSubtitle}>Fetching integration performance data</div>
            </div>
            <div className={styles.skeletonGrid}>
              <div className={styles.skeletonCard}>
                <Plug size={16} style={{ marginRight: '8px' }} />
                Integration Status
              </div>
              <div className={styles.skeletonCard}>
                <Activity size={16} style={{ marginRight: '8px' }} />
                API Metrics
              </div>
              <div className={styles.skeletonCard}>
                <Zap size={16} style={{ marginRight: '8px' }} />
                Response Times
              </div>
              <div className={styles.skeletonCard}>
                <AlertCircle size={16} style={{ marginRight: '8px' }} />
                Error Rates
              </div>
            </div>
          </div>
        </ComponentSkeleton>
      </div>
    );
  }
  if (errorState) return <div>Error: {errorState}</div>;
  if (!reportData) return <div>No data available.</div>;

  const activeCount = reportData.integrations.filter(i => i.status === "Active").length;
  const avgResponse = Math.round(reportData.integrations.reduce((acc, i) => acc + parseInt(i.responseTime), 0) / reportData.integrations.length);
  const avgErrorRate = (reportData.integrations.reduce((acc, i) => acc + i.errorRate, 0) / reportData.integrations.length * 100).toFixed(1);

  return (
    <div className={styles.tabContent}>
      {/* KPI Section */}
      <div className={styles.chartSection} style={{ marginBottom: "24px" }}>
        <h2>Integration KPI</h2>
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div>
              <p>Active Integrations</p>
              <h2>
                {activeCount} / {reportData.integrations.length}
              </h2>
            </div>
            <div className={styles.kpiIcon}>
              <Plug size={28} color="#7ed321" />
            </div>
          </div>
          <div className={styles.kpiCard}>
            <div>
              <p>Avg. Response Time</p>
              <h2>{avgResponse}ms</h2>
            </div>
            <div className={styles.kpiIcon}>
              <Zap size={28} color="#f5a623" />
            </div>
          </div>
          <div className={styles.kpiCard}>
            <div>
              <p>System Health</p>
              <h2>{100 - avgErrorRate}%</h2>
            </div>
            <div className={styles.kpiIcon}>
              <Activity size={28} color="#4a90e2" />
            </div>
          </div>
          <div className={styles.kpiCard}>
            <div>
              <p>Sync Issues</p>
              <h2>0</h2>
            </div>
            <div className={styles.kpiIcon}>
              <AlertCircle size={28} color="#e74c3c" />
            </div>
          </div>
        </div>
      </div>

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
                  (i) => parseFloat(i.responseTime.replace(/[^\d.]/g, "")) || 0
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
    </div>
  );
}
