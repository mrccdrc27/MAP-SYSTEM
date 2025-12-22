// styles
import styles from "./agent.module.css";
import general from "../../../style/general.module.css";

// components
import AdminNav from "../../../components/navigation/AdminNav";
import AddAgent from "./modals/AddAgent";
import AgentTable from "../../../tables/admin/AgentTable";
import InviteTable from "../../../tables/admin/InviteTable";

// react
import { useEffect, useState } from "react";

// api
import useUsersApi from "../../../api/useUsersApi";
import { useInviteManager } from "../../../api/useInviteManager";

export default function Agent() {
  // States
  const [openAddAgent, setOpenAddAgent] = useState(false);
  const [activeTab, setActiveTab] = useState("All");
  const [filters, setFilters] = useState({ search: "" });
  const [allAgents, setAllAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingInvite, setPendingInvite] = useState([]);

  // API Calls
  const { users, fetchUsers, activateUser } = useUsersApi();
  const { pending, fetchPendingInvites, deleteInvite} = useInviteManager();
  
  console.log("Users:", users);

  useEffect(() => {
    setAllAgents(users);
    setPendingInvite(pending)
  }, [users, pending]);

  const handleToggleActive = async (agent) => {
    await activateUser(agent.id, !agent.is_active);
    fetchUsers();
  };

  const handleToggleDelete = async (agent) => {
    const confirmed = window.confirm(`Delete invite for ${agent.email}?`);
    if (!confirmed) return;
  
    await deleteInvite(agent.id);
    fetchPendingInvites();
  };
  

  const handleTabClick = (e, tab) => {
    e.preventDefault();
    setActiveTab(tab);
  };



  // Filter Agent Block
  const filteredAgents = allAgents.filter((agent) => {
    if (activeTab === "Active" && !agent.is_active) return false;
    if (activeTab === "Inactive" && agent.is_active) return false;
  
    const search = (filters.search || "").toLowerCase();
    
    const fullName = [agent.first_name, agent.middle_name, agent.last_name]
    .filter(Boolean)
    .join(" ");
  
    const email = (agent.email || "").toLowerCase();
    const role = (agent.role_name || "").toLowerCase(); // ✅ fixed here
  
    return (
      !search ||
      fullName.includes(search) ||
      email.includes(search) ||
      role.includes(search)
    );
  });
  

  const sharedProps = {
    agents: filteredAgents,
    pendingInvite,
    searchValue: filters.search,
    onSearchChange: (e) =>
      setFilters((prev) => ({ ...prev, search: e.target.value })),
    error,
    activeTab,
    onInviteAgent: () => setOpenAddAgent(true),
    onActivateClick: handleToggleActive,
    onDeleteClick: handleToggleDelete,
    fetchUsers,
  };

  return (
    <>
      <AdminNav />
      <main className={styles.agentPage}>
        <section className={styles.apHeader}>
          <h1>Agent</h1>
        </section>

        <section className={styles.apBody}>
          <div className={styles.tpTabs}>
            {["All", "Active", "Inactive", "Invite"].map((tab) => (
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
              {activeTab === "Invite" ? (
                <InviteTable {...sharedProps} />
              ) : (
                <AgentTable {...sharedProps} />
              )}
            </div>
          </div>
        </section>
      </main>

      {openAddAgent && <AddAgent closeAddAgent={() => setOpenAddAgent(false)} />}
    </>
  );
}
