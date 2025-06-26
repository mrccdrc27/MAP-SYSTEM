// components
import AgentNav from "../../../components/navigation/AgentNav";

// style
import styles from "./archive.module.css";

// table
import TicketTable from "../../../tables/agent/TicketTable";
import ArchiveTable from "../../../tables/agent/ArchiveTable";

export default function Archive() {
  return (
    <>
      <AgentNav />
      <main className={styles.archivePage}>
        {/* <section className={styles.appHeader}>
          <h1>Archived Tickets</h1>
        </section> */}
        <section className={styles.apBody}>
          <div className={styles.apTableSection}>
            <div className={styles.apTable}>
              <ArchiveTable />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
