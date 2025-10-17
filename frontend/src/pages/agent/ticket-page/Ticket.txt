// components
import AgentNav from "../../../components/navigation/AgentNav";
import FilterPanel from "../../../components/component/FilterPanel";

// style
import styles from "./ticket.module.css";
import general from "../../../style/general.module.css";

// react
import { useEffect, useState } from "react";

// table
import TicketTable from "../../../tables/agent/TicketTable";

// axios
import axios from "axios";
import useUserTickets from "../../../api/useUserTickets";
import { useAuth } from "../../../api/AuthContext";

export default function AdminTicket() {
  const { userTickets, loading, error } = useUserTickets();
  // console.log(userTickets);

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

  // Status & Category Status
  const [statusOptions, setStatusOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);

  // Extract all ticket data with step_instance_id
  const allTickets = (userTickets || [])
    .filter((entry) => entry.task?.ticket)
    .map((entry) => ({
      ...entry.task.ticket,
      step_instance_id: entry.step_instance_id,
      hasacted: entry.has_acted,
    }));

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

  const filteredTickets = allTickets.filter((ticket) => {
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
      <main className={styles.ticketPage}>
        <section className={styles.tpHeader}>
          <h1>Tickets</h1>
        </section>
        <section className={styles.tpBody}>
          {/* Tabs */}
          <div className={styles.tpTabs}>
            {["All", "Critical", "High", "Medium", "Low", "Acted"].map((tab) => (
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
              categoryOptions={categoryOptions}
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
