  // style
  import general from "../../style/general.module.css";

  // components
  import { SearchBar } from "../../components/component/General";
  import Pagination from "../../components/component/Pagination";

  // react
  import { useState } from "react";
  import ActivateAgent from "../../pages/admin/agent-page/modals/ActivateAgent";

  // headers for the agent
  const agentHeaders = ["EMAIL", "ROLE", "ACTION"];

  function AgentHeader() {
    return (
      <tr className={general.header}>
        {agentHeaders.map((header) => (
          <th key={header}>{header}</th>
        ))}
      </tr>
    );
  }

  function AgentItem({ item, onDeleteClick }) {
    return (
      <tr className={general.item}>
        <td>{item.email}</td>
        <td>{item.role}</td>
        <td>
          <button className={general.btn} onClick={() => onDeleteClick(item)}>
            👁
          </button>
        </td>
      </tr>
    );
  }

  export default function InviteTable({
    pendingInvite = [],
    searchValue = "",
    onSearchChange,
    activeTab,
    onInviteAgent,
    fetchUsers, // passed from parent
    onDeleteClick, // add this
  }) {
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);

    // Modal state
    const [openActivateAgent, setOpenActivateAgent] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null);

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedAgents = pendingInvite.slice(startIndex, endIndex);

    const handleToggleDelete = (agent) => {
      const confirmed = window.confirm(`Are you sure you want to delete the invite for ${agent.email}?`);
      if (confirmed) {
        onDeleteClick(agent);
      }
    };

    const handleCloseModal = () => {
      setOpenActivateAgent(false);
      setSelectedAgent(null);
      fetchUsers(); // refresh pendingInvite list after modal closes
    };

    return (
      <div className={general.ticketTableSection}>
        <div className={general.tableHeader}>
          <h2>
            {activeTab} ({pendingInvite.length})
          </h2>
          <div className={general.tableActions}>
            <SearchBar value={searchValue} onChange={onSearchChange} />
            <button className={general.addButton} onClick={onInviteAgent}>
              Invite Agent
            </button>
          </div>
        </div>

        <table className={general.ticketTable}>
          <thead>
            <AgentHeader />
          </thead>
          <tbody>
            {pendingInvite.length > 0 ? (
              paginatedAgents.map((agent) => (
                <AgentItem
                  key={agent.id}
                  item={agent}
                  onDeleteClick={handleToggleDelete}
                />
              ))
            ) : (
              <tr>
                <td colSpan={agentHeaders.length} className={general.noData}>
                  No pendingInvite found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className={general.ttPagination}>
          <Pagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={pendingInvite.length}
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
