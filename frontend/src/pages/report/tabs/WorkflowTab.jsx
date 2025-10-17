// react
import { useMemo } from "react";

// charts
import BarChart from "../../../components/charts/BarChart";
import LineChart from "../../../components/charts/LineChart";
import ChartContainer from "../../../components/charts/ChartContainer";
import DoughnutChart from "../../../components/charts/DoughnutChart";
import PieChart from "../../../components/charts/PieChart";

// styles
import styles from "../report.module.css";

// hooks
import useFetchWorkflows from "../../../api/useFetchWorkflows";

// Helper function to count occurrences by field
const countByField = (data, field) => {
  return data.reduce((acc, item) => {
    const key = item[field] || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
};

export default function WorkflowTab({ timeFilter }) {
  const { workflows, refetch, loading, error } = useFetchWorkflows();

  const filteredWorkflows = useMemo(() => {
    const { startDate, endDate } = timeFilter || {};
    if (!startDate && !endDate) return workflows;

    return workflows.filter((wf) => {
      const created = new Date(wf.created_at);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && created < start) return false;
      if (end && created > end) return false;

      return true;
    });
  }, [workflows, timeFilter]);

  // console.log("Fetched workflows:", workflows);

  if (loading) return <div>Loading data, please wait...</div>;
  if (error)
    return <div>Error: {error.message || "An unexpected error occurred"}</div>;
  if (!workflows || workflows.length === 0)
    return <div>No data available.</div>;

  // Prepare data
  const categoryCounts = countByField(filteredWorkflows, "category");
  const statusCounts = countByField(filteredWorkflows, "status");
  const departmentCounts = countByField(filteredWorkflows, "department");

  return (
    <div className={styles.chartsGrid}>
      <div className={styles.chartSection}>
        <h2>Workflow Analytics</h2>
        <div className={styles.chartRow}>
          {/* Chart 2: Workflows by Status */}
          <ChartContainer title="Workflows by Status">
            <DoughnutChart
              labels={Object.keys(statusCounts)}
              values={Object.values(statusCounts)}
              chartTitle="Workflows per Status"
              chartLabel="Number of Workflows"
            />
            {/* <DoughnutChart
              labels={["Acted", "Not Acted"]}
              values={[actedCount, notActedCount]}
              chartLabel="Tickets"
              chartTitle="Acted vs Not Acted Tickets"
            /> */}
          </ChartContainer>

          {/* Chart 1: Workflows by Category */}
          <ChartContainer title="Workflows by Category">
            <PieChart
              labels={Object.keys(categoryCounts)}
              dataPoints={Object.values(categoryCounts)}
              chartTitle="Workflows per Category"
              chartLabel="Number of Workflows"
            />
          </ChartContainer>

          {/* Chart 3: Workflows by Department */}
          <ChartContainer title="Workflows by Department">
            <PieChart
              labels={Object.keys(departmentCounts)}
              dataPoints={Object.values(departmentCounts)}
              chartTitle="Workflows per Department"
              chartLabel="Number of Workflows"
            />
          </ChartContainer>
        </div>
      </div>
    </div>
  );
}
