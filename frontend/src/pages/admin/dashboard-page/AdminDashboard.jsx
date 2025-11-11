// style
import styles from "./admin-dashboard.module.css";

// components
import AdminNav from "../../../components/navigation/AdminNav";
import KPICard from "./components/KPICard";
import QuickAction from "./components/QuickAction";
import PendingTask from "./components/PendingTask";

// charts
import ChartContainer from "../../../components/charts/ChartContainer";
import DoughnutChart from "../../../components/charts/DoughnutChart";
import BarChart from "../../../components/charts/BarChart";
import LineChart from "../../../components/charts/LineChart";
import PieChart from "../../../components/charts/PieChart";
import DynamicTable from "../../../tables/components/DynamicTable";

// hooks
import useUserTickets from "../../../api/useUserTickets";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../api/AuthContext";

// date helper
import { format } from "date-fns";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { userTickets, loading, error } = useUserTickets();

  // Only tickets that have not yet been acted
  const pendingTickets = (userTickets || [])
    .filter((e) => !e.has_acted)
    .map((e) => ({
      ticket_id: e.ticket_id,
      ticket_number: e.ticket_number,
      subject: e.ticket_subject,
      description: e.ticket_description,
      workflow_name: e.workflow_name,
      current_step_name: e.current_step_name,
      status: e.status,
      priority: e.priority || "Medium", // Default if not in new format
      has_acted: e.has_acted,
      submit_date: e.created_at,
      task_id: e.task_id,
      workflow_id: e.workflow_id,
      user_assignment: e.user_assignment,
    }));

  const counts = {
    new: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  const monthlyNewTickets = {};
  const priorityCounts = {};
  const statusCounts = {};
  let actedCount = 0;
  let notActedCount = 0;

  (userTickets || []).forEach((e) => {
    if (e.has_acted) actedCount += 1;
    else notActedCount += 1;
  });

  pendingTickets.forEach((t) => {
    const statusKey = t.status?.toLowerCase().replace(/\s+/g, "");
    const priorityKey = t.priority?.toLowerCase().replace(/\s+/g, "");

    if (statusKey === "new" || statusKey === "pending") counts.new += 1;
    if (priorityKey === "critical") counts.critical += 1;
    if (priorityKey === "high") counts.high += 1;
    if (priorityKey === "medium") counts.medium += 1;
    if (priorityKey === "low") counts.low += 1;

    // Priority distribution
    if (priorityKey) {
      priorityCounts[priorityKey] = (priorityCounts[priorityKey] || 0) + 1;
    }
    // Status distribution
    if (statusKey) {
      statusCounts[statusKey] = (statusCounts[statusKey] || 0) + 1;
    }

    // Group new tickets by month
    if (t.submit_date) {
      const month = format(new Date(t.submit_date), "MMMM");
      monthlyNewTickets[month] = (monthlyNewTickets[month] || 0) + 1;
    }
  });

  // console.log("has_acted counts:", { actedCount, notActedCount });
  // console.log("tickets: ", pendingTickets);

  const navigate = useNavigate();

  const handleKpiClick = (label) => {
    // Map card labels to AdminTicket tab values
    const map = {
      "New Tickets": "All",
      Critical: "Critical",
      High: "High",
      Medium: "Medium",
      Low: "Low",
    };

    const tab = map[label] || "All";
    navigate(`/admin/ticket?tab=${encodeURIComponent(tab)}`);
  };
  return (
    <>
      <AdminNav />
      <main className={styles.adminDashboardPage}>
        <section className={styles.adpHeader}>
          <h1>
            Welcome,{" "}
            <span>{user?.first_name || user?.username || "Admin"}!</span>
          </h1>
        </section>
        <section className={styles.adpBody}>
          <div className={styles.layoutSection}>
            <h2>Tickets Summary</h2>
            <div className={styles.layoutRow}>
              <KPICard
                label="New Tickets"
                number={counts.new}
                onClick={() => handleKpiClick("New Tickets")}
              />
              <KPICard
                label="Critical"
                number={counts.critical}
                onClick={() => handleKpiClick("Critical")}
              />
              <KPICard
                label="High"
                number={counts.high}
                onClick={() => handleKpiClick("High")}
              />
              <KPICard
                label="Medium"
                number={counts.medium}
                onClick={() => handleKpiClick("Medium")}
              />
              <KPICard
                label="Low"
                number={counts.low}
                onClick={() => handleKpiClick("Low")}
              />
            </div>
          </div>
          <div className={styles.flexSection}>
            <div className={styles.layoutSection} style={{ flex: 2 }}>
              <h2>Tickets Overview</h2>
              <div className={styles.layoutRow}>
                <ChartContainer title="Resolved Tickets">
                  <DoughnutChart
                    labels={["Acted", "Not Acted"]}
                    values={[actedCount, notActedCount]}
                    chartLabel="Tickets"
                    chartTitle="Acted vs Not Acted Tickets"
                  />
                </ChartContainer>
                <ChartContainer title="Tickets by Priority">
                  <PieChart
                    labels={Object.keys(priorityCounts)}
                    dataPoints={Object.values(priorityCounts)}
                    chartLabel="Tickets"
                    chartTitle="Ticket Priority Distribution"
                  />
                </ChartContainer>
              </div>
            </div>
            <div className={styles.layoutColumn} style={{ flex: 1 }}>
              <div className={styles.layoutSection}>
                <h2>Quick Actions</h2>
                <QuickAction />
              </div>
              <div className={styles.layoutSection}>
                <h2>Pending Tasks</h2>
                <PendingTask tickets={pendingTickets} />
              </div>
            </div>
          </div>
          <div className={styles.layoutSection}>
            <h2>Ticket Listed</h2>
            <DynamicTable
              data={pendingTickets}
              headers={[
                "Ticket No.",
                "Title",
                "Priority",
                "Status",
                "Created Date",
              ]}
              columns={[
                { key: "ticket_number" },
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
        </section>
      </main>
    </>
  );
}
