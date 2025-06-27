// components
import AgentNav from "../../../components/navigation/AgentNav";
import StatusCard from "./components/StatusCard";
import TicketSummary from "./components/TicketSummary";
import SLACard from "./components/SLACard";
import PerformanceSnapshot from "./components/PerformanceSnapshot";
import TodayTasks from "./components/TodayTasks";
import OngoingTask from "./components/OngoingTask";

// style
import styles from "./dashboard.module.css";
import general from "./components/Component.module.css";

// hooks
import useUserTickets from "../../../api/useUserTickets";

export default function Dashboard() {
  const { userTickets, loading, error } = useUserTickets();

  // old
  // const allTickets = (userTickets || [])
  //   .filter((e) => e.task?.ticket)
  //   .map((e) => ({
  //     ...e.task.ticket,
  //     step_instance_id: e.step_instance_id,
  //     has_acted: e.has_acted,
  //     agent: e.agent, 
  //   }));

  // fetch tickets and filter those tickets that !has_acted
  const allTickets = (userTickets || [])
    .filter((e) => e.task?.ticket && !e.has_acted) 
    .map((e) => ({
      ...e.task.ticket,
      step_instance_id: e.step_instance_id,
      has_acted: e.has_acted,
      agent: e.agent,
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
    const resolvedDate = t.updated_date?.split("T")[0];
    return t.status === "Resolved" && resolvedDate === today;
  }).length;

  // task today
  const todayTasks = allTickets.filter((t) => {
    const created = t.submit_date?.split("T")[0];
    const updated = t.update_date?.split("T")[0];
    return created === today || updated === today;
  });

  // task ongoing
  const ongoingTasks = allTickets
    .filter((t) => t.status?.toLowerCase() === "in progress")
    .sort((a, b) => new Date(b.update_date) - new Date(a.update_date));

  return (
    <>
      <AgentNav />
      <main className={styles.dashboardPage}>
        <section className={styles.dpHeader}>
          <h1>Dashboard</h1>
        </section>
        <section className={styles.dpBody}>
          {/* Content here */}
          <div className={styles.dpCardSection}>
            <div className={styles.dpLeft}>
              <StatusCard number={counts.open} label="Open Tickets" />
            </div>
            <div className={styles.dpRight}>
              <StatusCard number={counts.critical} label="Critical" />
              <StatusCard number={counts.high} label="High" />
              <StatusCard number={counts.medium} label="Medium" />
              <StatusCard number={counts.low} label="Low" />
            </div>
          </div>
          <div className={general.dpCardLayout}>
            <TicketSummary
              inProgressCount={counts.inProgress}
              resolvedTodayCount={resolvedTodayCount}
            />
            <TodayTasks tasks={todayTasks} />
            <OngoingTask tasks={ongoingTasks} />
            {/* <SLACard /> */}
            <PerformanceSnapshot />
          </div>
        </section>
      </main>
    </>
  );
}
