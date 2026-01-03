import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaSearch } from 'react-icons/fa';
import styles from './AdminAssignedTickets.module.css';
import { backendTicketService } from '../../../services/backend/ticketService';
import { useAuth } from '../../../context/AuthContext';
import TablePagination from '../../../shared/table/TablePagination';
import Skeleton from '../../../shared/components/Skeleton/Skeleton';
import CoordinatorTicketFilter from '../../components/filters/CoordinatorTicketFilter';
import InputField from '../../../shared/components/InputField';

const AdminAssignedTickets = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [allTickets, setAllTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    status: null,
    priority: null,
    category: null,
    subCategory: null,
    slaStatus: null,
    startDate: '',
    endDate: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Helper function to calculate SLA status
  const calculateSLAStatus = (ticket) => {
    if (ticket.target_resolution) {
      const targetDate = new Date(ticket.target_resolution);
      const now = new Date();
      
      if (now > targetDate) return 'Overdue';
      
      const hoursRemaining = (targetDate - now) / (1000 * 60 * 60);
      if (hoursRemaining < 4) return 'Due Soon';
      return 'On Time';
    }
    
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
        let count = 0;
        
        try {
          // Use the all-assigned-tickets endpoint for admin
          const response = await backendTicketService.getAllAssignedTickets({
            tab: activeFilters.status?.toLowerCase() === 'open' ? 'active' : 
                 activeFilters.status?.toLowerCase() === 'closed' ? 'inactive' : '',
            search: searchTerm,
            page: currentPage,
            pageSize: itemsPerPage
          });
          
          ticketList = response.results || [];
          count = response.count || ticketList.length;
        } catch (err) {
          console.warn('Failed to fetch from workflow API:', err);
          ticketList = [];
          count = 0;
        }

        // Normalize tickets from the workflow_api response
        const normalized = ticketList.map((t) => {
          const dateCreated = t.created_at || t.submit_date || t.submitDate || t.dateCreated || null;
          const lastUpdated = t.updated_at || t.update_date || t.lastUpdated || dateCreated;
          
          return {
            ...t,
            ticketNumber: t.ticket_number || t.ticket_id || t.ticketNumber || t.id,
            subject: t.ticket_subject || t.subject || 'N/A',
            description: t.ticket_description || t.description || '',
            status: t.status || 'pending',
            priorityLevel: t.priority || t.priorityLevel || 'Medium',
            category: t.category || 'N/A',
            subCategory: t.sub_category || t.subCategory || t.subcategory || '',
            dateCreated,
            lastUpdated,
            ticketOwner: t.ticket_owner_name || t.assigned_to || t.assignedTo || 'Unassigned',
            assignedDepartment: t.department || t.assignedDepartment || '',
            workflowName: t.workflow_name || '',
            currentStepName: t.current_step_name || '',
            targetResolution: t.target_resolution,
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
        setTotalCount(count);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to fetch tickets:', err);
        setAllTickets([]);
        setTotalCount(0);
        setIsLoading(false);
      }
    };

    const timer = setTimeout(() => loadTickets(), 300);
    return () => clearTimeout(timer);
  }, [currentUser, searchTerm, currentPage, itemsPerPage, activeFilters.status]);

  // Build dynamic filter options
  const categoryOptions = useMemo(() => {
    const set = new Set(allTickets.map(t => t.category).filter(Boolean));
    return Array.from(set).map(v => ({ label: v, value: v }));
  }, [allTickets]);

  const subCategoryOptions = useMemo(() => {
    const set = new Set(allTickets.map(t => t.subCategory).filter(Boolean));
    return Array.from(set).map(v => ({ label: v, value: v }));
  }, [allTickets]);

  // Apply client-side filters
  const filteredTickets = useMemo(() => {
    return allTickets.filter(ticket => {
      if (activeFilters.priority && ticket.priorityLevel !== activeFilters.priority) return false;
      if (activeFilters.category && ticket.category !== activeFilters.category) return false;
      if (activeFilters.subCategory && ticket.subCategory !== activeFilters.subCategory) return false;
      if (activeFilters.slaStatus && ticket.slaStatus !== activeFilters.slaStatus) return false;

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
  }, [allTickets, activeFilters]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleViewDetails = (ticketNumber) => {
    navigate(`/admin/assigned-tickets/${ticketNumber}`);
  };

  const handleFilterChange = (newFilters) => {
    setActiveFilters(newFilters);
    setCurrentPage(1);
  };

  return (
    <div className={styles['assigned-tickets-container']}>
      <div className={styles['page-header']}>
        <h1>Assigned Tickets</h1>
        <p>View and manage all tickets assigned to coordinators</p>
      </div>

      <div className={styles['filters-section']}>
        <div className={styles['search-bar']}>
          <FaSearch className={styles['search-icon']} />
          <InputField
            type="text"
            placeholder="Search by ticket number, subject, owner..."
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
          Filters
        </button>
      </div>

      {showFilter && (
        <CoordinatorTicketFilter
          onFilterChange={handleFilterChange}
          categoryOptions={categoryOptions}
          subCategoryOptions={subCategoryOptions}
          currentFilters={activeFilters}
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
                  <th>Owner</th>
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
                {filteredTickets.length > 0 ? (
                  filteredTickets.map((ticket) => (
                    <tr key={ticket.task_id || ticket.ticketNumber}>
                      <td className={styles['ticket-number']}>
                        {ticket.ticketNumber}
                      </td>
                      <td>{ticket.subject || 'N/A'}</td>
                      <td className={styles['owner-cell']}>
                        {ticket.ticketOwner || 'Unassigned'}
                      </td>
                      <td>
                        <span className={`${styles['status-badge']} ${styles[`status-${(ticket.status || 'unknown').toLowerCase().replace(/\s+/g, '-')}`]}`}>
                          {ticket.status || 'Unknown'}
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
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" className={styles['no-data']}>
                      No assigned tickets found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalCount > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={totalCount}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(newSize) => {
                setItemsPerPage(newSize);
                setCurrentPage(1);
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default AdminAssignedTickets;
