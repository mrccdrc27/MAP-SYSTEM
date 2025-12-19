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
import InputField from "../../../shared/components/InputField";
import Skeleton from "../../../shared/components/Skeleton/Skeleton";

import TablePagination from "../../../shared/table/TablePagination";
import EmployeeTicketFilter, { ACTIVE_TICKET_STATUS_OPTIONS } from "../../components/filters/EmployeeTicketFilter";
import EmployeeActiveTicketsWithdrawTicketModal from "../../components/modals/active-tickets/EmployeeActiveTicketsWithdrawTicketModal";
import EmployeeActiveTicketsCloseTicketModal from "../../components/modals/active-tickets/EmployeeActiveTicketsCloseTicketModal";
import styles from './EmployeeActiveTickets.module.css';

const headingMap = {
  "all-active-tickets": "All Active Tickets",
  "pending-tickets": "Pending Tickets",
  "in-progress-tickets": "In Progress Tickets",
  "on-hold-tickets": "On Hold Tickets",
  "resolved-tickets": "Resolved Tickets",
};

// Map employee filter URLs to actual ticket statuses (stored as admin statuses)
// Employee sees "Pending" for both "New" and "Open" admin statuses
const statusMap = {
  "all-active-tickets": ["New", "Open", "In Progress", "Pending", "On Hold", "Resolved"],
  "pending-tickets": ["New", "Open", "Pending"], // Employee "Pending" = Admin "New", "Open" or "Pending"
  "in-progress-tickets": ["In Progress"],
  "on-hold-tickets": ["On Hold"],
  "resolved-tickets": ["Resolved"],
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
function TableItem({ ticket, onView, onWithdraw, onClose }) {
  // Convert status to employee view for display
  const displayStatus = toEmployeeStatus(ticket.status);
  
  const isWithdrawAllowed = () => {
  const allowed = ["pending", "in progress", "on hold"];
    return allowed.includes(displayStatus.toLowerCase());
  };

  const isCloseAllowed = () => {
    return displayStatus.toLowerCase() === "resolved";
  };

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
          {isWithdrawAllowed() && getTicketActions("withdraw", ticket, { onWithdraw })}
          {isCloseAllowed() && getTicketActions("delete", ticket, { onDelete: onClose })}
        </div>
      </td>
    </tr>
  );
}

const EmployeeActiveTickets = () => {
  const { filter = "all-active-tickets" } = useParams();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [allActiveTickets, setAllActiveTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [selectedWithdraw, setSelectedWithdraw] = useState(null);
  const [selectedClose, setSelectedClose] = useState(null);

  const { user: currentUser } = useAuth();

  // Fetch tickets from backend
  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
  // Only fetch tickets for the current authenticated user
  backendTicketService.getTicketsByEmployee(currentUser?.id)
        .then(tickets => {
          const ticketList = Array.isArray(tickets) ? tickets : (tickets.results || []);
          const normalized = ticketList.map(normalizeTicket);
          setAllActiveTickets(normalized);
        })
        .catch(err => {
          setAllActiveTickets([]);
          console.error('Failed to fetch employee tickets:', err);
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
    
    let filtered = allActiveTickets.filter(ticket =>
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

    // Apply status filter (need to map employee status back to admin statuses)
    if (activeFilters.status) {
      const employeeStatus = activeFilters.status.label;
      filtered = filtered.filter(ticket => {
        const displayStatus = toEmployeeStatus(ticket.status);
        return displayStatus === employeeStatus;
      });
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
  }, [allActiveTickets, filter, searchTerm, activeFilters]);

  // Paginate tickets
  const displayedTickets = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredTickets.slice(startIndex, endIndex);
  }, [filteredTickets, currentPage, pageSize]);

  const handleWithdraw = (ticket) => {
    setSelectedWithdraw(ticket);
  };

  const handleClose = (ticket) => {
    setSelectedClose(ticket);
  };

  const handleView = (ticket) => {
    navigate(`/employee/ticket-tracker/${ticket.ticketNumber}`, { state: { from: 'ActiveTickets' } });
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
          statusOptions={ACTIVE_TICKET_STATUS_OPTIONS}
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
          showStatus={filter === 'all-active-tickets'}
        />
      )}

      <div className={styles.tableSection}>

        {/* Table header */}
        <div className={styles.tableHeader}>
          <h2>{headingMap[filter] || "Active Tickets"}</h2>
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
                    onWithdraw={handleWithdraw}
                    onClose={handleClose}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan="8" className={styles.emptyMessage}>
                    No active tickets found for this filter.
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

      {/* Modals */}
      {selectedWithdraw && (
        <EmployeeActiveTicketsWithdrawTicketModal
          ticket={selectedWithdraw}
          onClose={() => setSelectedWithdraw(null)}
          onSuccess={(ticketNumber) => {
            setAllActiveTickets((prev) =>
              prev.filter((t) => t.ticketNumber !== ticketNumber)
            );
          }}
        />
      )}

      {selectedClose && (
        <EmployeeActiveTicketsCloseTicketModal
          ticket={selectedClose}
          onClose={() => setSelectedClose(null)}
          onSuccess={(ticketNumber) => {
            setAllActiveTickets((prev) =>
              prev.map((t) =>
                t.ticketNumber === ticketNumber
                  ? { ...t, status: "Closed" }
                  : t
              )
            );
          }}
        />
      )}
    </div>
  );
};

export default EmployeeActiveTickets;