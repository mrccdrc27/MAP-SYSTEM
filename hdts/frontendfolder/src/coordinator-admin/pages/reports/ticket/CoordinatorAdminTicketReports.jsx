import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaDownload } from 'react-icons/fa';
import CoordinatorAdminReportsLayout from '../CoordinatorAdminReportsLayout';
import layoutStyles from '../CoordinatorAdminReportsLayout.module.css';
import ticketStyles from '../../ticket-management/CoordinatorAdminTicketManagement.module.css';
import CoordinatorTicketFilter from '../../../components/filters/CoordinatorTicketFilter';
import InputField from '../../../../shared/components/InputField';
import reportTickets from '../../../../mock-data/reportTickets.json';
import TablePagination from '../../../../shared/table/TablePagination';

const CoordinatorAdminTicketReports = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState({
    status: null,
    priority: null,
    category: null,
    subCategory: null,
    slaStatus: null,
    startDate: "",
    endDate: "",
  });
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const navigate = useNavigate();
  
  // Track previous active tab properly
  const lastActiveRef = useRef('all');

  // Reset to page 1 if search term or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilters]);



  // Handler for filter changes
  const handleFilterChange = (newFilters) => {
    setActiveFilters(newFilters);
  };

  // Handler for filter reset
  const handleFilterReset = () => {
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
  };

  return (
    <CoordinatorAdminReportsLayout title="" filter={
      <CoordinatorTicketFilter
        onApply={handleFilterChange}
        onReset={handleFilterReset}
        initialFilters={activeFilters}
      />
    }>
      {(active) => {
        // Reset page when tab changes
        useEffect(() => {
          if (lastActiveRef.current !== active) {
            setCurrentPage(1);
            lastActiveRef.current = active;
          }
        }, [active]);

        // Filter by active tab (period) + search + filter panel
        const periodFilter = active === 'all' ? null : active.toLowerCase();

        const filteredData = reportTickets.filter(item => {
          // Period filter
          if (periodFilter) {
            const itemPeriod = item.period ? String(item.period).toLowerCase() : '';
            if (itemPeriod !== periodFilter) return false;
          }

          // Search term match across fields
          if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = Object.values(item).some(val => 
              val && String(val).toLowerCase().includes(searchLower)
            );
            if (!matchesSearch) return false;
          }

          // Status filter
          if (activeFilters.status) {
            const filterStatus = activeFilters.status.label || activeFilters.status;
            const itemStatus = item.status ? String(item.status).toLowerCase() : '';
            if (filterStatus && itemStatus !== String(filterStatus).toLowerCase()) {
              return false;
            }
          }

          // Date range filter
          if (activeFilters.startDate) {
            try {
              const itemDate = new Date(item.dateGenerated);
              const start = new Date(activeFilters.startDate);
              if (isNaN(itemDate.getTime()) || isNaN(start.getTime())) {
                // If dates are invalid, skip filter
              } else {
                // Compare dates without time
                const itemDateOnly = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
                const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                if (itemDateOnly < startDateOnly) return false;
              }
            } catch (e) {
              console.error('Error parsing start date:', e);
            }
          }

          if (activeFilters.endDate) {
            try {
              const itemDate = new Date(item.dateGenerated);
              const end = new Date(activeFilters.endDate);
              if (isNaN(itemDate.getTime()) || isNaN(end.getTime())) {
                // If dates are invalid, skip filter
              } else {
                // Compare dates without time
                const itemDateOnly = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
                const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
                if (itemDateOnly > endDateOnly) return false;
              }
            } catch (e) {
              console.error('Error parsing end date:', e);
            }
          }

          return true;
        });

        const paginatedData = filteredData.slice(
          (currentPage - 1) * itemsPerPage, 
          currentPage * itemsPerPage
        );

        const columns = [
          { key: 'reportName', label: 'Report Name' },
          {
            key: 'period',
            label: 'Period',
            render: (val) => {
              const colors = {
                Daily: { bg: '#E0E7FF', text: '#4F46E5' },
                Weekly: { bg: '#F3E8FF', text: '#7C3AED' },
                Monthly: { bg: '#DCFCE7', text: '#22C55E' },
                Yearly: { bg: '#FEF3C7', text: '#F59E0B' },
              };
              const color = colors[val] || { bg: '#e5e7eb', text: '#1f2937' };
              return (
                <span style={{
                  backgroundColor: color.bg,
                  color: color.text,
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}>
                  {val}
                </span>
              );
            },
          },
          { key: 'dateGenerated', label: 'Date Generated' },
          {
            key: 'status',
            label: 'Status',
            render: (val) => (
              <span style={{
                backgroundColor: '#DCFCE7',
                color: '#22C55E',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 500,
              }}>
                {val}
              </span>
            ),
          },
          { key: 'generatedBy', label: 'Generated By' },
          {
            key: 'totalTickets',
            label: 'Total Tickets',
            render: (val) => <span style={{ fontWeight: 'bold' }}>{val}</span>,
          },
          {
            key: 'resolved',
            label: 'Resolved',
            render: (val) => <span style={{ color: '#22C55E', fontWeight: 'bold' }}>{val}</span>,
          },
          {
            key: 'pending',
            label: 'Pending',
            render: (val) => <span style={{ color: '#EF4444', fontWeight: 'bold' }}>{val}</span>,
          },
          {
            key: 'id',
            label: 'Actions',
            render: (val, row) => (
              <div className={ticketStyles.actionButtonCont}>
                <button
                  title="View"
                  className={ticketStyles.actionButton}
                  onClick={() => {
                    // Frontend-only navigation to the report viewer page (force URL so it works in all cases)
                    const tf = String(active || 'daily').toLowerCase();
                    const url = `/admin/reports/ticket/view?timeframe=${encodeURIComponent(tf)}&reportId=${encodeURIComponent(row.id || '')}&autoGen=1`;
                    // Try SPA navigation first; on failure fall back to a full navigation
                    try {
                      navigate(url);
                    } catch (e) {
                      window.location.href = url;
                    }
                  }}
                >
                  <FaEye />
                </button>
                <button
                  title="Export"
                  className={ticketStyles.actionButton}
                  onClick={() => console.log('Export report:', row)}
                >
                  <FaDownload />
                </button>
              </div>
            ),
          },
        ];

        return (
          <>
            <div className={ticketStyles.tableHeader}>
              <h2>Ticket Reports</h2>
              <div className={ticketStyles.tableActions}>
                <InputField
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  inputStyle={{ width: '260px' }}
                />
              </div>
            </div>
            <div className={ticketStyles.tableWrapper}>
              <table className={ticketStyles.table}>
                <thead>
                  <tr>
                    {columns.map(col => (
                      <th key={col.key}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.length}
                        style={{
                          textAlign: 'center',
                          padding: '40px',
                          color: '#6b7280',
                          fontStyle: 'italic',
                        }}
                      >
                        No data found.
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((row, idx) => (
                      <tr
                        key={row.id || idx}
                        style={{
                          borderBottom: '1px solid #e5e7eb',
                          transition: '0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {columns.map(col => (
                          <td
                            key={col.key}
                            style={{
                              padding: '12px 16px',
                              color: '#1f2937',
                            }}
                          >
                            {col.render ? col.render(row[col.key], row) : row[col.key]}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className={ticketStyles.tablePagination}>
              <TablePagination
                currentPage={currentPage}
                totalItems={filteredData.length}
                initialItemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                alwaysShow={true}
              />
            </div>
            
          </>
        );
      }}
    </CoordinatorAdminReportsLayout>
  );
};

export default CoordinatorAdminTicketReports;