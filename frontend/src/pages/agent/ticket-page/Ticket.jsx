// react
import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

// components
import AgentNav from "../../../components/navigation/AgentNav";
import FilterPanel from "../../../components/component/FilterPanel";

// style
import styles from "./ticket.module.css";
import general from "../../../style/general.module.css";

// table
import TicketTable from "../../../tables/agent/TicketTable";

// hook
import useUserTickets from "../../../api/useUserTickets";
import useDebounce from "../../../utils/useDebounce";

export default function Ticket() {
  const { userTickets, loading, error } = useUserTickets();
  // Tabs with URL sync
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab") || "All";
  const [activeTab, setActiveTab] = useState(urlTab);

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
    return (userTickets || [])
      .map((entry) => ({
        // Map fields from flat entry structure
        ticket_id: entry.ticket_id,
        subject: entry.ticket_subject,
        description: entry.ticket_description,
        status: entry.status,
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
  }, [allTickets]);

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
      if (filters.category && ticket.category !== filters.category) return false;
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
  }, [allTickets, filters, activeTab, debouncedSearch]);

  return (
    <>
      <AgentNav />
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
              {loading && (
                <div className={styles.loaderOverlay}>
                  <div className={styles.loader}></div>
                </div>
              )}
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
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
