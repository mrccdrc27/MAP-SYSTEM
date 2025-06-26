// components
import AdminNav from "../../../components/navigation/AdminNav";
import FilterPanel from "../../../components/component/FilterPanel";

// style
import styles from "./admin-archive.module.css";
import general from "../../../style/general.module.css";

// react
import { useEffect, useState } from "react";

// table
import TicketTable from "../../../tables/admin/TicketTable";

// hook
import useUserTickets from "../../../api/useUserTickets";
import useFetchActionLogs from "../../../api/workflow-graph/useActionLogs";
import useTicketsFetcher from "../../../api/useTickets";

export default function AdminArchive() {
  const { userTickets, loading, error } = useUserTickets();
  const {tickets, fetchTickets } = useTicketsFetcher();

  

  // Tabs
  const [activeTab, setActiveTab] = useState("All");

  // Filters
  const [filters, setFilters] = useState({
    category: "",
    status: "",
    startDate: "",
    endDate: "",
    search: "",
  });

  // Status options
  const [statusOptions, setStatusOptions] = useState([]);
  const [fetchedTickets, setFetchedTickets] = useState();




  // Extract all ticket data with step_instance_id
  const allTickets = (userTickets || [])
    .filter((entry) => entry.task?.ticket)
    .map((entry) => ({
      ...entry.task.ticket,
      step_instance_id: entry.step_instance_id, // ✅ attach here
      hasacted: entry.has_acted, // ✅ attach here
    }));
  
  // Extract status options on ticket update
  useEffect(() => {
    const statusSet = new Set(
      allTickets.map((t) => t.status).filter(Boolean)
    );
    setStatusOptions(["All", ...Array.from(statusSet)]);
    fetchTickets();
  }, [userTickets]);

  // Handle tab click
  const handleTabClick = (e, tab) => {
    e.preventDefault();
    setActiveTab(tab);
  };

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

  // Filter tickets
  const filteredTickets = tickets.filter((ticket) => {
    // Filter by tab
    if (activeTab === "Unassigned" && ticket.is_task_allocated !== false) return false;

    if (activeTab === "Active" && !["Open", "In Progress"].includes(ticket.status)) return false;

    if (activeTab === "Inactive" && !["Closed", "Resolved"].includes(ticket.status)) return false;

    if (activeTab !== "All" && activeTab !== "Unassigned" && activeTab !== "Active" && activeTab !== "Inactive" && ticket.priority !== activeTab) return false;

    // Filter by category
    if (filters.category && ticket.category !== filters.category) return false;

    // Filter by status
    if (filters.status && ticket.status !== filters.status) return false;

    // Filter by date range
    const openedDate = new Date(ticket.opened_on);
    const start = filters.startDate ? new Date(filters.startDate) : null;
    const end = filters.endDate ? new Date(filters.endDate) : null;
    if (start && openedDate < start) return false;
    if (end && openedDate > end) return false;

    // Filter by search
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
      <AdminNav />
      <main className={styles.ticketPage}>
        <section className={styles.tpHeader}>
          <h1>Tickets</h1>
        </section>
        <section className={styles.tpBody}>
          {/* Tabs */}
          <div className={styles.tpTabs}>
            {["All", "Active", "Inactive", "Unassigned"].map((tab) => (
              <a
                key={tab}
                href=""
                onClick={(e) => handleTabClick(e, tab)}
                className={`${styles.tpTabLink} ${
                  activeTab === tab ? styles.active : ""
                }`}
              >
                {tab}
              </a>
            ))}
          </div>

          {/* Filters */}
          <div className={styles.tpFilterSection}>
            <FilterPanel
              filters={filters}
              onFilterChange={handleFilterChange}
              statusOptions={statusOptions}
              onResetFilters={resetFilters}
            />
          </div>

          {/* Table */}
          <div className={styles.tpTableSection}>
            <div className={general.tpTable}>
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
