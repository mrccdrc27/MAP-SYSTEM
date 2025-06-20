// components
import AgentNav from "../../../components/navigation/AgentNav";
import StatusCard from "./components/StatusCard";
import TicketSummary from "./components/TicketSummary";
import SLACard from "./components/SLACard";
import PerformanceSnapshot from "./components/PerformanceSnapshot";
import TodayTasks from "./components/TodayTasks";

// style
import styles from "./dashboard.module.css";
import general from "./components/component.module.css";

export default function Dashboard() {
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
              <StatusCard number="25" label="Open Tickets" />
            </div>
            <div className={styles.dpRight}>
              <StatusCard number="9" label="Critical" />
              <StatusCard number="3" label="High" />
              <StatusCard number="7" label="Medium" />
              <StatusCard number="5" label="Low" />
            </div>
          </div>
          <div className={general.dpCardLayout}>
            <TicketSummary />
            <TodayTasks />
            <SLACard />
            <PerformanceSnapshot />
          </div>
        </section>
      </main>
    </>
  );
}
