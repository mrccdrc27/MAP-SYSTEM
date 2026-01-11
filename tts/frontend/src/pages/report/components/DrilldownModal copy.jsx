import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import styles from "./drilldown-modal.module.css";

/**
 * DrilldownModal - Displays detailed records when drilling down into analytics
 * 
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Callback to close the modal
 * @param {string} title - Modal title
 * @param {object} data - Drilldown response data with pagination info
 * @param {array} columns - Column definitions [{ key, label, render? }]
 * @param {function} onPageChange - Callback when page changes (receives page number)
 * @param {boolean} loading - Loading state
 * @param {function} onRowClick - Optional callback when row is clicked
 */
export default function DrilldownModal({
  isOpen,
  onClose,
  title,
  data,
  columns = [],
  onPageChange,
  loading = false,
  onRowClick,
}) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [prevItems, setPrevItems] = useState([]);
  const [prevTotalPages, setPrevTotalPages] = useState(1);

  // Get items array from data - handle different response structures
  const items = data?.tickets || data?.tasks || data?.task_items || data?.transfers || [];
  const totalCount = data?.total_count || 0;
  const totalPages = data?.total_pages || 1;
  const pageSize = data?.page_size || 20;

  // Sort items by assigned_on field (latest to oldest) if the field exists
  const sortedItems = [...items].sort((a, b) => {
    const dateA = a.assigned_on || a.assigned_at || a.created_at;
    const dateB = b.assigned_on || b.assigned_at || b.created_at;
    
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    
    return new Date(dateB) - new Date(dateA); // Descending order (latest first)
  });

  // Preserve previous items during loading for smooth transitions
  useEffect(() => {
    if (sortedItems.length > 0) {
      setPrevItems(sortedItems);
      setPrevTotalPages(totalPages);
    }
  }, [sortedItems, totalPages]);

  // Reset page when data changes
  useEffect(() => {
    if (data?.page) {
      setCurrentPage(data.page);
    }
  }, [data?.page]);

  // Use previous items while loading to prevent shrinking
  const displayItems = loading && prevItems.length > 0 ? prevItems : sortedItems;
  const displayTotalPages = loading ? prevTotalPages : totalPages;

  if (!isOpen) return null;

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= displayTotalPages) {
      setCurrentPage(newPage);
      if (onPageChange) {
        onPageChange(newPage);
      }
    }
  };

  const handleRowClick = (item) => {
    if (loading) return;
    
    // Use onRowClick prop if provided
    if (onRowClick) {
      onRowClick(item);
      return;
    }
    
    // Default navigation to archive detail page
    const ticketId = item.ticket_number || item.ticket_id || item.id;
    if (ticketId) {
      navigate(`/admin/archive/${ticketId}`);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(displayTotalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  if (!isOpen) return null;

  return createPortal(
    <div className={styles.modalBackdrop} onClick={handleBackdropClick}>
      <div className={styles.modalContent}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <div className={styles.headerInfo}>
            <span className={styles.totalCount}>
              {totalCount.toLocaleString()} {totalCount === 1 ? 'record' : 'records'}
            </span>
            <button className={styles.closeBtn} onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filters Applied */}
        {data?.filters_applied && Object.keys(data.filters_applied).some(k => data.filters_applied[k]) && (
          <div className={styles.filtersBar}>
            <span className={styles.filtersLabel}>Filters:</span>
            {Object.entries(data.filters_applied).map(([key, value]) =>
              value && (
                <span key={key} className={styles.filterTag}>
                  {key.replace(/_/g, ' ')}: {value}
                </span>
              )
            )}
          </div>
        )}

        {/* Content */}
        <div className={styles.modalBody}>
          {/* Show empty state only when not loading and no items */}
          {!loading && sortedItems.length === 0 && prevItems.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No records found matching your criteria</p>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              {/* Loading overlay */}
              {loading && (
                <div className={styles.loadingOverlay}>
                  <div className={styles.spinner}></div>
                  <p>Loading records...</p>
                </div>
              )}
              <div className={`${styles.tableWrapper} ${loading ? styles.tableLoading : ''}`}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      {columns.map((col) => (
                        <th key={col.key}>{col.label}</th>
                      ))}
                      <th className={styles.actionCol}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayItems.map((item, idx) => (
                      <tr
                        key={item.task_id || item.task_item_id || item.ticket_number || idx}
                        className={styles.clickableRow}
                        onClick={() => handleRowClick(item)}
                      >
                        {columns.map((col) => (
                          <td key={col.key}>
                            {col.render ? col.render(item[col.key], item) : formatValue(item[col.key])}
                          </td>
                        ))}
                        <td className={styles.actionCol}>
                          <ExternalLink size={16} className={styles.actionIcon} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {displayTotalPages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft size={18} />
            </button>

            {getPageNumbers().map((pageNum) => (
              <button
                key={pageNum}
                className={`${styles.pageBtn} ${pageNum === currentPage ? styles.active : ''}`}
                onClick={() => handlePageChange(pageNum)}
                disabled={loading}
              >
                {pageNum}
              </button>
            ))}

            <button
              className={styles.pageBtn}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === displayTotalPages || loading}
            >
              <ChevronRight size={18} />
            </button>

            <span className={styles.pageInfo}>
              Page {currentPage} of {displayTotalPages}
            </span>
          </div>
        )}
      </div>
    </div>,
    document.getElementById('modal-root')
  );
}

/**
 * Format value for display
 */
function formatValue(value) {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  // Check if it's a date string
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleString();
  }

  // Check if it's an array
  if (Array.isArray(value)) {
    return value.join(', ') || '-';
  }

  return String(value);
}

/**
 * Pre-defined column configurations for common drilldown types
 */
export const DRILLDOWN_COLUMNS = {
  tickets: [
    { key: 'ticket_number', label: 'Ticket #' },
    { key: 'subject', label: 'Subject' },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
    { key: 'priority', label: 'Priority', render: (val) => <PriorityBadge priority={val} /> },
    { key: 'workflow_name', label: 'Workflow' },
    { key: 'created_at', label: 'Created', render: (val) => formatDate(val) },
    { key: 'sla_status', label: 'SLA', render: (val) => <SLABadge status={val} /> },
  ],
  ticketsSimple: [
    { key: 'ticket_number', label: 'Ticket #' },
    { key: 'subject', label: 'Subject' },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
    { key: 'priority', label: 'Priority', render: (val) => <PriorityBadge priority={val} /> },
    { key: 'created_at', label: 'Created', render: (val) => formatDate(val) },
  ],
  sla: [
    { key: 'ticket_number', label: 'Ticket #' },
    { key: 'subject', label: 'Subject' },
    { key: 'priority', label: 'Priority', render: (val) => <PriorityBadge priority={val} /> },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
    { key: 'target_resolution', label: 'Target', render: (val) => formatDate(val) },
    { key: 'sla_status', label: 'SLA', render: (val) => <SLABadge status={val} /> },
    { key: 'time_remaining_hours', label: 'Remaining (hrs)' },
    { key: 'time_overdue_hours', label: 'Overdue (hrs)' },
  ],
  taskItems: [
    { key: 'ticket_number', label: 'Ticket #' },
    { key: 'subject', label: 'Subject' },
    { key: 'user_name', label: 'Assigned To' },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
    { key: 'origin', label: 'Origin' },
    { key: 'assigned_on', label: 'Assigned', render: (val) => formatDate(val) },
    { key: 'step_name', label: 'Step' },
  ],
  userTasks: [
    { key: 'ticket_number', label: 'Ticket #' },
    { key: 'subject', label: 'Subject' },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
    { key: 'origin', label: 'Origin' },
    { key: 'assigned_on', label: 'Assigned', render: (val) => formatDate(val) },
    { key: 'time_to_action_hours', label: 'Action Time (hrs)' },
    { key: 'sla_status', label: 'SLA', render: (val) => <SLABadge status={val} /> },
  ],
  workflows: [
    { key: 'ticket_number', label: 'Ticket #' },
    { key: 'subject', label: 'Subject' },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
    { key: 'current_step', label: 'Current Step' },
    { key: 'created_at', label: 'Created', render: (val) => formatDate(val) },
  ],
  transfers: [
    { key: 'ticket_number', label: 'Ticket #' },
    { key: 'from_user', label: 'From' },
    { key: 'to_user', label: 'To' },
    { key: 'origin', label: 'Type' },
    { key: 'step_name', label: 'Step' },
    { key: 'transferred_at', label: 'Date', render: (val) => formatDate(val) },
  ],
};

// Helper components for rendering badges - matches system design (dynamic-table.module.css)
function StatusBadge({ status }) {
  const statusConfig = {
    'open': { color: '#0EA5E9', bg: '#A6CCDD' },
    'approved': { color: '#10B981', bg: '#A7D1C3' },
    'in progress': { color: '#6366F1', bg: '#BCBCDF' },
    'in_progress': { color: '#6366F1', bg: '#BCBCDF' },
    'pending': { color: '#F59E0B', bg: '#FEF3C7' },
    'completed': { color: '#10B981', bg: '#A7D1C3' },
    'new': { color: '#0EA5E9', bg: '#A6CCDD' },
    'resolved': { color: '#10B981', bg: '#A7D1C3' },
    'escalated': { color: '#EF4444', bg: '#FEE2E2' },
    'reassigned': { color: '#F59E0B', bg: '#FEF3C7' },
    'on_hold': { color: '#6B7280', bg: '#F3F4F6' },
    'cancelled': { color: '#EF4444', bg: '#FEE2E2' },
  };
  const config = statusConfig[status?.toLowerCase()] || { color: '#6B7280', bg: '#F3F4F6' };
  return (
    <span style={{
      display: 'inline-block',
      color: config.color,
      backgroundColor: config.bg,
      padding: '2px 10px',
      borderRadius: '12px',
      fontSize: '0.75rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      textAlign: 'center',
    }}>
      {status || '-'}
    </span>
  );
}

function PriorityBadge({ priority }) {
  // Uses CSS variables from index.css
  const priorityConfig = {
    'critical': { color: 'var(--critical-color, #a00000)', bg: 'var(--critical-bg-color, #f8d7da)' },
    'high': { color: 'var(--high-color, #b35000)', bg: 'var(--high-bg-color, #ffe5b4)' },
    'medium': { color: 'var(--medium-color, #b38f00)', bg: 'var(--medium-bg-color, #fff9cc)' },
    'low': { color: 'var(--low-color, #2e7d32)', bg: 'var(--low-bg-color, #d0f0c0)' },
  };
  const config = priorityConfig[priority?.toLowerCase()] || { color: '#6B7280', bg: '#F3F4F6' };
  return (
    <span style={{
      display: 'inline-block',
      color: config.color,
      backgroundColor: config.bg,
      padding: '2px 10px',
      borderRadius: '12px',
      fontSize: '0.75rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      textAlign: 'center',
    }}>
      {priority || '-'}
    </span>
  );
}

function SLABadge({ status }) {
  const slaConfig = {
    'met': { color: '#10B981', bg: '#A7D1C3' },
    'on_track': { color: '#0EA5E9', bg: '#A6CCDD' },
    'at_risk': { color: 'var(--high-color, #b35000)', bg: 'var(--high-bg-color, #ffe5b4)' },
    'breached': { color: 'var(--critical-color, #a00000)', bg: 'var(--critical-bg-color, #f8d7da)' },
    'no_sla': { color: '#6B7280', bg: '#F3F4F6' },
  };
  const slaLabels = {
    'met': 'Met',
    'on_track': 'On Track',
    'at_risk': 'At Risk',
    'breached': 'Breached',
    'no_sla': 'No SLA',
  };
  const config = slaConfig[status] || { color: '#6B7280', bg: '#F3F4F6' };
  return (
    <span style={{
      display: 'inline-block',
      color: config.color,
      backgroundColor: config.bg,
      padding: '2px 10px',
      borderRadius: '12px',
      fontSize: '0.75rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      textAlign: 'center',
    }}>
      {slaLabels[status] || status || '-'}
    </span>
  );
}

function formatDate(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}
