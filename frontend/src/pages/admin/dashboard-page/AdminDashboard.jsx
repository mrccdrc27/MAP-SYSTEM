// styles
import styles from "./admin-dashboard.module.css";

// components
import AdminNav from "../../../components/navigation/AdminNav";
import TicketCard from "./components/TicketCard";
import QuickAction from "./components/QuickAction";

// charts
import LineChart from "./charts/LineChart";

// hooks
import useUserTickets from "../../../api/useUserTickets";

// date helper
import { format } from "date-fns";

export default function AdminDashboard() {
  const { userTickets, loading, error } = useUserTickets();
  
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
    new: 0,
    open: 0,
    resolved: 0,
    onHold: 0,
    inProgress: 0,
    rejected: 0,
    critical: 0,
  };

  const monthlyNewTickets = {};

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

    // Group new tickets by month
    if (statusKey === "new" && t.created_at) {
      const month = format(new Date(t.submit_date), "MMMM");
      monthlyNewTickets[month] = (monthlyNewTickets[month] || 0) + 1;
    }
  });

  return (
    <>
      <AdminNav />
      <main className={styles.adminDashboardPage}>
        <section className={styles.adpHeader}>
          <h1>Dashboard</h1>
        </section>

        <section className={styles.adpBody}>
          <div className={styles.adpCardSection}>
            <div className={styles.adpWrapper}>
              <div className={styles.adpLeftRight}>
                <div className={styles.adpLeft}>
                  <TicketCard number={counts.new} label="New Tickets" />
                  <TicketCard number={counts.open} label="Open Tickets" />
                </div>
                <div className={styles.adpMid}>
                  <TicketCard
                    number={counts.resolved}
                    label="Resolved Tickets"
                  />
                  <TicketCard number={counts.onHold} label="On Hold Tickets" />
                </div>
                <div className={styles.adpRight}>
                  <TicketCard
                    number={counts.rejected}
                    label="Rejected Tickets"
                  />
                  <TicketCard number={counts.inProgress} label="In Progress" />
                </div>
              </div>
              <div className={styles.adpSide}>
                <TicketCard number={counts.critical} label="Critical" />
              </div>
            </div>
          </div>

          <div className={styles.adpContentSection}>
            <div className={styles.adpVisuals}>
              <h2>Charts</h2>
              <LineChart chartData={monthlyNewTickets} />
            </div>
            <div className={styles.adpQuickActionSection}>
              <h2>Quick Actions</h2>
              <div className={styles.adpQuicActions}>
                <QuickAction />
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
