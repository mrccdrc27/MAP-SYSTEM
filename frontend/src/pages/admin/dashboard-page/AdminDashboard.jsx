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

export default function AdminDashboard() {
  const { userTickets, loading, error } = useUserTickets();

  const allTickets = (userTickets || [])
    .filter((e) => e.task?.ticket)
    .map((e) => e.task.ticket);

  const counts = {
    new: 0,
    open: 0,
    resolved: 0,
    onHold: 0,
    inProgress: 0,
    rejected: 0,
    critical: 0,
  };

  allTickets.forEach(
    (t) =>
      (counts[
        t.status.toLowerCase().replace(/\s+/g, "") === "new"
          ? "new"
          : t.status.toLowerCase().replace(/\s+/g, "") === "open"
          ? "open"
          : t.status.toLowerCase().replace(/\s+/g, "") === "resolved"
          ? "resolved"
          : t.status.toLowerCase().replace(/\s+/g, "") === "onhold"
          ? "onHold"
          : t.status.toLowerCase().replace(/\s+/g, "") === "inprogress"
          ? "inProgress"
          : t.status.toLowerCase().replace(/\s+/g, "") === "rejected"
          ? "rejected"
          : null
      ] += 1)
  );

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
                  {/* <TicketCard number="9" label="New Tickets" />
                  <TicketCard number="9" label="Open Tickets" /> */}
                  <TicketCard number={counts.new} label="New Tickets" />
                  <TicketCard number={counts.open} label="Open Tickets" />
                </div>
                <div className={styles.adpMid}>
                  <TicketCard number="X" label="Resolved Tickets" />
                  {/* <TicketCard number="X" label="On Hold Tickets" /> */}
                  <TicketCard number={counts.onHold} label="On Hold Tickets" />
                </div>
                <div className={styles.adpRight}>
                  {/* <TicketCard number="9" label="In Progress" />
                  <TicketCard number="9" label="Rejected Tickets" /> */}
                  <TicketCard
                    number={counts.rejected}
                    label="Rejected Tickets"
                  />
                  <TicketCard number={counts.inProgress} label="In Progress" />
                </div>
              </div>
              <div className={styles.adpSide}>
                {/* <TicketCard number="9" label="Critical" /> */}
                <TicketCard number={counts.critical} label="Critical" />
              </div>
            </div>
          </div>
          <div className={styles.adpContentSection}>
            <div className={styles.adpVisuals}>
              <h2>Charts</h2>
              <LineChart />
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
