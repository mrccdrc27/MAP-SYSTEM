// styles
import styles from "./agent.module.css";
import general from "../../../style/general.module.css";

// components
import AdminNav from "../../../components/navigation/AdminNav";

// modals
import AddAgent from "./modals/AddAgent";

// api
const agentURL = import.meta.env.VITE_AGENTS_API;

// react
import { useEffect, useState } from "react";

// table
import AgentTable from "../../../tables/admin/AgentTable";

// axios
import axios from "axios";

export default function Agent() {
  // open ticket action modal
  const [openAddAgent, setOpenAddAgent] = useState(false);

  // for tab
  const [activeTab, setActiveTab] = useState("All");

  // for filter states
  const [filters, setFilters] = useState({
    search: "",
  });

  // fetching states
  const [allAgents, setAllAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusOptions, setStatusOptions] = useState([]);

  // Fetch tickets from backend
  useEffect(() => {
    const fetchAgents = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(agentURL);
        const fetchedAgents = res.data;

        setAllAgents(fetchedAgents);

        // extract status options
        const statusSet = new Set(
          fetchedAgents.map((a) => a.Status).filter(Boolean)
        );

        setStatusOptions(["All", ...Array.from(statusSet)]);
      } catch (err) {
        console.error("Failed to fetch agents:", err);
        setError("Failed to load agents. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  // Handle tab change (priority)
  const handleTabClick = (e, tab) => {
    e.preventDefault();
    setActiveTab(tab);
  };

  // Filter tickets based on tab and filters
  const filteredAgents = allAgents.filter((agent) => {
    // Filter by priority tab
    if (activeTab !== "All" && agent.Status !== activeTab) return false;

    // Filter by search term
    const search = filters.search.toLowerCase();
    if (
      search &&
      !(
        agent.Name.toLowerCase().includes(search) ||
        agent.Email.toLowerCase().includes(search) ||
        agent.Role.toLowerCase().includes(search)
      )
    ) {
      return false;
    }

    return true;
  });

  return (
    <>
      <AdminNav />
      <main className={styles.agentPage}>
        <section className={styles.apHeader}>
          <h1>Agent</h1>
        </section>
        <section className={styles.apBody}>
          {/* Tabs */}
          <div className={styles.tpTabs}>
            {["All", "Active", "Pending", "Suspended"].map((tab) => (
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
          <div className={styles.tpTableSection}>
            <div className={general.tpTable}>
              {loading && (
                <div className={styles.loaderOverlay}>
                  <div className={styles.loader}></div>
                </div>
              )}
              <AgentTable
                agents={filteredAgents}
                searchValue={filters.search}
                onSearchChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                error={error}
                activeTab={activeTab}
                onInviteAgent={() => setOpenAddAgent(true)}
              />
            </div>
          </div>
        </section>
      </main>
      {openAddAgent && <AddAgent closeAddAgent={() => setOpenAddAgent(false)}/>}
    </>
  );
}
