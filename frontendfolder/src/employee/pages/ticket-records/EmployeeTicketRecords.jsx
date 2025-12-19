// Normalize ticket data to handle both backend field names (snake_case) and frontend (camelCase)
function normalizeTicket(ticket) {
  return {
    ...ticket,
    ticketNumber: ticket.ticket_number || ticket.ticketNumber,
    subCategory: ticket.sub_category || ticket.subCategory,
    dateCreated: ticket.submit_date || ticket.dateCreated || ticket.createdAt || ticket.created_at || null,
    priorityLevel: ticket.priority || ticket.priorityLevel,
    assignedTo: ticket.assigned_to || ticket.assignedTo,
  };
}
import { useEffect, useMemo, useState } from "react";
import { useAuth } from '../../../context/AuthContext';
import { useParams, useNavigate } from "react-router-dom";
import { backendTicketService } from "../../../services/backend/ticketService";
import { toEmployeeStatus } from "../../../utilities/helpers/statusMapper";
import authService from "../../../utilities/service/authService";
import getTicketActions from "../../../shared/table/TicketActions";
import Skeleton from "../../../shared/components/Skeleton/Skeleton";

import TablePagination from "../../../shared/table/TablePagination";
import EmployeeTicketFilter, { TICKET_RECORD_STATUS_OPTIONS } from "../../components/filters/EmployeeTicketFilter";
import styles from './EmployeeTicketRecords.module.css';
import InputField from '../../../shared/components/InputField';

const headingMap = {
  "all-ticket-records": "All Ticket Records",
  "closed-ticket-records": "Closed Tickets",
  "rejected-ticket-records": "Rejected Tickets",
  "withdrawn-ticket-records": "Withdrawn Tickets",
};

const statusMap = {
  "all-ticket-records": ["Closed", "Rejected", "Withdrawn"],
  "closed-ticket-records": ["Closed"],
  "rejected-ticket-records": ["Rejected"],
  "withdrawn-ticket-records": ["Withdrawn"],
};

// TableHeader component
function TableHeader() {
  return (
    <tr>
      <th>Ticket No.</th>
      <th>Subject</th>
      <th>Status</th>
      <th>Priority</th>
      <th>Category</th>
      <th>Sub Category</th>
      <th>Date Created</th>
      <th>Actions</th>
    </tr>
  );
}

// TableItem component
function TableItem({ ticket, onView }) {
  // Convert status to employee view for display (though Closed/Rejected/Withdrawn are same for both)
  const displayStatus = toEmployeeStatus(ticket.status);
  
  return (
    <tr>
      <td>{ticket.ticketNumber}</td>
      <td>
        <div className={styles.subjectCell} title={ticket.subject}>
          {ticket.subject}
        </div>
      </td>
      <td>
        <div className={`${styles.status} ${styles[`status-${displayStatus.replace(/\s+/g, "-").toLowerCase()}`]}`}>
          {displayStatus}
        </div>
      </td>
      <td>
        {ticket.priorityLevel ? (
          <div className={`${styles.priority} ${styles[`priority-${ticket.priorityLevel.toLowerCase()}`]}`}>
            {ticket.priorityLevel}
          </div>
        ) : (
          <div className={`${styles.priority} ${styles['priority-not-set']}`}>
            Not Set
          </div>
        )}
      </td>
      <td>{ticket.category}</td>
      <td>{ticket.subCategory}</td>
      <td>{ticket.dateCreated?.slice(0, 10)}</td>
      <td>
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          {getTicketActions("view", ticket, { onView })}
        </div>
      </td>
    </tr>
  );
}

const EmployeeTicketRecords = () => {
  const { filter = "all-ticket-records" } = useParams();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [allTickets, setAllTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const normalizedFilter = filter.replace("-ticket-records", "").toLowerCase();

  // Current logged-in user from AuthContext
  const { user: currentUser } = useAuth();

  // Fetch current employee's ticket records from backend
  useEffect(() => {
    const timer = setTimeout(() => {
      backendTicketService.getTicketsByEmployee(currentUser?.id)
        .then((tickets) => {
          const ticketList = Array.isArray(tickets) ? tickets : (tickets.results || []);
          const normalized = ticketList.map(normalizeTicket);
          setAllTickets(normalized);
        })
        .catch((err) => {
          console.error('Failed to fetch employee ticket records:', err);
          setAllTickets([]);
        })
        .finally(() => setIsLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const [activeFilters, setActiveFilters] = useState({
    status: null,
    priority: null,
    category: null,
    subCategory: null,
    startDate: "",
    endDate: "",
  });

  const filteredTickets = useMemo(() => {
    const allowedStatuses = statusMap[filter] || [];
    
    let filtered = allTickets.filter(ticket =>
      allowedStatuses.includes(ticket.status)
    );

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        ({ ticketNumber, subject }) =>
          ticketNumber?.toLowerCase().includes(term) ||
          subject?.toLowerCase().includes(term)
      );
    }

    // Apply category filter
    if (activeFilters.category) {
      filtered = filtered.filter(
        ticket => ticket.category === activeFilters.category.label
      );
    }

    // Apply sub-category filter
    if (activeFilters.subCategory) {
      filtered = filtered.filter(
        ticket => ticket.subCategory === activeFilters.subCategory.label
      );
    }

    // Apply status filter
    if (activeFilters.status) {
      filtered = filtered.filter(
        ticket => ticket.status === activeFilters.status.label
      );
    }

    // Apply priority filter
    if (activeFilters.priority) {
      filtered = filtered.filter(
        ticket => ticket.priorityLevel === activeFilters.priority.label
      );
    }

    // Apply date range filter
    if (activeFilters.startDate) {
      filtered = filtered.filter(
        ticket => ticket.dateCreated >= activeFilters.startDate
      );
    }
    if (activeFilters.endDate) {
      filtered = filtered.filter(
        ticket => ticket.dateCreated <= activeFilters.endDate
      );
    }

    return filtered;
  }, [allTickets, filter, searchTerm, activeFilters]);

  // Paginate tickets
  const displayedTickets = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredTickets.slice(startIndex, endIndex);
  }, [filteredTickets, currentPage, pageSize]);

  const handleView = (ticket) => {
    navigate(`/employee/ticket-tracker/${ticket.ticketNumber}`, { state: { from: 'TicketRecords' } });
  };

  const [showFilter, setShowFilter] = useState(false);

  return (
    <div className={styles.pageContainer}>
      {/* Top bar with Show Filter button */}
      <div className={styles.topBar}>
        <button 
          className={styles.showFilterButton}
          onClick={() => setShowFilter(!showFilter)}
        >
          {showFilter ? 'Hide Filter' : 'Show Filter'}
        </button>
      </div>

      {/* Filter Panel - outside table section */}
      {showFilter && (
        <EmployeeTicketFilter
          statusOptions={TICKET_RECORD_STATUS_OPTIONS}
          onApply={setActiveFilters}
          onReset={() => {
            setActiveFilters({
              status: null,
              priority: null,
              category: null,
              subCategory: null,
              startDate: "",
              endDate: "",
            });
            setCurrentPage(1);
          }}
          initialFilters={activeFilters}
          showStatus={filter === 'all-ticket-records'}
        />
      )}

      <div className={styles.tableSection}>

        {/* Table header */}
        <div className={styles.tableHeader}>
          <h2>{headingMap[filter] || "Ticket Records"}</h2>
          <div className={styles.tableActions}>
            <InputField
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              inputStyle={{ width: '260px' }}
            />
          </div>
        </div>
        
        {/* Table wrapper */}
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <TableHeader />
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td><Skeleton /></td>
                    <td><Skeleton /></td>
                    <td><Skeleton width="80px" /></td>
                    <td><Skeleton width="80px" /></td>
                    <td><Skeleton /></td>
                    <td><Skeleton /></td>
                    <td><Skeleton width="100px" /></td>
                    <td><Skeleton width="80px" /></td>
                  </tr>
                ))
              ) : displayedTickets.length > 0 ? (
                displayedTickets.map((ticket, index) => (
                  <TableItem 
                    key={index} 
                    ticket={ticket}
                    onView={handleView}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan="8" className={styles.emptyMessage}>
                    No ticket records found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && (
          <div className={styles.tablePagination}>
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredTickets.length}
              initialItemsPerPage={pageSize}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setPageSize}
              alwaysShow={true}
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default EmployeeTicketRecords;