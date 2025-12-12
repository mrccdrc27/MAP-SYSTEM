// react
import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import useDebounce from "../../../utils/useDebounce";
import TableSkeleton from "../../../components/skeleton/TableSkeleton";

// components
import Nav from "../../../components/navigation/Nav";
import FilterPanel from "../../../components/component/FilterPanel";

// style
import styles from "./ticket.module.css";
import general from "../../../style/general.module.css";

// table
import TicketTable from "../../../tables/unified-table/TicketTable";

// hook
import useUserTickets from "../../../api/useUserTickets";

export default function Ticket() {
  // Tabs with URL sync
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab") || "All";
  const [activeTab, setActiveTab] = useState(urlTab);

  const debouncedActiveTab = useDebounce(activeTab, 500);
  const { userTickets, loading, error } = useUserTickets(debouncedActiveTab);

  // log first ticket for debugging
  // console.log("First Ticket:", JSON.stringify(userTickets?.[0], null, 2));

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

  // Extract all ticket data with step_instance_id
  const allTickets = useMemo(() => {
    return (userTickets || []).map((entry) => ({
      ticket_id: String(entry.ticket_id ?? entry.ticket_number ?? ""),
      subject: String(entry.ticket_subject ?? ""),
      description: String(entry.ticket_description ?? ""),
      status: entry.status,
      priority: entry.ticket_priority,
      category: entry.category || "Uncategorized",
      submit_date: entry.assigned_on,

      // TaskItem core fields
      task_item_id: entry.task_item_id,
      user_id: entry.user_id,
      user_full_name: entry.user_full_name,
      role: entry.role,
      task_id: entry.task_id,
      assigned_on: entry.assigned_on,
      status_updated_on: entry.status_updated_on,
      acted_on: entry.acted_on,
      target_resolution: entry.target_resolution,
      notes: entry.notes,

      // Ticket fields
      ticket_number: entry.ticket_number,

      // Workflow fields
      workflow_id: entry.workflow_id,
      workflow_name: entry.workflow_name,

      // Step fields
      current_step_id: entry.current_step_id,
      current_step_name: entry.current_step_name,
      current_step_role: entry.current_step_role,
      acted_on_step_id: entry.acted_on_step_id,
      acted_on_step_name: entry.acted_on_step_name,

      // Task status
      task_status: entry.task_status,

      // Metadata
      step_instance_id: entry.task_id, // Use task_id as identifier
      hasacted: entry.status === "resolved" || entry.status === "escalated" || entry.status === "reassigned",
    }));
  }, [userTickets]);

  // fetch status and category
  useEffect(() => {
    const statusSet = new Set();
    const categorySet = new Set();

    allTickets.forEach((t) => {
      if (t.status) statusSet.add(t.status);
      if (t.category) categorySet.add(t.category);
    });

    setStatusOptions([...Array.from(statusSet)]);
    setCategoryOptions([...Array.from(categorySet)]);
  }, [userTickets]);

  // Sync tab to URL
  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

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
      if (activeTab === "Acted") {
        return ticket.hasacted === true;
      }

      // Exclude acted tickets from other tabs
      if (ticket.hasacted === true) return false;

      if (activeTab !== "All" && ticket.priority !== activeTab) return false;
      if (filters.category && ticket.category !== filters.category)
        return false;
      if (filters.status && ticket.status !== filters.status) return false;

      const openedDate = new Date(ticket.submit_date);
      const start = filters.startDate ? new Date(filters.startDate) : null;
      const end = filters.endDate ? new Date(filters.endDate) : null;
      if (start && openedDate < start) return false;
      if (end && openedDate > end) return false;

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
  }, [allTickets, filters, activeTab, debouncedSearch]);

  return (
    <>
      <Nav />
      <main className={styles.ticketPage}>
        <section className={styles.tpHeader}>
          <h1>Tickets</h1>
        </section>
        <section className={styles.tpBody}>
          {/* Tabs */}
          <div className={styles.tpTabs}>
            {["All", "Critical", "High", "Medium", "Low", "Acted"].map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`${styles.tpTabLink} ${
                    activeTab === tab ? styles.active : ""
                  }`}
                  type="button"
                >
                  {tab}
                </button>
              )
            )}
          </div>

          {/* Filters */}
          <div className={styles.tpFilterSection}>
            <FilterPanel
              filters={filters}
              onFilterChange={handleFilterChange}
              categoryOptions={categoryOptions}
              statusOptions={statusOptions}
              onResetFilters={resetFilters}
            />
          </div>

          {/* Table */}
          <div className={styles.tpTableSection}>
            <div className={general.tpTable}>
              {error && (
                <div className={styles.errorBanner}>
                  <p>Error loading tickets. Please try again.</p>
                </div>
              )}

              {loading ? (
                <TableSkeleton rows={8} columns={6} />
              ) : (
                <TicketTable
                  tickets={filteredTickets}
                  searchValue={filters.search}
                  onSearchChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      search: e.target.value,
                    }))
                  }
                  error={error}
                  activeTab={activeTab}
                />
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
