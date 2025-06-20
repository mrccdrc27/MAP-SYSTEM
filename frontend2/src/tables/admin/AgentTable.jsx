// style
import general from "../../style/general.module.css";

// components
import { SearchBar } from "../../components/component/General";
import Pagination from "../../components/component/Pagination";

// react
import { useNavigate } from "react-router-dom";
import { useState } from "react";

// headers for the agent
const agentHeaders = [
  "",
  "NAME",
  "EMAIL",
  "ROLE",
  "STATUS",
  "LAST LOGIN",
  "ACTION",
];

function AgentHeader() {
  return (
    <tr className={general.header}>
      {agentHeaders.map((header) => (
        <th key={header}>{header}</th>
      ))}
    </tr>
  );
}

function AgentItem({ item }) {
  const navigate = useNavigate();
  return (
    <tr className={general.item}>
      <td>
        <div className={general.img}>
          <img src={item.ImageURL} alt="" />
        </div>
      </td>
      <td>{item.Name}</td>
      <td>{item.Email}</td>
      <td>{item.Role}</td>
      <td>{item.Status}</td>
      <td>{item.LastLogin}</td>
      <td>
        <button
          className={general.btn}
          onClick={() => navigate(`/agent/ticket/${item.id}`)}
        >
          👁
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
}) {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTickets = agents.slice(startIndex, endIndex);

  return (
    <div className={general.ticketTableSection}>
      <div className={general.tableHeader}>
        <h2>{activeTab} ({agents.length})</h2>
        <div className={general.tableActions}>
          <SearchBar value={searchValue} onChange={onSearchChange} />
          <button className={general.addButton} onClick={onInviteAgent}>Invite Agent</button>
        </div>
      </div>
      <table className={general.ticketTable}>
        <thead>
          <AgentHeader />
        </thead>
        <tbody>
          {agents.length > 0 ? (
            paginatedTickets.map((agent) => (
              <AgentItem key={agent.ID} item={agent} />
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
      <div className={general.ttPagination}>
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={agents.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
