// style
import general from "../../style/general.module.css";

// components
import { SearchBar } from "../../components/component/General";
import Pagination from "../../components/component/Pagination";

// react
import { useState } from "react";
import ActivateAgent from "../../pages/admin/agent-page/modals/ActivateAgent";

// headers for the agent
const agentHeaders = ["", "NAME", "EMAIL", "ROLE", "STATUS", "ACTION"];

function AgentHeader() {
  return (
    <tr className={general.header}>
      {agentHeaders.map((header) => (
        <th key={header}>{header}</th>
      ))}
    </tr>
  );
}

function AgentItem({ item, onActivateClick }) {
  return (
    <tr className={general.item}>
      <td>
        <div className={general.img}>
          <img
            src={
              item.profile_picture ||
              "https://img.freepik.com/premium-vector/stylish-default-user-profile-photo-avatar-vector-illustration_664995-353.jpg"
            }
            alt="Agent"
          />
        </div>
      </td>
      {/* <td>{`${item.first_name} ${item.middle_name} ${item.last_name}`}</td> */}
      <td>
        {[item.first_name, item.middle_name, item.last_name]
          .filter(Boolean)
          .join(" ")}
      </td>

      <td>{item.email}</td>
      <td>{item.role}</td>
      <td>{item.is_active ? "🟢 Active" : "🔴 Inactive"}</td>
      <td>
        <button 
          className={general.btnEdit} 
          onClick={() => onActivateClick(item)}
          title="Edit agent"
        >
          ✏️
        </button>
      </td>
    </tr>
  );
}

export default function AgentTable({
  agents = [],
  searchValue = "",
  onSearchChange,
  activeTab,
  onInviteAgent,
  fetchUsers, // passed from parent
}) {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Modal state
  const [openActivateAgent, setOpenActivateAgent] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedAgents = agents.slice(startIndex, endIndex);

  const handleActivateClick = (agent) => {
    setSelectedAgent(agent);
    setOpenActivateAgent(true);
  };

  const handleCloseModal = () => {
    setOpenActivateAgent(false);
    setSelectedAgent(null);
    fetchUsers(); // refresh agents list after modal closes
  };

  return (
    <div className={general.ticketTableSection}>
      <div className={general.tableHeader}>
        <h2>
          {activeTab} ({agents.length})
        </h2>
        <div className={general.tableActions}>
          <SearchBar value={searchValue} onChange={onSearchChange} />
          <button className={general.addButton} onClick={onInviteAgent}>
            Invite Agent
          </button>
        </div>
      </div>
      <div className={general.ticketTableWrapper}>
        <table className={general.ticketTable}>
          <thead>
            <AgentHeader />
          </thead>
          <tbody>
            {agents.length > 0 ? (
              paginatedAgents.map((agent) => (
                <AgentItem
                  key={agent.id}
                  item={agent}
                  onActivateClick={handleActivateClick}
                />
              ))
            ) : (
              <tr>
                <td colSpan={agentHeaders.length} className={general.noData}>
                  No agents found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={general.ttPagination}>
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={agents.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {openActivateAgent && selectedAgent && (
        <ActivateAgent
          agent={selectedAgent}
          closeActivateAgent={handleCloseModal}
        />
      )}
    </div>
  );
}
