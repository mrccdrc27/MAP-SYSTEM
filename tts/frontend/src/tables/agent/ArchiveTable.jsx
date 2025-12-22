// style
import general from "../../style/general.module.css";

// components
import { SearchBar } from "../../components/component/General";
import Pagination from "../../components/component/Pagination";

// react
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { format } from "date-fns";

// headers for the table
const ticketHeaders = [
  "TICKET NO.",
  "TITLE",
  "DESCRIPTION",
  "PRIORITY",
  "TICKET STATUS",
  "TASK STATUS",
  "HAS ACTED",
  "OPENED ON",
  "ACTION",
];

function ArchiveHeader() {
  return (
    <tr className={general.header}>
      {ticketHeaders.map((header) => (
        <th key={header}>{header}</th>
      ))}
    </tr>
  );
}

function ArchiveItem({ item }) {
  const navigate = useNavigate();
  return (
    <tr className={general.item}>
      <td>{item.ticket_id}</td>
      <td>{item.subject}</td>
      {/* <td>{item.description}</td> */}
      <td className={general.descriptionCell} title={item.description}>
        {item.description}
      </td>
      <td>
        <div className={general[`priority-${item.priority.toLowerCase()}`]}>
          {item.priority}
        </div>
      </td>
      <td>
        <div
          className={
            general[`status-${item?.status.replace(/\s+/g, "-").toLowerCase()}`]
          }
        >
          {item?.status}
        </div>
      </td>
      <td>
        <div
          className={
            general[`status-${item?.task_status?.replace(/\s+/g, "-").toLowerCase() || "pending"}`]
          }
        >
          {item?.task_status || "Pending"}
        </div>
      </td>
      <td>
        <div className={general[`status-${item.hasacted ? "resolved" : "pending"}`]}>
          {item.hasacted ? "Has Acted" : "Not Yet"}
        </div>
      </td>
      <td>{format(new Date(item.submit_date), "MMMM dd, yyyy")}</td>
      <td>
        <button
          className={general.btn}
          onClick={() => navigate(`/agent/ticket/${item.step_instance_id}`)}
        >
          👁
        </button>
      </td>
    </tr>
  );
}

export default function ArchiveTable({
  tickets = [],
  searchValue = "",
  onSearchChange,
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
        <h2>Archive</h2>
        <div className={general.tableActions}>
          <SearchBar value={searchValue} onChange={onSearchChange} />
          {/* <button className={general.exportButton}>Export</button> */}
        </div>
      </div>
      <div className={general.ticketTableWrapper}>
        <table className={general.ticketTable}>
          <thead>
            <ArchiveHeader />
          </thead>
          <tbody>
            {tickets.length > 0 ? (
              paginatedTickets.map((ticket) => (
                <ArchiveItem key={ticket.id} item={ticket} />
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
      </div>
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
