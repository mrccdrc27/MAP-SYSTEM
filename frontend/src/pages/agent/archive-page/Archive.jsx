// react
import { useState } from "react";

// components
import AgentNav from "../../../components/navigation/AgentNav";

// style
import styles from "./archive.module.css";

// table
import ArchiveTable from "../../../tables/agent/ArchiveTable";

// hooks
import useUserTickets from "../../../api/useUserTickets";

export default function Archive() {
  const { userTickets, loading, error } = useUserTickets();

  // Filters
  const [filters, setFilters] = useState({
    search: "",
  });

  // Extract all ticket data with step_instance_id
  const allTickets1 = (userTickets || [])
    .filter((entry) => entry.task?.ticket)
    .map((entry) => ({
      ...entry.task.ticket,
      step_instance_id: entry.step_instance_id,
      hasacted: entry.has_acted,
    }));

  const allTickets = (userTickets || [])
    .filter((entry) => entry.task?.ticket && entry.has_acted)
    .map((entry) => ({
      ...entry.task.ticket,
      step_instance_id: entry.step_instance_id,
      hasacted: entry.has_acted,
    }));

  const filteredTickets = allTickets.filter((ticket) => {
    const search = filters.search.toLowerCase();
    if (
      search &&
      !(
        ticket.ticket_id.toLowerCase().includes(search) ||
        ticket.subject.toLowerCase().includes(search) ||
        ticket.description.toLowerCase().includes(search)
      )
    ) {
      return false;
    }

    return true;
  });
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
              <ArchiveTable
                tickets={filteredTickets}
                searchValue={filters.search}
                onSearchChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    search: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
