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

// api
const ticketURL = import.meta.env.VITE_TICKET_API;

export default function Ticket() {
  // for tab
  const {tickets} = useUserTickets();
  console.log(tickets);
  const [activeTab, setActiveTab] = useState("All");

  // for filter states
  const [filters, setFilters] = useState({
    category: "",
    status: "",
    startDate: "",
    endDate: "",
    search: "",
  });

  // fetching states
  const [allTickets, setAllTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusOptions, setStatusOptions] = useState([]);

  // Fetch tickets from backend
  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(ticketURL);
        const fetchedTickets = res.data;

        setAllTickets(fetchedTickets);

        // extract status options
        const statusSet = new Set(
          fetchedTickets.map((t) => t.status).filter(Boolean)
        );
        setStatusOptions(["All", ...Array.from(statusSet)]);
      } catch (err) {
        console.error("Failed to fetch tickets:", err);
        setError("Failed to load tickets. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  // Handle tab change (priority)
  const handleTabClick = (e, tab) => {
    e.preventDefault();
    setActiveTab(tab);
  };

  // Handle input changes in FilterPanel
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle reset
  const resetFilters = () => {
    setFilters({
      category: "",
      status: "",
      startDate: "",
      endDate: "",
      search: "",
    });
  };

  // Filter tickets based on tab and filters
  const filteredTickets = allTickets.filter((ticket) => {
    // Filter by priority tab
    if (activeTab !== "All" && ticket.priority !== activeTab) return false;

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

    // Filter by search term
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
            {["All", "Critical", "High", "Medium", "Low"].map((tab) => (
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
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
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
