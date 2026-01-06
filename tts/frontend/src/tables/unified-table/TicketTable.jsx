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
  "Acted",
  "TICKET NO.",
  "TITLE",
  "DESCRIPTION",
  "PRIORITY",
  "STATUS",
  // "CATEGORY",
  "OPENED ON",
  "TARGET RESOLUTION",
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
  // console.log("id", item);
  
  const handleRowClick = () => {
    navigate(`/ticket/${item.ticket_number}`);
  };
  
  return (
    <tr className={`${general.item} ${general.clickableRow}`} onClick={handleRowClick}>
      <td>{item.hasacted ? "Has Acted" : "Not Yet"}</td>
      <td>{item.ticket_number}</td>
      <td>{item.subject}</td>
      <td className={general.descriptionCell} title={item.description}>
        {item.description}
      </td>
      <td>
        <div
          className={
            general[
              `priority-${
                item.priority ? item.priority.toLowerCase() : "unknown"
              }`
            ]
          }
        >
          {item.priority || "Unknown"}
        </div>
      </td>

      <td>
        <div
          className={
            general[
              `status-${
                item.status
                  ? item.status.replace(/\s+/g, "-").toLowerCase()
                  : "unknown"
              }`
            ]
          }
        >
          {item.status || "Unknown"}
        </div>
      </td>

      {/* <td>{item.category ? item.category : "Uncategorized"}</td> */}
      <td>
        {item.submit_date && !isNaN(new Date(item.submit_date))
          ? format(new Date(item.submit_date), "MMMM dd, yyyy")
          : "—"}
      </td>

      <td>
        {item.target_resolution && !isNaN(new Date(item.target_resolution))
          ? format(new Date(item.target_resolution), "EEEE, MMM d")
          : "—"}
      </td>

      <td>
        <button
          className={general.btnView}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/ticket/${item.ticket_number}`);
          }}
          title="View ticket details"
        >
          👁
        </button>
      </td>
    </tr>
  );
}

function SkeletonRow({ columns }) {
  return (
    <tr className={general.item}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className={general.skeletonCell}>
          <div
            className={`${general.skeleton} ${
              i === 1 ? general.skeletonSmall : ""
            }`}
          />
        </td>
      ))}
    </tr>
  );
}

export default function TicketTable({
  tickets = [],
  searchValue = "",
  onSearchChange,
  activeTab,
  loading = false,
}) {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTickets = tickets.slice(startIndex, endIndex);

  // 👇 Add this to inspect data
  // console.log("Fetched tickets:", JSON.stringify(tickets, null, 2));

   // 👇 Log the first item if it exists
  if (tickets.length > 0) {
    console.log("First ticket item:", tickets[0]);
  }


  return (
    <div className={general.ticketTableSection}>
      <div className={general.tableHeader}>
        <h2>
          {activeTab} ({tickets.length})
        </h2>
        <div className={general.tableActions}>
          <SearchBar value={searchValue} onChange={onSearchChange} />
        </div>
      </div>
      <div className={general.ticketTableWrapper}>
        <table className={general.ticketTable}>
          <thead>
            <TicketHeader />
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: pageSize }).map((_, idx) => (
                <SkeletonRow key={idx} columns={ticketHeaders.length} />
              ))
            ) : tickets.length > 0 ? (
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
