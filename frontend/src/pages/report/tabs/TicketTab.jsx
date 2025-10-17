import { useEffect, useState, useMemo } from "react";

// charts
import PieChart from "../../../components/charts/PieChart";
import BarChart from "../../../components/charts/BarChart";
import LineChart from "../../../components/charts/LineChart";
import ChartContainer from "../../../components/charts/ChartContainer";

// table
import TicketTable from "../../../tables/admin/TicketTable";

// date helper
import { format, subDays } from "date-fns";

// icons
import {
  Ticket,
  FolderOpen,
  CheckCircle,
  Clock,
  HardDrive,
} from "lucide-react";

// styles
import styles from "../report.module.css";
import general from "../../../style/general.module.css";

// hooks
import useTicketsFetcher from "../../../api/useTicketsFetcher";
import DynamicTable from "../../../tables/components/DynamicTable";

export default function TicketTab({ timeFilter }) {
  const [error, setError] = useState(null);
  const {
    tickets,
    fetchTickets,
    loading: ticketsLoading,
    error: ticketsError,
  } = useTicketsFetcher();

  // call fetchTickets once on mount
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

  if (ticketsLoading) return <div>Loading...</div>;
  if (ticketsError) return <div>Error: {ticketsError}</div>;
  if (!tickets || tickets.length === 0) return <div>No data available.</div>;

  // console.log("tickets:", tickets);

  // --- KPIs computed from tickets ---
  const totalTickets = filteredTickets.length;
  const openTickets = filteredTickets.filter((t) => t.status === "Open").length;
  const closedTickets = filteredTickets.filter(
    (t) => t.status === "Closed"
  ).length;
  const archivedTickets = filteredTickets.filter(
    (t) => t.status === "Archived"
  ).length;
  const activeTickets = totalTickets - archivedTickets;

  // Average resolution time (in hours) from created_at to time_closed (for closed tickets)
  const closedWithResolutionTime = filteredTickets.filter((t) => t.time_closed);
  const avgResolutionTime =
    closedWithResolutionTime.length > 0
      ? Math.round(
          closedWithResolutionTime.reduce((acc, t) => {
            const created = new Date(t.created_at);
            const closed = new Date(t.time_closed);
            return acc + (closed - created) / (1000 * 60 * 60);
          }, 0) / closedWithResolutionTime.length
        )
      : 0;

  // Storage used (fallback if not available)
  // useTicketsFetcher returns an array; if API attaches kpi object elsewhere, make access resilient
  const storageUsed = (tickets && tickets.kpi && tickets.kpi.storageUsed) || 0;

  const kpiCardData = [
    {
      title: "Total Tickets",
      value: totalTickets,
      icon: <Ticket size={28} color="#4a90e2" />,
    },
    {
      title: "Open Tickets",
      value: openTickets,
      icon: <FolderOpen size={28} color="#f5a623" />,
    },
    {
      title: "Closed Tickets",
      value: closedTickets,
      icon: <CheckCircle size={28} color="#7ed321" />,
    },
    {
      title: "Avg. Resolution Time (hrs)",
      // value: avgResolutionTime,
      value: 17, // hardcoded for demo
      icon: <Clock size={28} color="#50e3c2" />,
    },
    {
      title: "Storage Used",
      value: storageUsed,
      icon: <HardDrive size={28} color="#a850e3ff" />,
    },
  ];

  // Unique categories (from filtered tickets)
  const categoryLabels = [...new Set(filteredTickets.map((t) => t.category))];
  const categoryDataPoints = categoryLabels.map(
    (cat) => filteredTickets.filter((t) => t.category === cat).length
  );

  // Tickets sorted by created_at for timeline charts (from filtered tickets)
  const ticketsSortedByDate = [...filteredTickets].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

  // = Tickets Over Time labels and cumulative counts
  // Group tickets by created_at date
  const ticketsByDate = filteredTickets.reduce((acc, t) => {
    const date = format(new Date(t.created_at), "yyyy-MM-dd");
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});
  // Sort dates for proper timeline
  const sortedDates = Object.keys(ticketsByDate).sort();
  const dailyTicketCounts = sortedDates.map((date) => ticketsByDate[date]);

  // = Volume Trends
  const ticketDates = Object.keys(ticketsByDate).sort();
  const todayCounts = ticketDates.map((date) => ticketsByDate[date] || 0);
  const yesterdayCounts = ticketDates.map((date) => {
    const yest = format(subDays(new Date(date), 1), "yyyy-MM-dd");
    return ticketsByDate[yest] || 0;
  });

  // Resolution Time Trends - bars show resolution times for closed tickets (from filtered tickets)
  const resolvedTickets = filteredTickets.filter((t) => t.time_closed);
  const resolutionLabels = resolvedTickets.map((t) =>
    t.created_at.slice(0, 10)
  );
  const resolutionDurations = resolvedTickets.map((t) => {
    const created = new Date(t.created_at);
    const closed = new Date(t.time_closed);
    return Math.round((closed - created) / (1000 * 60 * 60));
  });

  // const resolutionDurations = resolvedTickets.map((t) => {
  //   const created = new Date(t.created_at);
  //   const closed = new Date(t.time_closed);
  //   const duration = (closed - created) / (1000 * 60 * 60);

  //   if (duration < 0) {
  //     console.log("Negative resolution time for ticket:", t);
  //   }

  //   return duration < 0 ? 0 : duration; // Correct negative durations to zero
  // });

  return (
    <div className={styles.rpTicketTabSection}>
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
        {/* Ticket Analytics Section */}
        <div className={styles.chartSection}>
          <h2>Ticket Analytics</h2>
          <div className={styles.chartRow}>
            <ChartContainer title="Tickets by Status">
              <PieChart
                labels={["Open", "Closed", "Pending", "Archived"]}
                dataPoints={[
                  openTickets,
                  closedTickets,
                  filteredTickets.filter((t) => t.status === "Pending").length,
                  archivedTickets,
                ]}
                chartTitle="Tickets by Status"
                chartLabel="Status"
              />
            </ChartContainer>
            <ChartContainer title="Tickets by Priority">
              <PieChart
                labels={["High", "Medium", "Low"]}
                dataPoints={[
                  filteredTickets.filter((t) => t.priority === "High").length,
                  filteredTickets.filter((t) => t.priority === "Medium").length,
                  filteredTickets.filter((t) => t.priority === "Low").length,
                ]}
                chartTitle="Tickets by Priority"
                chartLabel="Priority"
              />
            </ChartContainer>
            <ChartContainer title="Tickets by Category">
              <BarChart
                labels={categoryLabels}
                dataPoints={categoryDataPoints}
                chartTitle="Tickets by Category"
                chartLabel="Category"
              />
            </ChartContainer>
          </div>
        </div>

        {/* Time-Based Metrics */}
        <div className={styles.chartSection}>
          <h2>Time-Based Metrics</h2>
          <div className={styles.chartRow}>
            {/* <ChartContainer title="Tickets Over Time">
              <LineChart
                labels={dateLabels}
                dataPoints={ticketCounts}
                chartTitle="Tickets Over Time"
                chartLabel="Tickets"
              />
            </ChartContainer> */}
            <ChartContainer title="Tickets Over Time">
              <LineChart
                labels={sortedDates}
                dataPoints={dailyTicketCounts}
                chartTitle="Tickets Over Time"
                chartLabel="Tickets"
              />
            </ChartContainer>

            <ChartContainer title="Resolution Time Trends">
              <BarChart
                labels={resolutionLabels}
                dataPoints={resolutionDurations}
                chartTitle="Resolution Time Trends (hrs)"
                chartLabel="Hours"
              />
            </ChartContainer>
          </div>
        </div>

        {/* Archive & Trends */}
        <div className={styles.chartSection}>
          <h2>Archive & Trends</h2>
          <div className={styles.chartRow}>
            <ChartContainer title="Archived Tickets Overview">
              <PieChart
                labels={["Archived", "Active"]}
                dataPoints={[archivedTickets, activeTickets]}
                chartTitle="Archived Tickets Overview"
                chartLabel="Archive"
              />
            </ChartContainer>
            <ChartContainer title="Volume Trends">
              {/* <LineChart
                labels={dateLabels}
                dataPoints={ticketCounts}
                chartTitle="Volume Trends"
                chartLabel="Tickets"
              /> */}
              {/* <LineChart
                labels={sortedDates}
                dataPoints={dailyTicketCounts}
                chartTitle="Volume Trends"
                chartLabel="Tickets"
              /> */}
              <LineChart
                labels={ticketDates}
                dataPoints={[
                  { label: "Today", data: todayCounts },
                  { label: "Yesterday", data: yesterdayCounts },
                ]}
                chartTitle="Volume Trends: Today vs Yesterday"
                chartLabel="Tickets"
              />
            </ChartContainer>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className={styles.rpSection}>
        <div className={styles.rpTableSection}>
          <div className={general.tpTable}>
            {/* <TicketTable tickets={tickets} error={error} /> */}
            <DynamicTable
              data={filteredTickets}
              headers={[
                "Ticket No.",
                "Title",
                "Priority",
                "Status",
                "Submit Date",
              ]}
              columns={[
                { key: "ticket_id" },
                { key: "subject" },
                { key: "priority" },
                { key: "status" },
                {
                  key: "submit_date",
                  format: (d) => (d ? format(new Date(d), "yyyy-MM-dd") : ""),
                },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
