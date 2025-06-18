// styles
import table from "./ticket-table.module.css";
import general from "../styles/general-table-styles.module.css";

// api
import useUserTickets from "../../api/useUserTickets";

// react
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

// components
import { Dropdown, SearchBar, Datetime } from "../components/General";
import Pagination from "../components/Pagination";

export function TicketHeader() {
  return (
    <tr className={general.header}>
      <th className={general.th}>Ticket No.</th>
      <th className={general.th}>Subject</th>
      <th className={general.th}>Customer</th>
      <th className={general.th}>Priority</th>
      <th className={general.th}>Opened On</th>
      <th className={general.th}>SLA</th>
      <th className={general.th}>Status</th>
      <th className={general.th}>Action</th>
    </tr>
  );
}

export function TicketItem({ ticket }) {
  const data = ticket.task.ticket;
  return (
    <tr className={general.item}>
      <td className={general.ticketID}>{data.ticket_id}</td>
      <td className={general.ticketSubject}>{data.subject}</td>
      <td className={general.tickeCustomer}>{data.customer}</td>
      <td>
        <div className={general[`priority-${data.priority.toLowerCase()}`]}>
          {data.priority}
        </div>
      </td>
      <td className={general.ticketOpenedOn}>{data.opened_on}</td>
      <td className={general.ticketSLA}>{data.sla}</td>
      <td>
        <div
          className={
            general[
              `status-${data.status.replace(/\s+/g, "-").toLowerCase()}`
            ]
          }
        >
          {data.status}
        </div>
      </td>
      <td className={general.ticketButton}>
        <Link to={`/agent/ticket/${data.id}`} state={{ ticket }}>
          <button className={general.viewButton}>View</button>
        </Link>
      </td>
    </tr>
  );
}

export default function TicketTable() {
  const { tickets, loading, error } = useUserTickets();

  // Priority
  const [priorityOptions, setPriorityOptions] = useState([]);
  const [selectedPriority, setSelectedPriority] = useState("");

  // Status
  const [statusOptions, setStatusOptions] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("");

  // Searchbar
  const [searchTerm, setSearchTerm] = useState("");

  // Datetime
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Filter Section
  const [showFilter, setShowFilter] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [totalPages, setTotalPages] = useState(1);

  // Extract filters when tickets change
  useEffect(() => {
    if (tickets.length > 0) {
      const priorities = [
        ...new Set(tickets.map((t) => t.task.ticket.priority)),
      ];
      setPriorityOptions(priorities);

      const statuses = [
        ...new Set(tickets.map((t) => t.task.ticket.status)),
      ];
      setStatusOptions(statuses);
    }
  }, [tickets]);

  const filteredTickets = tickets.filter((item) => {
    const ticket = item.task.ticket;
    const priorityMatch =
      !selectedPriority || ticket.priority === selectedPriority;
    const statusMatch = !selectedStatus || ticket.status === selectedStatus;
    const searchMatch =
      !searchTerm ||
      ticket.ticket_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.customer.toLowerCase().includes(searchTerm.toLowerCase());
    const dateMatch =
      (!startDate || ticket.opened_on >= startDate) &&
      (!endDate || ticket.opened_on <= endDate);

    return priorityMatch && statusMatch && searchMatch && dateMatch;
  });

  // Pagination
  useEffect(() => {
    setTotalPages(Math.ceil(filteredTickets.length / itemsPerPage));
  }, [filteredTickets]);

  const currentTickets = filteredTickets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Early return if loading or error
  if (loading) return <div>Loading tickets...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className={table.ticketTable}>
      {showFilter && (
        <div className={table.ticketTableLeft}>
          <div className={table.headerSection}>
            <div className={table.title}>Filter</div>
            <button
              className={table.resetButton}
              onClick={() => {
                setSelectedPriority("");
                setSelectedStatus("");
                setStartDate("");
                setEndDate("");
              }}
            >
              Reset
            </button>
          </div>

          <div className={table.filterSection}>
            <div className={table.title}>Priority</div>
            <Dropdown
              name="priority"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              options={priorityOptions}
              placeholder="Filter by Priority"
            />
          </div>

          <div className={table.filterSection}>
            <div className={table.title}>Status</div>
            <Dropdown
              name="status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              options={statusOptions}
              placeholder="Filter by Status"
            />
          </div>

          <div className={table.filterSection}>
            <div className={table.dateTime}>
              <div className={table.title}>Start Date</div>
              <Datetime
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                name="start-date"
              />
            </div>
            <div className={table.dateTime}>
              <div className={table.title}>End Date</div>
              <Datetime
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                name="end-date"
              />
            </div>
          </div>
        </div>
      )}

      <div className={table.ticketTableRight}>
        <div className={table.filterWrapper}>
          <div
            className={table.filterIcon}
            onClick={() => setShowFilter((prev) => !prev)}
            title={showFilter ? "Hide Filter" : "Show Filter"}
          >
            <i className="fa-solid fa-filter"></i>
          </div>
          <div className={table.searchBar}>
            <SearchBar
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className={general.ticketTableWrapper}>
          <table className={general.ticketPageTable}>
            <thead>
              <TicketHeader />
            </thead>
            <tbody>
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan="8" className={general.noTicketsMessage}>
                    There is no ticket on the list
                  </td>
                </tr>
              ) : (
                currentTickets.map((ticket) => (
                  <TicketItem
                    key={ticket.task.ticket.ticket_id}
                    ticket={ticket}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
        />
      </div>
    </div>
  );
}
