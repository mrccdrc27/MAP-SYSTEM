import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoAdd,
  IoList,
  IoFolderOpen,
  IoChevronForward
} from 'react-icons/io5';
import Skeleton from '../../../shared/components/Skeleton/Skeleton';
import EmployeeHomeFloatingButtons from './EmployeeHomeFloatingButtons';
import Button from '../../../shared/components/Button';
import styles from './EmployeeHome.module.css';
import { backendTicketService } from '../../../services/backend/ticketService';
import { toEmployeeStatus } from '../../../utilities/helpers/statusMapper';
import { useAuth } from '../../../context/AuthContext';

const EmployeeHome = () => {
  const navigate = useNavigate();
  const [recentTickets, setRecentTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // Prefer AuthContext user as source-of-truth
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;
    setIsLoading(true);
    backendTicketService.getTicketsByEmployee(currentUser.id)
      .then(tickets => {
        // If backend returns {results: [...]}, use that, else use tickets directly
        const ticketList = Array.isArray(tickets) ? tickets : (tickets.results || []);
        // Helper: compute a robust numeric timestamp for "last updated" using many possible fields
        const getLastUpdatedTs = (t) => {
          if (!t) return 0;
          const candidates = [
            t.update_date, t.lastUpdated, t.updatedAt, t.updated_at, t.time_closed, t.closedAt,
            t.modifiedAt, t.dateModified, t.submitted_at, t.submit_date, t.dateCreated, t.createdAt, t.created_at
          ];
          for (const c of candidates) {
            if (c === null || c === undefined) continue;
            // If it's a number already
            if (typeof c === 'number' && isFinite(c)) return c;
            // Try parsing strings / ISO dates
            try {
              const parsed = Date.parse(String(c));
              if (!isNaN(parsed)) return parsed;
            } catch (e) {
              // ignore
            }
          }
          return 0;
        };

        // sort by last-updated timestamp (newest first) and pick up to 5
        const sortedByUpdated = ticketList.slice().sort((a, b) => getLastUpdatedTs(b) - getLastUpdatedTs(a));
        const latestFive = sortedByUpdated.slice(0, 5);
        setRecentTickets(latestFive);
      })
      .catch(err => {
        setRecentTickets([]);
        console.error('Failed to fetch employee tickets:', err);
      })
      .finally(() => setIsLoading(false));
  }, [currentUser]);

  const handleSubmitTicket = () => {
    navigate('/employee/submit-ticket');
  };

  const handleViewActiveTickets = () => {
    navigate('/employee/active-tickets/all-active-tickets');
  };

  const handleViewTicketRecords = () => {
    navigate('/employee/ticket-records/all-ticket-records');
  };


  const handleViewDetails = (ticketNumber) => {
    navigate(`/employee/ticket-tracker/${ticketNumber}`, { state: { from: 'Home' } });
  };

  // Normalize ticket data to handle both backend field names (snake_case) and frontend (camelCase)
  const normalizeTicket = (ticket) => {
    return {
      ticketNumber: ticket.ticket_number || ticket.ticketNumber,
      status: ticket.status,
      subject: ticket.subject,
      category: ticket.category,
      subCategory: ticket.sub_category || ticket.subCategory,
      priorityLevel: ticket.priority || ticket.priorityLevel,
      assignedTo: ticket.assigned_to || ticket.assignedTo,
      lastUpdated: ticket.update_date || ticket.lastUpdated || ticket.updatedAt || ticket.updated_at || ticket.time_closed || ticket.closedAt || ticket.submit_date || ticket.dateCreated || ticket.createdAt || null,
      dateCreated: ticket.submit_date || ticket.dateCreated || ticket.createdAt || null
    };
  };

  return (
    <div className={styles.pageContainer}>
      <h1 className={styles.welcomeHeader}>
        Welcome, <span className={styles.welcomeName}>{currentUser?.first_name || currentUser?.firstName}<span className={styles.welcomeName}>!</span></span>
      </h1>

      <div className={styles.topSection}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Quick Actions</h2>
          <div className={styles.actionGroupColumn}>
            <Button variant="primary" onClick={handleSubmitTicket}>
              <IoAdd />
              Submit a Ticket
            </Button>
            <div className={styles.actionGroupRow}>
              <Button variant="outline" onClick={handleViewActiveTickets}>
                <IoList />
                View Active Tickets
              </Button>
              <Button variant="outline" onClick={handleViewTicketRecords}>
                <IoFolderOpen />
                View Ticket Records
              </Button>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Notice</h2>
          <p className={styles.noticeText}>
            Our support team operates during <span className={styles.workingHours}>8:00 AM - 5:00 PM</span>.
          </p>
          <ul className={styles.noticeList}>
            <li className={styles.noticeItem}>
              Tickets will be processed within <strong>1 business day</strong>
            </li>
            <li className={styles.noticeItem}>
              Urgent requests? Call <span className={styles.phoneNumber}>+63 912 345 6789</span>
            </li>
          </ul>
        </div>
      </div>

      <div className={styles.recentTickets}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Tickets</h2>
        </div>

        {isLoading ? (
          <div className={styles.ticketList}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={styles.ticketItem}>
                <div className={styles.ticketInfo}>
                  <div className={styles.ticketHeader}>
                    <div className={styles.ticketNumber}><Skeleton width="80px" /></div>
                    <Skeleton width="100px" height="24px" />
                  </div>
                  <div className={styles.ticketDetailsGrid}>
                    {[1, 2, 3, 4].map(j => (
                      <div key={j}>
                        <div className={styles.ticketLabel}><Skeleton width="80px" height="12px" /></div>
                        <div className={styles.ticketValue}><Skeleton width="100%" /></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={styles.ticketActions}>
                  <div className={styles.lastUpdated}><Skeleton width="150px" /></div>
                  <Skeleton width="120px" height="36px" />
                </div>
              </div>
            ))}
          </div>
        ) : recentTickets.length === 0 ? (
            <div className={styles.noTickets}>
              <p>{isLoading ? 'Loading tickets...' : 'No active tickets to display.'}</p>
              {!isLoading && (
                <Button variant="primary" onClick={handleSubmitTicket}>
                  Submit a Ticket
                </Button>
              )}
            </div>
        ) : (
          <div className={styles.ticketList}>
            {recentTickets.map(ticket => {
              const normalized = normalizeTicket(ticket);
              // Convert status to employee view (New/Open -> Pending)
              const displayStatus = toEmployeeStatus(normalized.status);
              const statusKey = displayStatus.replace(/\s/g, '').toLowerCase();
              return (
                <div key={normalized.ticketNumber} className={styles.ticketItem}>
                  <div className={styles.ticketInfo}>
                    <div className={styles.ticketHeader}>
                      <div className={styles.ticketNumber}>#{normalized.ticketNumber}</div>
                      <span
                        className={styles.statusBadge}
                        style={{
                          backgroundColor: `var(--${statusKey}-bg)`,
                          color: `var(--${statusKey}-text)`
                        }}
                      >
                        {displayStatus.toUpperCase()}
                      </span>
                    </div>
                    <div className={styles.ticketDetailsGrid}>
                      <div>
                        <div className={styles.ticketLabel}>Assigned Agent</div>
                        <div className={styles.ticketValue}>
                          {normalized.assignedTo?.name || normalized.assignedTo || 'Unassigned'}
                        </div>
                      </div>
                      <div>
                        <div className={styles.ticketLabel}>Subject</div>
                        <div className={styles.ticketValue}>{normalized.subject}</div>
                      </div>
                      <div>
                        <div className={styles.ticketLabel}>Priority Level</div>
                        <div className={styles.ticketValue}>{normalized.priorityLevel || 'Not Set'}</div>
                      </div>
                      <div>
                        <div className={styles.ticketLabel}>Category & Sub-category</div>
                        <div className={styles.ticketValue}>
                          {normalized.category} {normalized.subCategory ? `> ${normalized.subCategory}` : ''}
                        </div>
                      </div>
                    </div>
                  </div>

                 <div className={styles.ticketActions}>
                  <div className={styles.lastUpdated}>
                    Last Updated {new Date(normalized.lastUpdated || normalized.dateCreated).toLocaleDateString()}
                  </div>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handleViewDetails(normalized.ticketNumber)}
                  >
                    View Details <IoChevronForward />
                  </Button>
                </div>

              </div>
              );
            })}
          </div>
        )}
      </div>

      <EmployeeHomeFloatingButtons />
    </div>
  );
};

export default EmployeeHome;