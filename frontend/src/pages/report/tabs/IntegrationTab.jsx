import ComponentSkeleton from "../../../components/skeleton/ComponentSkeleton";
import PieChart from "../../../components/charts/PieChart";
import BarChart from "../../../components/charts/BarChart";
import LineChart from "../../../components/charts/LineChart";
import ChartContainer from "../../../components/charts/ChartContainer";
import IntegrationStatusCard from "../components/IntegrationStatusCard";
import DynamicTable from "../../../tables/components/DynamicTable";
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
              <div className={styles.skeletonCard}>🔌 Integration Status</div>
              <div className={styles.skeletonCard}>📡 API Metrics</div>
              <div className={styles.skeletonCard}>⚡ Response Times</div>
              <div className={styles.skeletonCard}>🛠️ Error Rates</div>
            </div>
          </div>
        </ComponentSkeleton>
      </div>
    );
  }
  if (errorState) return <div>Error: {errorState}</div>;
  if (!reportData) return <div>No data available.</div>;

  return (
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
              dataPoints={reportData.integrations.map((i) => i.errorRate * 100)}
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
  );
}
