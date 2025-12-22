// react
import { useState, useMemo, useEffect } from "react";
import useDebounce from "../../../utils/useDebounce";

// components
import AgentNav from "../../../components/navigation/AgentNav";
import FilterPanel from "../../../components/component/FilterPanel";

// style
import styles from "./archive.module.css";
import general from "../../../style/general.module.css";

// table
import ArchiveTable from "../../../tables/agent/ArchiveTable";

// hooks
import useUserTickets from "../../../api/useUserTickets";

export default function Archive() {
  const { userTickets, loading, error } = useUserTickets();

  // Filters
  const [filters, setFilters] = useState({
    category: "",
    status: "",
    startDate: "",
    endDate: "",
    search: "",
  });

  // Status & Category options
  const [statusOptions, setStatusOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);

  // Extract all ticket data with step_instance_id - only archived (acted) tickets
  const allTickets = useMemo(() => {
    return (userTickets || [])
      .filter((entry) => entry.has_acted)
      .map((entry) => ({
        // Map fields from flat entry structure
        ticket_id: entry.ticket_id,
        subject: entry.ticket_subject,
        description: entry.ticket_description,
        status: entry.status,
        priority: entry.priority || "Medium",
        category: entry.category || "",
        submit_date: entry.created_at,
        
        // Additional fields
        ticket_number: entry.ticket_number,
        workflow_id: entry.workflow_id,
        workflow_name: entry.workflow_name,
        current_step: entry.current_step,
        current_step_name: entry.current_step_name,
        current_step_role: entry.current_step_role,
        user_assignment: entry.user_assignment,
        task_id: entry.task_id,
        
        // Metadata
        step_instance_id: entry.task_id,
        hasacted: entry.has_acted,
      }));
  }, [userTickets]);

  // Fetch status and category options
  useEffect(() => {
    const statusSet = new Set();
    const categorySet = new Set();

    allTickets.forEach((t) => {
      if (t.status) statusSet.add(t.status);
      if (t.category) categorySet.add(t.category);
    });

    setStatusOptions([...Array.from(statusSet)]);
    setCategoryOptions([...Array.from(categorySet)]);
  }, [allTickets]);

  // Handle filter input
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      category: "",
      status: "",
      startDate: "",
      endDate: "",
      search: "",
    });
  };

  // Debounced search value
  const debouncedSearch = useDebounce(filters.search, 300);

  // Filter tickets
  const filteredTickets = useMemo(() => {
    return allTickets.filter((ticket) => {
      if (filters.category && ticket.category !== filters.category)
        return false;
      if (filters.status && ticket.status !== filters.status) return false;

      const openedDate = new Date(ticket.submit_date);
      const start = filters.startDate ? new Date(filters.startDate) : null;
      const end = filters.endDate ? new Date(filters.endDate) : null;
      if (start && openedDate < start) return false;
      if (end && openedDate > end) return false;

      const search = debouncedSearch.toLowerCase();
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
  }, [allTickets, filters, debouncedSearch]);

  return (
    <>
      <AgentNav />
      <main className={styles.archivePage}>
        <section className={styles.apHeader}>
          <h1>Archived Tickets</h1>
        </section>
        <section className={styles.apBody}>
          {/* Filters */}
          <div className={styles.apFilterSection}>
            <FilterPanel
              filters={filters}
              onFilterChange={handleFilterChange}
              categoryOptions={categoryOptions}
              statusOptions={statusOptions}
              onResetFilters={resetFilters}
            />
          </div>

          {/* Table */}
          <div className={styles.apTableSection}>
            <div className={general.tpTable}>
              {error && (
                <div className={styles.errorBanner}>
                  <p>Error loading archived tickets. Please try again.</p>
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
              />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
