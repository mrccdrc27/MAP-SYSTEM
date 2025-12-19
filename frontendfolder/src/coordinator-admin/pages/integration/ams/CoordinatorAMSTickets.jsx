import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { FaEdit, FaTimes, FaEye } from "react-icons/fa";

import styles from "./CoordinatorAMSTickets.module.css";
import TablePagination from "../../../../shared/table/TablePagination";
import { getAllTickets } from "../../../../utilities/storages/ticketStorage";
import authService from "../../../../utilities/service/authService";
import InputField from '../../../../shared/components/InputField';
import Skeleton from '../../../../shared/components/Skeleton/Skeleton';

import CoordinatorAdminOpenTicketModal from "../../../components/modals/CoordinatorOpenTicketModal";
import CoordinatorAdminRejectTicketModal from "../../../components/modals/CoordinatorRejectTicketModal";
import CoordinatorTicketFilter from "../../../components/filters/CoordinatorTicketFilter";
import "react-toastify/dist/ReactToastify.css";

// Helper function to calculate SLA status
const calculateSLAStatus = (ticket) => {
  if (!ticket.dateCreated) return "Unknown";
  
  const createdDate = new Date(ticket.dateCreated);
  const now = new Date();
  const hoursDiff = (now - createdDate) / (1000 * 60 * 60);
  
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

const computeEffectiveStatus = (ticket) => {
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
  return rawStatus || '';
};

const CoordinatorAMSTickets = () => {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [allTickets, setAllTickets] = useState([]);
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      const user = authService.getCurrentUser();
      setCurrentUser(user);

      const fetched = getAllTickets();
      
      // Filter tickets for AMS: only Asset Check In and Asset Check Out categories
      const amsTickets = fetched.filter(ticket => {
        const category = ticket.category || '';
        return category === 'Asset Check In' || category === 'Asset Check Out';
      });
      
      // Apply role-based filtering
      let ticketsToShow = amsTickets;
      if (user) {
        if (user.role === 'Ticket Coordinator') {
          ticketsToShow = amsTickets.filter(ticket => {
            const ticketDept = ticket.department || ticket.assignedDepartment || ticket.assigned_to_department || null;
            const assignedToId = typeof ticket.assignedTo === 'object' ? ticket.assignedTo?.id : ticket.assignedTo;
            const isAssignedToUser = assignedToId === user.id || ticket.assignedToId === user.id || ticket.assigned_to === user.id;
            return ticketDept === user.department || isAssignedToUser;
          });
        }
      }
      
      setAllTickets(ticketsToShow);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const filteredTickets = useMemo(() => {
    const decorated = allTickets.map(t => ({ ...t, __effectiveStatus: computeEffectiveStatus(t) }));

    let result = decorated;

    // Apply status filter only when a specific status is selected
    if (statusFilter) {
      result = result.filter(ticket => {
        const status = ticket.__effectiveStatus?.toLowerCase() || '';
        return status === statusFilter.toLowerCase();
      });
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        ({ ticketNumber, subject }) =>
          ticketNumber?.toLowerCase().includes(term) ||
          subject?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [allTickets, statusFilter, searchTerm]);

  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTickets.slice(start, start + itemsPerPage);
  }, [filteredTickets, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

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
    if (!currentUser) return false;
    if (currentUser.role !== 'Ticket Coordinator') return false;
    return s === "new" || s === "submitted" || s === "pending";
  };

  return (
    <>
      <ToastContainer />
      <div className={styles.pageContainer}>
        <div className={styles.topBar}>
          <button 
            className={styles.showFilterButton}
            onClick={() => setShowFilter(!showFilter)}
          >
            {showFilter ? 'Hide Filter' : 'Show Filter'}
          </button>
        </div>

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
          />
        )}

        <div className={styles.tableSection}>
          <div className={styles.tableHeader}>
            <h2>AMS Tickets</h2>
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
                      No AMS tickets found for this status or search.
                    </td>
                  </tr>
                ) : (
                  paginatedTickets.map((ticket, idx) => {
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
    </>
  );
};

export default CoordinatorAMSTickets;