// react
import { useNavigate } from "react-router-dom";

// components
import AgentNav from "../../../components/navigation/AgentNav";
import StatusCard from "./components/StatusCard";
import TicketSummary from "./components/TicketSummary";
import SLACard from "./components/SLACard";
import PerformanceSnapshot from "./components/PerformanceSnapshot";
import TodayTasks from "./components/TodayTasks";
import OngoingTask from "./components/OngoingTask";
import KPICard from "./components/KPICard";

// style
import styles from "./dashboard.module.css";
import general from "./components/Component.module.css";

// hooks
import useUserTickets from "../../../api/useUserTickets";
import { useAuth } from "../../../api/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const { userTickets, loading, error } = useUserTickets();

  const navigate = useNavigate();

  // fetch tickets and filter those tickets that !has_acted
  const allTickets = (userTickets || [])
    .filter((e) => !e.has_acted)
    .map((e) => ({
      ticket_id: e.ticket_id,
      ticket_number: e.ticket_number,
      subject: e.ticket_subject,
      description: e.ticket_description,
      status: e.status,
      priority: e.priority || "Medium",
      created_at: e.created_at,
      updated_at: e.updated_at,
      workflow_name: e.workflow_name,
      current_step_name: e.current_step_name,
      task_id: e.task_id,
      has_acted: e.has_acted,
    }));

  const counts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    new: 0,
    open: 0,
    resolved: 0,
    onHold: 0,
    inProgress: 0,
    rejected: 0,
  };

  allTickets.forEach((t) => {
    const statusKey = t.status.toLowerCase().replace(/\s+/g, "");
    const priorityKey = t.priority.toLowerCase().replace(/\s+/g, "");

    if (statusKey === "new") counts.new += 1;
    if (statusKey === "open") counts.open += 1;

    if (statusKey === "inprogress") counts.open += 1;

    if (statusKey === "resolved") counts.resolved += 1;
    if (statusKey === "onhold") counts.onHold += 1;
    if (statusKey === "inprogress") counts.inProgress += 1;
    if (statusKey === "rejected") counts.rejected += 1;
    if (priorityKey === "critical") counts.critical += 1;
    if (priorityKey === "high") counts.high += 1;
    if (priorityKey === "medium") counts.medium += 1;
    if (priorityKey === "low") counts.low += 1;
  });

  // ticket summary
  const today = new Date().toISOString().split("T")[0];
  const resolvedTodayCount = allTickets.filter((t) => {
    const resolvedDate = t.updated_at?.split("T")[0];
    return t.status === "Resolved" && resolvedDate === today;
  }).length;

  // task today redefined: all unacted tickets
  const todayTasks = allTickets; // already filtered with !has_acted

  // task ongoing
  const ongoingTasks = allTickets
    .filter((t) => t.status?.toLowerCase() === "in progress")
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  const handleKpiClick = (label) => {
    // Map card labels to ticket tab values for agent ticket list
    const map = {
      "New Tickets": "All",
      Critical: "Critical",
      High: "High",
      Medium: "Medium",
      Low: "Low",
    };

    const tab = map[label] || "All";
    navigate(`/agent/ticket?tab=${encodeURIComponent(tab)}`);
  };

  return (
    <>
      <AgentNav />
      <main className={styles.dashboardPage}>
        <section className={styles.dpHeader}>
          <h1>
            Welcome,{" "}
            <span>{user?.first_name || user?.username || "MAP Employee"}!</span>
          </h1>
        </section>
        <section className={styles.dpBody}>
          {/* Content here */}
          <div className={styles.layoutSection}>
            <h2>Ticket Overview</h2>
            <div className={styles.dpCardSection}>
              <div className={styles.dpLeft}>
                <KPICard
                  number={counts.open}
                  label="New Tickets"
                  onClick={() => handleKpiClick("New Tickets")}
                />
              </div>
              <div className={styles.dpRight}>
                <KPICard
                  number={counts.critical}
                  label="Critical"
                  onClick={() => handleKpiClick("Critical")}
                />
                <KPICard
                  number={counts.high}
                  label="High"
                  onClick={() => handleKpiClick("High")}
                />
                <KPICard
                  number={counts.medium}
                  label="Medium"
                  onClick={() => handleKpiClick("Medium")}
                />
                <KPICard
                  number={counts.low}
                  label="Low"
                  onClick={() => handleKpiClick("Low")}
                />
              </div>
            </div>
          </div>
          <div className={styles.flexSection}>
            <div className={styles.layoutSection} style={{ flex: 2 }}>
              <TicketSummary
                inProgressCount={counts.inProgress}
                resolvedTodayCount={resolvedTodayCount}
                style={{ flex: 1 }}
              />
            </div>
            <div className={styles.layoutColumn} style={{ flex: 1 }}>
              <TodayTasks tasks={todayTasks} />
              <OngoingTask tasks={ongoingTasks} />
            </div>
          </div>
          <PerformanceSnapshot />
        </section>
      </main>
    </>
  );
}
