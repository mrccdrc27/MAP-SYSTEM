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
import UnassignedTable from "../../../tables/admin/UnassignedTable"; // New table for Unassigned
import TasksTable from "../../../tables/admin/TasksTable"; // Table for Active/Inactive

// hook
import useUserTickets from "../../../api/useUserTickets";
import useTasksFetcher from "../../../api/useTasksFetcher";
import useTicketsFetcher from "../../../api/useTicketsFetcher";

// modal
import TicketTaskAssign from "./modals/ActivateAgent";
import AddAgent from "../agent-page/modals/AddAgent";

export default function AdminArchive() {
  const {
    userTickets,
    loading: userTicketsLoading,
    error: userTicketsError,
  } = useUserTickets();
  const {
    tickets,
    fetchTickets,
    loading: ticketsLoading,
    error: ticketsError,
  } = useTicketsFetcher();
  const {
    tasks,
    fetchTasks,
    loading: tasksLoading,
    error: tasksError,
  } = useTasksFetcher();

  // Tabs
  const [activeTab, setActiveTab] = useState("Active");
  const [openAssignTicket, setOpenAssignTicket] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  // console.log("openAssignTicket:", openAssignTicket);
  // console.log("Tickets fetched by useTicketsFetcher:", tickets);


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

  // Fetch tickets and tasks on component mount
  useEffect(() => {
    fetchTickets();
    fetchTasks();
  }, [fetchTickets, fetchTasks]);

  // Extract all ticket data with step_instance_id
  const allTickets = (userTickets || [])
    .filter((entry) => entry.task?.ticket)
    .map((entry) => ({
      ...entry.task.ticket,
      step_instance_id: entry.step_instance_id,
      hasacted: entry.has_acted,
    }));

  // Extract status options on ticket update
  useEffect(() => {
    const statusSet = new Set(allTickets.map((t) => t.status).filter(Boolean));
    setStatusOptions(["All", ...Array.from(statusSet)]);
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

  // Filter tickets for the "Unassigned" tab
  const filteredTickets = (tickets || []).filter((ticket) => {
    if (activeTab === "Unassigned" && ticket.is_task_allocated !== false)
      return false;

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

  // Filter tasks for the "Active" and "Inactive" tabs
  const filteredTasks = (tasks || []).filter((task) => {
    if (
      activeTab === "Active" &&
      !["Open", "In Progress"].includes(task.ticket?.status)
    )
      return false;
    if (
      activeTab === "Inactive" &&
      !["Closed", "Resolved"].includes(task.ticket?.status)
    )
      return false;

    // Filter by category
    if (filters.category && task.ticket?.category !== filters.category)
      return false;

    // Filter by status
    if (filters.status && task.ticket?.status !== filters.status) return false;

    // Filter by date range
    const openedDate = new Date(task.ticket?.opened_on);
    const start = filters.startDate ? new Date(filters.startDate) : null;
    const end = filters.endDate ? new Date(filters.endDate) : null;
    if (start && openedDate < start) return false;
    if (end && openedDate > end) return false;

    // Filter by search
    const search = filters.search.toLowerCase();
    if (
      search &&
      !(
        task.ticket?.ticket_id?.toLowerCase().includes(search) ||
        task.ticket?.subject?.toLowerCase().includes(search) ||
        task.ticket?.description?.toLowerCase().includes(search)
      )
    ) {
      return false;
    }

    return true;
  });
  console.log("Filtered Tickets:", filteredTasks);
  const handleCloseModal = () => {
    setOpenActivateAgent(false);
    fetchUsers(); // refresh pendingInvite list after modal closes
  };

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
            {["Active", "Inactive", "Unassigned"].map((tab) => (
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
              {(userTicketsLoading || ticketsLoading || tasksLoading) && (
                <div className={styles.loaderOverlay}>
                  <div className={styles.loader}></div>
                </div>
              )}
              {activeTab === "All" && (
                <UnassignedTable
                  tickets={filteredTickets}
                  searchValue={filters.search}
                  onSearchChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      search: e.target.value,
                    }))
                  }
                  error={userTicketsError || ticketsError || tasksError}
                  activeTab={activeTab}
                />
              )}
              {(activeTab === "Active" || activeTab === "Inactive") && (
                <TasksTable
                  tickets={filteredTasks}
                  activeTab={activeTab}
                  error={tasksError}
                />
              )}
              {activeTab === "Unassigned" && (
                <UnassignedTable
                  tickets={filteredTickets}
                  error={ticketsError}
                  onInviteAgent={(ticket_id) => {
                    setSelectedTicketId(ticket_id);
                    setOpenAssignTicket(true);
                  }}
                />
              )}
            </div>
          </div>
        </section>
      </main>
      {openAssignTicket && (
        <TicketTaskAssign
          ticket_id={selectedTicketId}
          closeAssignTicket={() => setOpenAssignTicket(false)}
          closeActivateAgent={handleCloseModal}
        />
      )}
    </>
  );
}
