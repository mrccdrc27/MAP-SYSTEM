// react
import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

// components
import AgentNav from "../../../components/navigation/AgentNav";

// style
import styles from "./archive.module.css";
import general from "../../../style/general.module.css";

// table
import ArchiveTable from "../../../tables/agent/ArchiveTable";

// hook
import useUserTickets from "../../../api/useUserTickets";
import useDebounce from "../../../utils/useDebounce";

export default function Archive() {
  const { userTickets, loading, error } = useUserTickets();

  // Filters
  const [filters, setFilters] = useState({
    search: "",
  });

  // Extract all ticket data with step_instance_id
  const allTickets = useMemo(() => {
    return (userTickets || []).map((entry) => ({
      // Map fields from flat entry structure
      ticket_id: String(entry.ticket_id ?? entry.ticket_number ?? ""),
      subject: String(entry.ticket_subject ?? ""),
      description: String(entry.ticket_description ?? ""),
      status: entry.status,
      task_status: entry.task_status,
      priority: entry.priority || "Medium",
      category: entry.category || "",
      submit_date: entry.created_at,

      // Additional fields from endpoint
      ticket_number: entry.ticket_number,
      workflow_id: entry.workflow_id,
      workflow_name: entry.workflow_name,
      current_step: entry.current_step,
      current_step_name: entry.current_step_name,
      current_step_role: entry.current_step_role,
      user_assignment: entry.user_assignment,
      task_id: entry.task_id,

      // Metadata
      step_instance_id: entry.task_id, // Use task_id as step_instance_id for navigation
      hasacted: entry.has_acted,
    }));
  }, [userTickets]);

  // Debounced search value
  const debouncedSearch = useDebounce(filters.search, 300);

  // Filter tickets
  const filteredTickets = useMemo(() => {
    return allTickets.filter((ticket) => {
      const search = (debouncedSearch || "").toLowerCase();
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
  }, [allTickets, debouncedSearch]);

  return (
    <>
      <AgentNav />
      <main className={styles.ticketPage}>
        <section className={styles.tpHeader}>
          <h1>Archive</h1>
        </section>
        <section className={styles.tpBody}>
          {/* Filters */}
          <div className={styles.tpFilterSection}>
            {/* Simplified - removed filter panel for archive */}
          </div>

          {/* Table */}
          <div className={styles.tpTableSection}>
            <div className={general.tpTable}>
              {error && (
                <div className={styles.errorBanner}>
                  <p>Error loading tickets. Please try again.</p>
                </div>
              )}
              {loading && (
                <div className={styles.loaderOverlay}>
                  <div className={styles.loader}></div>
                </div>
              )}
              <ArchiveTable
                tickets={filteredTickets}
                searchValue={filters.search}
                onSearchChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    search: e.target.value,
                  }))
                }
                error={error}
              />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
