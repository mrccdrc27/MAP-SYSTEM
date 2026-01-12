import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaSearch } from 'react-icons/fa';
import styles from './CoordinatorOwnedTickets.module.css';
import { backendTicketService } from '../../../services/backend/ticketService';
import { useAuth } from '../../../context/AuthContext';
import TablePagination from '../../../shared/table/TablePagination';
import Skeleton from '../../../shared/components/Skeleton/Skeleton';
import CoordinatorTicketFilter from '../../components/filters/CoordinatorTicketFilter';
import InputField from '../../../shared/components/InputField';

const CoordinatorOwnedTickets = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [allTickets, setAllTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(true);
  const [activeFilters, setActiveFilters] = useState({
    status: null,
    priority: null,
    slaStatus: null,
    startDate: '',
    endDate: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to calculate SLA status
  const calculateSLAStatus = (ticket) => {
    // Use target_resolution from the backend if available
    if (ticket.target_resolution) {
      const targetDate = new Date(ticket.target_resolution);
      const now = new Date();
      
      if (now > targetDate) return 'Overdue';
      
      const hoursRemaining = (targetDate - now) / (1000 * 60 * 60);
      if (hoursRemaining < 4) return 'Due Soon';
      return 'On Time';
    }
    
    // Fallback to calculation based on priority
    const createdDate = new Date(ticket.dateCreated || ticket.created_at);
    if (!createdDate || isNaN(createdDate.getTime())) return 'Unknown';
    
    const now = new Date();
    const hoursDiff = (now - createdDate) / (1000 * 60 * 60);
    
    const slaHours = {
      'Critical': 4,
      'High': 8,
      'Medium': 24,
      'Low': 48
    };
    
    const priority = ticket.priorityLevel || ticket.priority || 'Medium';
    const slaLimit = slaHours[priority] || 24;
    
    if (hoursDiff > slaLimit) return 'Overdue';
    if (hoursDiff > slaLimit * 0.8) return 'Due Soon';
    return 'On Time';
  };

  // Helper to mask certain statuses for display
  const maskStatus = (status) => {
    if (!status) return 'Unknown';
    const lower = status.toLowerCase();
    if (lower === 'pending' || lower === 'pending external' || lower === 'pending_external') {
      return 'In Progress';
    }
    if (lower === 'completed') {
      return 'Resolved';
    }
    return status;
  };

  const formatDate = (date) => {
    if (!date) return 'None';
    try {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return String(date);
      return d.toLocaleString();
    } catch (e) {
      return String(date);
    }
  };

  useEffect(() => {
    setIsLoading(true);

    const loadTickets = async () => {
      try {
        let ticketList = [];
        
        try {
          // Fetch all owned tickets from workflow API to get workflow and step info
          const response = await backendTicketService.getOwnedTickets({ pageSize: 1000 });
          
          ticketList = response?.results || response || [];
        } catch (err) {
          console.warn('Failed to fetch owned tickets:', err);
          ticketList = [];
        }

        // Normalize tickets from the helpdesk backend response
        // Support multiple API shapes/keys (legacy names and serializer outputs)
        const normalized = ticketList.map((t) => {
          // Data comes from Ticket model via /api/tickets/my-tickets/
          const dateCreated = t.submit_date || t.dateCreated || t.created_at || null;
          const lastUpdated = t.update_date || t.lastUpdated || dateCreated;

          // Sub-category may come as `sub_category` or `subCategory` or `subcategory`
          const subCat = t.sub_category || t.subCategory || t.subcategory || '';

          // Workflow and current step can be provided by different serializers
          // or stored in dynamic_data. Try common variants before falling back.
          const workflowFromTicket = t.workflowName || t.workflow_name || t.workflow || (t.dynamic_data && (t.dynamic_data.workflowName || t.dynamic_data.workflow || t.dynamic_data.workflow_name));
          const currentStepFromTicket = t.currentStepName || t.current_step_name || t.current_step || (t.dynamic_data && (t.dynamic_data.currentStepName || t.dynamic_data.current_step || t.dynamic_data.current_step_name));

          return {
            ...t,
            ticketNumber: t.ticket_number || t.ticketNumber || t.id,
            subject: t.subject || 'N/A',
            description: t.description || '',
            status: t.status || 'New',
            priorityLevel: t.priority || t.priorityLevel || 'Medium',
            category: t.category || 'N/A',
            subCategory: subCat,
            workflowName: workflowFromTicket,
            currentStepName: currentStepFromTicket,
            dateCreated,
            lastUpdated,
            assignedAgent: t.employee_name || currentUser?.first_name || '',
            assignedDepartment: t.department || t.employee_department || '',
            ticketOwnerId: t.ticket_owner_id,
            slaStatus: calculateSLAStatus({
              ...t,
              dateCreated,
              priorityLevel: t.priority || t.priorityLevel
            }),
          };
        })
        .sort((a, b) => {
          const da = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
          const db = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
          return db - da;
        });

        setAllTickets(normalized);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to fetch tickets:', err);
        setAllTickets([]);
        setIsLoading(false);
      }
    };

    const timer = setTimeout(() => loadTickets(), 300);
    return () => clearTimeout(timer);
  }, [currentUser]); // Removed searchTerm, currentPage, itemsPerPage, activeFilters.status to fetch all once

  // Apply client-side filters (search, status, priority, slaStatus, date range)
  const filteredTickets = useMemo(() => {
    return allTickets.filter(ticket => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          ticket.ticketNumber?.toLowerCase().includes(searchLower) ||
          ticket.subject?.toLowerCase().includes(searchLower) ||
          ticket.description?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter (from activeFilters) - handle both object and string values
      // Compare against masked status so 'In Progress' filter catches 'pending', 'pending_external', etc.
      if (activeFilters.status) {
        const statusValue = typeof activeFilters.status === 'object' ? activeFilters.status.label : activeFilters.status;
        const maskedTicketStatus = maskStatus(ticket.status);
        if (maskedTicketStatus !== statusValue) return false;
      }

      // Priority filter - handle both object and string values
      if (activeFilters.priority) {
        const priorityValue = typeof activeFilters.priority === 'object' ? activeFilters.priority.label : activeFilters.priority;
        if (ticket.priorityLevel !== priorityValue) return false;
      }

      // SLA Status filter - handle both object and string values
      if (activeFilters.slaStatus) {
        const slaValue = typeof activeFilters.slaStatus === 'object' ? activeFilters.slaStatus.label : activeFilters.slaStatus;
        if (ticket.slaStatus !== slaValue) return false;
      }

      // Date range filters
      if (activeFilters.startDate) {
        const startDate = new Date(activeFilters.startDate);
        const ticketDate = new Date(ticket.dateCreated);
        if (ticketDate < startDate) return false;
      }

      if (activeFilters.endDate) {
        const endDate = new Date(activeFilters.endDate);
        const ticketDate = new Date(ticket.dateCreated);
        if (ticketDate > endDate) return false;
      }

      return true;
    });
  }, [allTickets, activeFilters, searchTerm]);

  // Paginate the filtered results client-side
  const paginatedTickets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    console.log('PaginatedTickets calculation:', {
      currentPage,
      itemsPerPage,
      startIndex,
      endIndex,
      filteredTicketsLength: filteredTickets.length,
      totalPages: Math.ceil(filteredTickets.length / itemsPerPage)
    });
    return filteredTickets.slice(startIndex, endIndex);
  }, [filteredTickets, currentPage, itemsPerPage]);

  const handleViewDetails = (ticketNumber) => {
    navigate(`/admin/owned-tickets/${ticketNumber}`);
  };

  const handleFilterChange = (newFilters) => {
    setActiveFilters(newFilters);
    setCurrentPage(1);
  };

  const handlePageChange = useCallback((page) => {
    console.log('Page changed to:', page);
    setCurrentPage(page);
  }, []);

  const handleItemsPerPageChange = useCallback((newSize) => {
    console.log('Items per page changed to:', newSize);
    setItemsPerPage(newSize);
    setCurrentPage(1);
  }, []);

  return (
    <div className={styles['owned-tickets-container']}>
      <div className={styles['page-header']}>
        <h1>Owned Tickets</h1>
        <p>Manage and track your assigned tickets as Ticket Coordinator</p>
      </div>

      <div className={styles['filters-section']}>
        <div className={styles['search-bar']}>
          <FaSearch className={styles['search-icon']} />
          <InputField
            type="text"
            placeholder="Search by ticket number, subject..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className={styles['search-input']}
          />
        </div>

        <button
          className={styles['filter-btn']}
          onClick={() => setShowFilter(!showFilter)}
        >
          {showFilter ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      {showFilter && (
        <CoordinatorTicketFilter
          onApply={handleFilterChange}
          onReset={() => {
            setActiveFilters({
              status: null,
              priority: null,
              slaStatus: null,
              startDate: '',
              endDate: '',
            });
            setCurrentPage(1);
          }}
          initialFilters={activeFilters}
          statusOptions={[
            { label: 'In Progress', category: 'Active' },
            { label: 'On Hold', category: 'Active' },
            { label: 'Resolved', category: 'Completed' },
            { label: 'Closed', category: 'Completed' },
            { label: 'Rejected', category: 'Completed' },
            { label: 'Withdrawn', category: 'Completed' },
          ]}
          hideCategory={true}
          hideSubCategory={true}
        />
      )}

      {isLoading ? (
        <div className={styles['skeleton-container']}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} height={50} />
          ))}
        </div>
      ) : (
        <>
          <div className={styles['table-container']}>
            <table className={styles['tickets-table']}>
              <thead>
                <tr>
                  <th>Ticket Number</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Workflow</th>
                  <th>Current Step</th>
                  <th>SLA Status</th>
                  <th>Date Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTickets.length > 0 ? (
                  paginatedTickets.map((ticket) => {
                    const displayStatus = maskStatus(ticket.status);
                    const statusClass = displayStatus.toLowerCase().replace(/\s+/g, '-');
                    return (
                    <tr key={ticket.task_id || ticket.ticketNumber}>
                      <td className={styles['ticket-number']}>
                        {ticket.ticketNumber}
                      </td>
                      <td>{ticket.subject || 'N/A'}</td>
                      <td>
                        <span className={`${styles['status-badge']} ${styles[`status-${statusClass}`]}`}>
                          {displayStatus}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles['priority-badge']} ${styles[`priority-${(ticket.priorityLevel || 'low').toLowerCase()}`]}`}>
                          {ticket.priorityLevel || 'N/A'}
                        </span>
                      </td>
                      <td>{ticket.workflowName || 'N/A'}</td>
                      <td>{ticket.currentStepName || 'N/A'}</td>
                      <td>
                        <span className={`${styles['sla-badge']} ${styles[`sla-${(ticket.slaStatus || 'unknown').toLowerCase().replace(/\s+/g, '-')}`]}`}>
                          {ticket.slaStatus || 'Unknown'}
                        </span>
                      </td>
                      <td>{formatDate(ticket.dateCreated)}</td>
                      <td>
                        <button
                          className={styles['view-btn']}
                          onClick={() => handleViewDetails(ticket.ticketNumber)}
                          title="View Details"
                        >
                          <FaEye /> View
                        </button>
                      </td>
                    </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9" className={styles['no-data']}>
                      No owned tickets found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredTickets.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              initialItemsPerPage={itemsPerPage}
              totalItems={filteredTickets.length}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              alwaysShow={true}
            />
          )}
        </>
      )}
    </div>
  );
};

export default CoordinatorOwnedTickets;
