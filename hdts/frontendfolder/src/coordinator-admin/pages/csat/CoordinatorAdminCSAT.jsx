import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './CoordinatorAdminCSAT.module.css';
import { backendTicketService } from '../../../services/backend/ticketService';

import TablePagination from '../../../shared/table/TablePagination';
import FilterPanel from '../../../shared/table/FilterPanel';
import authService from '../../../utilities/service/authService';
import { getTicketById } from '../../../utilities/storages/ticketStorage';
// simple inline filter will be used (Rating + Start/End dates)
import InputField from '../../../shared/components/InputField';
import Button from '../../../shared/components/Button';
import Skeleton from '../../../shared/components/Skeleton/Skeleton';
import CoordinatorAdminCSATViewModal from '../../components/modals/csat/CoordinatorAdminCSATViewModal';
import { FaEye } from 'react-icons/fa';

// Using mock data only — no API base URL

const categoryLabels = {
  all: 'All Ratings',
  excellent: 'Excellent Ratings',
  good: 'Good Ratings',
  neutral: 'Neutral Ratings',
  poor: 'Poor Ratings',
  'very-poor': 'Very Poor Ratings',
};

const ratingMap = {
  excellent: 5,
  good: 4,
  neutral: 3,
  poor: 2,
  'very-poor': 1,
};

const formatDate = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch (e) {
    return iso;
  }
};

const getRatingColor = (rating) => {
  switch (rating) {
    case 5:
      return 'var(--csat-excellent)';
    case 4:
      return 'var(--csat-good)';
    case 3:
      return 'var(--csat-neutral)';
    case 2:
      return 'var(--csat-poor)';
    case 1:
      return 'var(--csat-very-poor)';
    default:
      return 'var(--csat-default)';
  }
};

const getRatingText = (rating) => {
  switch (rating) {
    case 5:
      return 'Excellent';
    case 4:
      return 'Good';
    case 3:
      return 'Neutral';
    case 2:
      return 'Poor';
    case 1:
      return 'Very Poor';
    default:
      return 'N/A';
  }
};

const SysAdminCSAT = () => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(true);
  const [activeFilters, setActiveFilters] = useState({
    rating: null,
    startDate: '',
    endDate: '',
  });
  const [csatData, setCsatData] = useState([]);

  const handleFilterApply = (filters) => {
    setActiveFilters(filters);
    setCurrentPage(1);
  };

  const handleFilterReset = () => {
    setActiveFilters({ rating: null, startDate: '', endDate: '' });
    setCurrentPage(1);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCSAT, setSelectedCSAT] = useState(null);

  // Fetch CSAT data from backend
  useEffect(() => {
    const fetchCSATData = async () => {
      setIsLoading(true);
      try {
        const data = await backendTicketService.getCSATFeedback();
        // Transform backend data to match expected format
        const transformed = data.map((item) => ({
          id: item.id,
          ticketId: item.id,
          ticketNumber: item.ticket_number,
          subject: item.subject,
          rating: item.rating,
          comment: item.feedback || '',
          feedback: item.feedback || '',
          employeeName: item.employee_name || 'Unknown',
          date: item.submitted_date,
          ticketStatus: item.status,
          profilePic: '', // Backend doesn't return this yet
        }));
        setCsatData(transformed);
      } catch (err) {
        console.error('Failed to fetch CSAT data:', err);
        setCsatData([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCSATData();
  }, []);

  // Small Avatar component with initials fallback when image fails
  const Avatar = ({ src, name, size = 40 }) => {
    const [failed, setFailed] = useState(false);
    const initials = (name || '')
      .split(' ')
      .filter(Boolean)
      .map(n => n[0].toUpperCase())
      .slice(0,2)
      .join('');

    if (!src || failed) {
      return (
        <div className={styles.avatarInitials} style={{ width: size, height: size, lineHeight: `${size}px`, fontSize: Math.floor(size/2.2) }}>
          {initials || 'U'}
        </div>
      );
    }

    return (
      <img
        src={src}
        alt={name}
        className={styles.profileImage}
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
      />
    );
  };

  // Extract category from URL path
  const parts = location.pathname.split('/').filter(Boolean);
  const last = parts[parts.length - 1] || '';
  const key = last === 'csat' || last === 'admin' ? 'all' : (categoryLabels[last] ? last : 'all');
  const title = categoryLabels[key] || 'All Ratings';

  const filtered = useMemo(() => {
    let rows = csatData.slice();

    // Role-based visibility: Ticket Coordinators only see CSATs for tickets they reviewed/approved
    const currentUser = authService.getCurrentUser?.();
    if (currentUser && currentUser.role === 'Ticket Coordinator') {
      rows = rows.filter((r) => {
        const ticket = getTicketById(r.ticketId) || getTicketById(Number(r.ticketId));
        if (!ticket) return false;
        // reviewer's id is stored as `reviewedById` on tickets
        return Number(ticket.reviewedById) === Number(currentUser.id);
      });
    }

    // route-based rating filter
    if (key !== 'all') {
      const rating = ratingMap[key];
      rows = rows.filter((r) => r.rating === rating);
    }

    // show only CSATs for tickets that are closed (if ticketStatus present)
    rows = rows.filter(r => {
      if (r.ticketStatus) return String(r.ticketStatus).toLowerCase() === 'closed';
      return true; // keep if no status available
    });

    // Apply search filter
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      rows = rows.filter((r) => (
        (r.ticketNumber || '').toLowerCase().includes(s) ||
        (r.subject || '').toLowerCase().includes(s) ||
        (r.employeeName || '').toLowerCase().includes(s)
      ));
    }

    // apply inline filter selections (rating + date range)
    if (activeFilters.rating) {
      rows = rows.filter(r => Number(r.rating) === Number(activeFilters.rating));
    }
    if (activeFilters.startDate) {
      rows = rows.filter(r => new Date(r.date) >= new Date(activeFilters.startDate));
    }
    if (activeFilters.endDate) {
      rows = rows.filter(r => new Date(r.date) <= new Date(activeFilters.endDate));
    }

    return rows;
  }, [key, searchTerm, activeFilters, csatData]);

  const navigate = useNavigate();

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, key, activeFilters]);

  return (
    <>
      <div className={styles.pageContainer}>
        {/* Single Hide/Show Filter button */}
        <div className={styles.topBar}>
          <button 
            className={styles.showFilterButton}
            onClick={() => setShowFilter(!showFilter)}
          >
            {showFilter ? 'Hide Filter' : 'Show Filter'}
          </button>
        </div>

        {/* Filter Panel (Rating + Start/End Date) */}
        {showFilter && (
          <FilterPanel
            fields={['rating', 'startDate', 'endDate']}
            filters={activeFilters}
            onApply={handleFilterApply}
            onReset={handleFilterReset}
            hideToggleButton={true}
          />
        )}

        <div className={styles.tableSection}>
          <div className={styles.tableHeader}>
            <h2>{title}</h2>
            <div className={styles.tableActions}>
              <InputField
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                inputStyle={{ width: '260px' }}
              />
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.profileHeader}></th>
                  <th>Employee</th>
                  <th>Ticket No.</th>
                  <th>Subject</th>
                  <th>Rating</th>
                  <th>Feedback</th>
                  <th>Date Rated</th>
                  <th className={styles.actionHeader}>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className={styles.profileCell}><Skeleton circle width="40px" height="40px" /></td>
                      <td><Skeleton /></td>
                      <td><Skeleton width="100px" /></td>
                      <td><Skeleton /></td>
                      <td><Skeleton width="100px" /></td>
                      <td><Skeleton /></td>
                      <td><Skeleton width="130px" /></td>
                      <td><Skeleton width="80px" /></td>
                    </tr>
                  ))
                ) : paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#6b7280', fontStyle: 'italic' }}>
                      No CSAT entries found.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((r) => (
                    <tr key={r.id}>
                      <td className={styles.profileCell}>
                        <Avatar
                          src={r.profilePic || ''}
                          name={r.employeeName}
                          size={40}
                        />
                      </td>
                      <td>{r.employeeName}</td>
                      <td>{r.ticketNumber}</td>
                      <td>
                        <div className={styles.subjectCell} title={r.subject}>
                          {r.subject}
                        </div>
                      </td>
                      <td>
                        <span
                          className={styles.ratingBadge}
                          style={{
                            backgroundColor: getRatingColor(r.rating),
                            color: '#fff',
                          }}
                          title={getRatingText(r.rating)}
                        >
                          {r.rating} ★
                        </span>
                      </td>
                      <td>
                        <div className={styles.feedbackCell} title={r.comment}>
                          {r.comment}
                        </div>
                      </td>
                      <td>{formatDate(r.date)}</td>
                      <td className={styles.actionCell}>
                        <button
                          className={styles.viewButton}
                          onClick={() => setSelectedCSAT(r)}
                          title="View details"
                          aria-label={`View CSAT ${r.ticketNumber}`}
                        >
                          <FaEye />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.tablePagination}>
            {!isLoading && (
              <TablePagination
                currentPage={currentPage}
                totalItems={filtered.length}
                initialItemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                alwaysShow={true}
              />
            )}
          </div>
        </div>
      </div>

      {selectedCSAT && (
        <CoordinatorAdminCSATViewModal
          csat={selectedCSAT}
          onClose={() => setSelectedCSAT(null)}
        />
      )}
    </>
  );
};

export default SysAdminCSAT;
