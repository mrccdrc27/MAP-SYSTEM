// style
import general from "../../style/general.module.css";

// components
import { SearchBar } from "../../components/component/General";
import Pagination from "../../components/component/Pagination";

// react
import { useNavigate } from "react-router-dom";
import { useState } from "react";

// headers for the table
const ticketHeaders = [
  "TICKET NO.",
  "TITLE",
  "DESCRIPTION",
  "PRIORITY",
  "STATUS",
  "OPENED ON",
  "ACTION",
];

function TicketHeader() {
  return (
    <tr className={general.header}>
      {ticketHeaders.map((header) => (
        <th key={header}>{header}</th>
      ))}
    </tr>
  );
}

function TicketItem({ item }) {
  const navigate = useNavigate();
  return (
    <tr className={general.item}>
      <td>{item.ticket_id}</td>
      <td>{item.subject}</td>
      <td>{item.description}</td>
      {/* <td>{item.priority}</td> */}
      <td>
        <div className={general[`priority-${item.priority.toLowerCase()}`]}>
          {item.priority}
        </div>
      </td>
      <td>{item.status}</td>
      <td>{item.opened_on}</td>
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

export default function TicketTable({
  tickets = [],
  searchValue = "",
  onSearchChange,
  activeTab,
}) {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTickets = tickets.slice(startIndex, endIndex);

  return (
    <div className={general.ticketTableSection}>
      <div className={general.tableHeader}>
        <h2>{activeTab} ({tickets.length})</h2>
        <div className={general.tableActions}>
          <SearchBar value={searchValue} onChange={onSearchChange} />
          <button className={general.exportButton}>Export</button>
        </div>
      </div>
      <table className={general.ticketTable}>
        <thead>
          <TicketHeader />
        </thead>
        <tbody>
          {tickets.length > 0 ? (
            paginatedTickets.map((ticket) => (
              <TicketItem key={ticket.id} item={ticket} />
            ))
          ) : (
            <tr>
              <td colSpan={ticketHeaders.length} className={general.noData}>
                No tickets found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className={general.ttPagination}>
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={tickets.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
