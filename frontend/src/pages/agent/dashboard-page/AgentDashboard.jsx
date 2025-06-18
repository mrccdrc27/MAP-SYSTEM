// components
import AgentNav from "../../../components/navigations/agent-nav/AgentNav";
import CardStatus from "./components/CardStatus";
import { CardPriority } from "./components/CardStatus";
import RecentUpdates from "./components/RecentUpdates";

// styles
// import styles from './agent-dashboard.module.css'
import UpcomingTicketTable from "../../../tables/agent/UpcomingTicketTable";
import styles from "./agent-dashboard1.module.css";
import { useAuth } from "../../../api/AuthContext";


export default function AgentDashboard() {

  // for importing user (in global)
  const { user, loading, logout } = useAuth(); // ✅ Hook at top level
  if (loading) return <p>Loading...</p>; // loading seems to be important too


  return (
    <>
      <AgentNav />
      {/* <main className={styles.dashboardPage}>
      <section className={styles.dashboardTopSection}>
        <div className={styles.dbHeroSection}>
          <p>Welcome, Username!</p>
        </div>
      </section> 

      <section className={styles.dashboardBotSection}>
        <div className={styles.dbLeftSection}>
          <div className={styles.dbCardSection}>
            <h3>Dashboard</h3>
            <div className={styles.statusCont}>
              <CardStatus number="15" label="Open"/>
              <CardStatus number="14" label="On Hold"/>
              <CardStatus number="13" label="Approved"/>
              <CardStatus number="12" label="Rejected"/>
            </div>
          </div>
          <div className={styles.dbUpcomingTicketSection}>
           <h3>Upcoming Tickets</h3>
           <div className={styles.updateCont}>
              <UpcomingTicketTable />
           </div>
          </div>
        </div> 
        <div className={styles.dbRightSection}>
          <div className={styles.dbTicketSection}>
            <h3>Recent Updates</h3>
            <RecentUpdates />
            <RecentUpdates />
            <RecentUpdates />
            <RecentUpdates />
            <RecentUpdates />
          </div>
        </div> 
      </section> 
    </main> */}
      <main className={styles.dashboardPage}>
        <section className={styles.dpTop}>
          <div className={styles.dpHeading}>For you,<span> {user.first_name}</span></div>
          <div className={styles.dpSubHeading}>
            Welcome back, Minatozaki! Here’s what happening with your tickets.
          </div>
        </section>

        <section className={styles.dpMid}>
          <div className={styles.dpHeader}>Quick Summary</div>
          <div className={styles.dpCardSection}>
            <div className={styles.csLeft}>
              <CardPriority number="25" label="Open Tickets" />
            </div>
            <div className={styles.csRight}>
              <CardPriority number="9" label="Critical" />
              <CardPriority number="3" label="High" />
              <CardPriority number="7" label="Medium" />
              <CardPriority number="5" label="Low" />
            </div>
          </div>
        </section>

        <section className={styles.dpBot}>
          <div className={styles.dpBotLeft}>
            <div className={styles.dpHeaderWrapper}>
              <div className={styles.dpHeader}>Active Tickets</div>
              <div className={styles.dpQuick}>View all tickets</div>
            </div>
            <div>
              <UpcomingTicketTable />
            </div>
          </div>
          <div className={styles.dpBotRight}>
            <div className={styles.dpHeader}>Recent Activities</div>
            <div>
              <RecentUpdates />
              <RecentUpdates />
              <RecentUpdates />
              <RecentUpdates />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
