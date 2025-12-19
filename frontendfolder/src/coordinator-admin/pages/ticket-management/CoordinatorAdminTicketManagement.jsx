import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { FaEdit, FaTimes, FaEye } from "react-icons/fa";

import styles from "./CoordinatorAdminTicketManagement.module.css";
import { useAuth } from '../../../context/AuthContext';
import TablePagination from "../../../shared/table/TablePagination";
import CoordinatorTicketFilter from "../../components/filters/CoordinatorTicketFilter";
import { backendTicketService } from '../../../services/backend/ticketService';
import authService from "../../../utilities/service/authService";
import InputField from '../../../shared/components/InputField';
import Skeleton from '../../../shared/components/Skeleton/Skeleton';

import CoordinatorAdminOpenTicketModal from "../../components/modals/CoordinatorOpenTicketModal";
import CoordinatorAdminRejectTicketModal from "../../components/modals/CoordinatorRejectTicketModal";
import "react-toastify/dist/ReactToastify.css";

const headingMap = {
  all: "All Tickets",
  new: "New Tickets",
  pending: "Pending Tickets",
  open: "Open Tickets",
  "In-progress": "In Progress Tickets",
  "on-hold": "On Hold Tickets",
  resolved: "Resolved Tickets",
  closed: "Closed Tickets",
  rejected: "Rejected Tickets",
  withdrawn: "Withdrawn Tickets",
};

// Helper function to calculate SLA status
const calculateSLAStatus = (ticket) => {
  if (!ticket.dateCreated) return "Unknown";
  
  const createdDate = new Date(ticket.dateCreated);
  const now = new Date();
  const hoursDiff = (now - createdDate) / (1000 * 60 * 60);
  
  // SLA rules based on priority
  const slaHours = {
    'Critical': 4,
    'High': 8,
    'Medium': 24,
    'Low': 48
  };
  
  const slaLimit = slaHours[ticket.priorityLevel] || 24;
  
  if (hoursDiff > slaLimit) return "Overdue";
  if (hoursDiff > slaLimit * 0.8) return "Due Soon";
  return "On Time";
};

// If a ticket remains 'New' for more than 24 hours it becomes 'Pending' for coordinators/admins
const computeEffectiveStatus = (ticket) => {
  // Normalize input status - treat Submitted/Pending as New for aging purposes
  const rawStatus = (ticket.status || '').toString();
  const lower = rawStatus.toLowerCase();
  const baseIsNew = lower === 'new' || lower === 'submitted' || lower === 'pending';
  try {
    const created = new Date(ticket.createdAt || ticket.dateCreated || ticket.created_at || ticket.submit_date || ticket.submitDate);
    if (baseIsNew && created instanceof Date && !isNaN(created)) {
      const hours = (new Date() - created) / (1000 * 60 * 60);
      if (hours >= 24) return 'Pending';
      return 'New';
    }
  } catch (e) {
    // ignore parse errors
  }
  // For non-new statuses, preserve original casing where possible
  return rawStatus || '';
};

const CoordinatorAdminTicketManagement = () => {
  const { status = "all-tickets" } = useParams();
  const navigate = useNavigate();

  const { user: currentUser } = useAuth();
  const [allTickets, setAllTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    status: null,
    priority: null,
    category: null,
    subCategory: null,
    slaStatus: null,
    startDate: "",
    endDate: "",
  });

  // 👇 New pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  const normalizedStatus = status.replace("-tickets", "").toLowerCase();
  // Map URL status to actual ticket status
  // Note: 'new' URL should map to New/Submitted only; Pending is a separate status
  // 'open' maps to Open, etc. Keep null for 'all'.
  const statusFilter =
    normalizedStatus === "new"
      ? ["new", "submitted"]
      : normalizedStatus === "all"
      ? null
      : normalizedStatus.replace(/-/g, " ");

  useEffect(() => {
    // Always refresh tickets when the URL status changes or when the page is visited
    // Also refresh when currentUser changes (role/department scope may differ)
    setIsLoading(true);

    const loadTickets = async () => {
      try {
        const fetched = await backendTicketService.getAllTickets();
        const ticketList = Array.isArray(fetched) ? fetched : (fetched?.results || []);
        let ticketsToShow = ticketList;
        const user = currentUser;
        if (user) {
          if (user.role === 'Ticket Coordinator') {
            // Coordinators should see all tickets when viewing a specific status page
            // but retain special scoping for the 'new' (untriaged) page so unassigned/new
            // tickets are visible to coordinators for triage.
            const normalizedStatus = status.replace('-tickets', '').toLowerCase();
            if (normalizedStatus === 'new') {
              ticketsToShow = ticketList.filter(ticket => {
                const ticketDept = ticket.department || ticket.assignedDepartment || ticket.assigned_to_department || null;
                const assignedToId = typeof ticket.assignedTo === 'object' ? ticket.assignedTo?.id : ticket.assignedTo;
                const isAssignedToUser = assignedToId === user.id || ticket.assignedToId === user.id || ticket.assigned_to === user.id;
                const statusLower = (ticket.status || '').toString().toLowerCase();
                const isNewish = statusLower === 'new' || statusLower === 'submitted' || statusLower === 'pending';
                return isNewish || ticketDept === user.department || isAssignedToUser;
              });
            } else {
              // For other specific-status views (e.g., 'open'), show the full ticket list
              ticketsToShow = ticketList;
            }
          } else if (user.role === 'System Admin') {
            ticketsToShow = ticketList;
          }
        }

        // Normalize tickets to the shape expected by the UI
        const normalized = ticketsToShow.map((t) => {
          const dateCreated = t.submit_date || t.submitDate || t.dateCreated || t.created_at || t.createdAt || null;
          const lastUpdated = t.update_date || t.lastUpdated || t.updatedAt || t.updated_at || t.time_closed || t.closedAt || t.submit_date || t.dateCreated || t.createdAt || null;
          return {
            ...t,
            ticketNumber: t.ticket_number || t.ticket_id || t.ticketNumber || t.id,
            subCategory: t.sub_category || t.subCategory || t.subcategory || '',
            priorityLevel: t.priority || t.priorityLevel || '',
            dateCreated,
            lastUpdated,
            assignedAgent: t.assigned_to || t.assignedTo || '',
            assignedDepartment: t.department || t.assignedDepartment || '',
            __effectiveStatus: computeEffectiveStatus({ status: t.status, dateCreated }),
          };
        })
        // Ensure newest-first based on last updated timestamp (newest -> oldest)
        .sort((a, b) => {
          const da = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
          const db = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
          return db - da;
        });

        setAllTickets(normalized);
        setIsLoading(false);
      } catch (err) {
        setAllTickets([]);
        setIsLoading(false);
        console.error('Failed to fetch tickets:', err);
      }
    };

    // Debounced initial fetch to avoid jank on rapid navigation
    const timer = setTimeout(() => loadTickets(), 300);

    // Poll periodically to pick up new tickets created by other users/systems
    const pollIntervalMs = 30000; // 30s
    const pollId = setInterval(() => {
      loadTickets().catch(() => {});
    }, pollIntervalMs);

    return () => {
      clearTimeout(timer);
      clearInterval(pollId);
    };
  }, [status, currentUser]);

  // Build dynamic filter options from loaded tickets
  const categoryOptions = useMemo(() => {
    const set = new Set(allTickets.map(t => t.category).filter(Boolean));
    return Array.from(set).map(v => ({ label: v, value: v }));
  }, [allTickets]);

  const subCategoryOptions = useMemo(() => {
    const set = new Set(allTickets.map(t => t.subCategory).filter(Boolean));
    return Array.from(set).map(v => ({ label: v, value: v }));
  }, [allTickets]);

  const filteredTickets = useMemo(() => {
    let result = allTickets;

    // Status filter from URL — use computed effective status when available so
    // aged 'New' -> 'Pending' tickets are routed to the Pending page instead of New.
    if (statusFilter) {
      if (Array.isArray(statusFilter)) {
        result = result.filter(ticket => {
          const ticketStatusForFilter = (ticket.__effectiveStatus || ticket.status || '').toString().toLowerCase();
          return statusFilter.includes(ticketStatusForFilter);
        });
      } else {
        result = result.filter(ticket => {
          const ticketStatusForFilter = (ticket.__effectiveStatus || ticket.status || '').toString().toLowerCase();
          return ticketStatusForFilter === statusFilter;
        });
      }
    }

    // Search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        ({ ticketNumber, subject }) =>
          ticketNumber?.toLowerCase().includes(term) ||
          subject?.toLowerCase().includes(term)
      );
    }

    // Apply category filter
    if (activeFilters.category) {
      result = result.filter(
        ticket => ticket.category === activeFilters.category.label
      );
    }

    // Apply sub-category filter
    if (activeFilters.subCategory) {
      result = result.filter(
        ticket => ticket.subCategory === activeFilters.subCategory.label
      );
    }

    // Apply status filter
    if (activeFilters.status) {
      result = result.filter(
        ticket => ticket.status === activeFilters.status.label
      );
    }

    // Apply priority filter
    if (activeFilters.priority) {
      result = result.filter(
        ticket => ticket.priorityLevel === activeFilters.priority.label
      );
    }

    // Apply SLA status filter
    if (activeFilters.slaStatus) {
      result = result.filter(ticket => {
        const sla = calculateSLAStatus(ticket);
        return sla === activeFilters.slaStatus.label;
      });
    }

    // Apply date range filter
    if (activeFilters.startDate) {
      result = result.filter(
        ticket => ticket.dateCreated >= activeFilters.startDate
      );
    }
    if (activeFilters.endDate) {
      result = result.filter(
        ticket => ticket.dateCreated <= activeFilters.endDate
      );
    }

    return result;
  }, [allTickets, normalizedStatus, statusFilter, searchTerm, activeFilters]);

  // 👇 Slice tickets for the current page
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTickets.slice(start, start + itemsPerPage);
  }, [filteredTickets, currentPage, itemsPerPage]);

  // 👇 Reset to page 1 if filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, normalizedStatus]);

  const openModal = (type, ticket) => {
    setSelectedTicket(ticket);
    setModalType(type);
  };

  const closeModal = () => {
    setSelectedTicket(null);
    setModalType(null);
  };

  const handleSuccess = (ticketNumber, newStatus) => {
    setAllTickets((prev) =>
      prev.map((ticket) =>
        ticket.ticketNumber === ticketNumber
          ? { ...ticket, status: newStatus }
          : ticket
      )
    );
    closeModal();
  };

  const isActionable = (status) => {
    const s = (status || "").toLowerCase();
    // Only Ticket Coordinators can perform open/reject actions. System Admins can only view.
    if (!currentUser) return false;
    if (currentUser.role !== 'Ticket Coordinator') return false;
    // Only "New" tickets (including Submitted/Pending) are actionable
    return s === "new" || s === "submitted" || s === "pending";
  };

  return (
    <>
      <ToastContainer />
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
          <CoordinatorTicketFilter
            onApply={setActiveFilters}
            onReset={() => {
              setActiveFilters({
                status: null,
                priority: null,
                category: null,
                subCategory: null,
                slaStatus: null,
                startDate: "",
                endDate: "",
              });
              setCurrentPage(1);
            }}
            initialFilters={activeFilters}
            // Provide dynamic options derived from ticket submissions
            categoryOptions={categoryOptions}
            subCategoryOptions={subCategoryOptions}
            // Hide status dropdown when the page is pre-filtered via URL (only show on All Tickets)
            showStatus={normalizedStatus === 'all'}
          />
        )}

        <div className={styles.tableSection}>
          <div className={styles.tableHeader}>
            <h2>{headingMap[normalizedStatus] || "Ticket Management"}</h2>
            <div className={styles.tableActions}>
              <InputField
                placeholder="Search..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                inputStyle={{ width: '260px' }}
              />
            </div>
          </div>
        
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Ticket No.</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Category</th>
                <th>Sub Category</th>
                <th>Priority</th>
                <th>SLA Status</th>
                <th>Assigned Agent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td><Skeleton /></td>
                    <td><Skeleton /></td>
                    <td><Skeleton width="80px" /></td>
                    <td><Skeleton /></td>
                    <td><Skeleton /></td>
                    <td><Skeleton width="80px" /></td>
                    <td><Skeleton width="100px" /></td>
                    <td><Skeleton /></td>
                    <td><Skeleton width="80px" /></td>
                  </tr>
                ))
              ) : paginatedTickets.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 40, color: "#6b7280", fontStyle: "italic" }}>
                    No tickets found for this status or search.
                  </td>
                </tr>
              ) : (
                paginatedTickets.map((ticket, idx) => {
                  // Use the computed effective status (e.g., New older than 24h -> Pending)
                  const effective = ticket.__effectiveStatus || ticket.status || '';
                  const displayStatus = effective;
                  const statusClass = displayStatus.replace(/\s+/g, '-').toLowerCase();
                  
                  return (
                    <tr key={ticket.ticketNumber || idx}>
                      <td>{ticket.ticketNumber}</td>
                      <td>
                        <div className={styles.subjectCell} title={ticket.subject}>
                          {ticket.subject}
                        </div>
                      </td>
                      <td>
                        <div className={styles[`status-${statusClass}`]}>
                          {displayStatus}
                        </div>
                      </td>
                      <td>{ticket.category}</td>
                      <td>{ticket.subCategory || "—"}</td>
                    <td>
                      {ticket.priorityLevel ? (
                        <div className={styles[`priority-${ticket.priorityLevel.toLowerCase()}`]}>
                          {ticket.priorityLevel}
                        </div>
                      ) : (
                        <div className={styles['priority-not-set']}>
                          Not Set
                        </div>
                      )}
                    </td>
                    <td>
                      <div className={styles[`sla-${calculateSLAStatus(ticket).toLowerCase().replace(' ', '-')}`]}>
                        {calculateSLAStatus(ticket)}
                      </div>
                    </td>
                    <td>{ticket.assignedAgent || "Unassigned"}</td>
                    <td>
                      <div className={styles.actionButtonCont}>
                        <button
                          title="View"
                          className={styles.actionButton}
                          onClick={() => navigate(`/admin/ticket-tracker/${ticket.ticketNumber}`)}
                        >
                          <FaEye />
                        </button>
                        {isActionable(ticket.status) && (
                          <button
                            title="Edit"
                            className={styles.actionButton}
                            onClick={() => openModal("open", ticket)}
                          >
                            <FaEdit />
                          </button>
                        )}
                        {isActionable(ticket.status) && (
                          <button
                            title="Delete"
                            className={styles.actionButton}
                            onClick={() => openModal("reject", ticket)}
                          >
                            <FaTimes />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>
        <div className={styles.tablePagination}>
          {!isLoading && (
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredTickets.length}
              initialItemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              alwaysShow={true}
            />
          )}
        </div>
      </div>

      {modalType === "open" && selectedTicket && (
        <CoordinatorAdminOpenTicketModal
          ticket={selectedTicket}
          onClose={closeModal}
          onSuccess={(ticketNumber) => handleSuccess(ticketNumber, "Open")}
        />
      )}

      {modalType === "reject" && selectedTicket && (
        <CoordinatorAdminRejectTicketModal
          ticket={selectedTicket}
          onClose={closeModal}
          onSuccess={(ticketNumber) => handleSuccess(ticketNumber, "Rejected")}
        />

      )}
    </div>
  </>);
}
export default CoordinatorAdminTicketManagement;
