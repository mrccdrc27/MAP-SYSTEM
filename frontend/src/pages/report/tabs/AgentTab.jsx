import { useEffect, useMemo } from "react";

// charts
import PieChart from "../../../components/charts/PieChart";
import BarChart from "../../../components/charts/BarChart";
import LineChart from "../../../components/charts/LineChart";
import DoughnutChart from "../../../components/charts/DoughnutChart";
import ChartContainer from "../../../components/charts/ChartContainer";

// styles
import styles from "../report.module.css";

// hooks
import useTicketsFetcher from "../../../api/useTicketsFetcher";

// Utility: Convert "HH:MM:SS" => hours as float
const timeToHours = (timeStr) => {
  const [h, m, s] = timeStr.split(":").map(Number);
  return h + m / 60 + s / 3600;
};

// Group tickets by assigned agent and compute stats
const groupByAgent = (tickets) => {
  const agentMap = {};

  tickets.forEach((ticket) => {
    const agent = ticket.assigned_to || "Unassigned";

    if (!agentMap[agent]) {
      agentMap[agent] = {
        ticketsHandled: 0,
        totalResponseTime: 0,
        responseCount: 0,
      };
    }

    agentMap[agent].ticketsHandled += 1;

    if (ticket.response_time) {
      agentMap[agent].totalResponseTime += timeToHours(ticket.response_time);
      agentMap[agent].responseCount += 1;
    }
  });

  return Object.entries(agentMap).map(([name, data]) => ({
    name,
    ticketsHandled: data.ticketsHandled,
    avgResponseTime:
      data.responseCount > 0
        ? (data.totalResponseTime / data.responseCount).toFixed(2)
        : 0,
  }));
};

export default function AgentTab({ timeFilter }) {
  const { tickets, fetchTickets, loading, error } = useTicketsFetcher();

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const filteredTickets = useMemo(() => {
    const { startDate, endDate } = timeFilter || {};
    if (!startDate && !endDate) return tickets;

    return tickets.filter((t) => {
      const created = new Date(t.created_at);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && created < start) return false;
      if (end && created > end) return false;

      return true;
    });
  }, [tickets, timeFilter]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!tickets || tickets.length === 0)
    return <div>No ticket data available.</div>;

  const agents = groupByAgent(filteredTickets);
  const departments = [...new Set(filteredTickets.map((t) => t.department))];
  const categories = [...new Set(filteredTickets.map((t) => t.category))];

  return (
    <div className={styles.chartsGrid}>
      {/* Agent Performance */}
      <div className={styles.chartSection}>
        <h2>Agent Performance</h2>
        <div className={styles.chartRow}>
          <ChartContainer title="Tickets Handled per Agent">
            <DoughnutChart
              labels={agents.map((a) => a.name)}
              values={agents.map((a) => a.ticketsHandled)}
              chartTitle="Tickets Handled per Agent"
              chartLabel="Tickets"
            />
          </ChartContainer>

          <ChartContainer title="Average Response Time by Agent">
            <BarChart
              labels={agents.map((a) => a.name)}
              dataPoints={agents.map((a) => parseFloat(a.avgResponseTime))}
              chartTitle="Avg Response Time (h)"
              chartLabel="Response Time"
            />
          </ChartContainer>
        </div>
      </div>

      {/* Department & Issue Insights */}
      <div className={styles.chartSection}>
        <h2>User & Department Insights</h2>
        <div className={styles.chartRow}>
          <ChartContainer title="Tickets by Department">
            <PieChart
              labels={departments}
              dataPoints={departments.map(
                (dep) =>
                  filteredTickets.filter((t) => t.department === dep).length
              )}
              chartTitle="Tickets by Department"
              chartLabel="Tickets"
            />
          </ChartContainer>

          <ChartContainer title="Top Recurring Issues">
            <LineChart
              labels={categories}
              dataPoints={categories.map(
                (cat) =>
                  filteredTickets.filter((t) => t.category === cat).length
              )}
              chartTitle="Top Recurring Issues"
              chartLabel="Issues"
            />
          </ChartContainer>
        </div>
      </div>
    </div>
  );
}
