// react
import { useEffect, useMemo } from "react";

// style
import styles from "./dashboard.module.css";

// components
import Nav from "../../../components/navigation/Nav";
import KPICard from "./components/KPICard";
import QuickAction from "./components/QuickAction";
import ToDoTickets from "./components/ToDoTickets";

// charts
import ChartContainer from "../../../components/charts/ChartContainer";
import DoughnutChart from "../../../components/charts/DoughnutChart";
import PieChart from "../../../components/charts/PieChart";
import PriorityPieChart from "./components/PriorityPieChart";
import DynamicTable from "../../../tables/components/DynamicTable";

// hooks
import useUserTickets from "../../../api/useUserTickets";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

// date helper
import { format } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const { userTickets, loading, error } = useUserTickets();

  // console.log("First Ticket:", JSON.stringify(userTickets?.[0], null, 2));

  // Only tickets that have not yet been acted
  const pendingTickets = useMemo(() => {
    return (userTickets || [])
      .filter((entry) => !entry.acted_on)
      .map((entry) => ({
        ticket_id: String(entry.ticket_id ?? entry.ticket_number ?? ""),
        subject: String(entry.ticket_subject ?? ""),
        description: String(entry.ticket_description ?? ""),
        status: entry.status,
        priority: entry.ticket_priority,
        category: entry.category || "Uncategorized",
        submit_date: entry.assigned_on,

        // TaskItem core fields
        task_item_id: entry.task_item_id,
        user_id: entry.user_id,
        user_full_name: entry.user_full_name,
        role: entry.role,
        task_id: entry.task_id,
        assigned_on: entry.assigned_on,
        status_updated_on: entry.status_updated_on,
        acted_on: entry.acted_on,
        target_resolution: entry.target_resolution,
        notes: entry.notes,

        // Ticket fields
        ticket_number: entry.ticket_number,

        // Workflow fields
        workflow_id: entry.workflow_id,
        workflow_name: entry.workflow_name,

        // Step fields
        current_step_id: entry.current_step_id,
        current_step_name: entry.current_step_name,
        current_step_role: entry.current_step_role,
        acted_on_step_id: entry.acted_on_step_id,
        acted_on_step_name: entry.acted_on_step_name,

        // Task status
        task_status: entry.task_status,

        // Metadata
        step_instance_id: entry.task_id, // Use task_id as identifier
        hasacted: entry.acted_on ? true : false, // <-- changed to rely on acted_on
      }));
  }, [userTickets]);

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
    if (e.acted_on) actedCount += 1;
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
    navigate(`/ticket?tab=${encodeURIComponent(tab)}`);
  };

  return (
    <>
      <Nav />
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
                  <PriorityPieChart
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
                <h2>Upcoming Tasks</h2>
                <ToDoTickets tickets={pendingTickets} />
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
