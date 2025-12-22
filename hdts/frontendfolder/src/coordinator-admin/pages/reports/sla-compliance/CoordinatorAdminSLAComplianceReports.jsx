import React, { useMemo, useState, useEffect, useRef } from 'react';
import { FaEye, FaDownload } from 'react-icons/fa';
import reportSLACompliance from '../../../../mock-data/reportSLACompliance.json';
import CoordinatorAdminReportsLayout from '../CoordinatorAdminReportsLayout';
import styles from './CoordinatorAdminSLAComplianceReports.module.css';
import layoutStyles from '../CoordinatorAdminReportsLayout.module.css';
import ticketStyles from '../../ticket-management/CoordinatorAdminTicketManagement.module.css';
import CoordinatorTicketFilter from '../../../components/filters/CoordinatorTicketFilter';
import InputField from '../../../../shared/components/InputField';
import TablePagination from '../../../../shared/table/TablePagination';

const getPeriodBadgeStyle = (period) => {
  const badgeStyles = {
    Daily: { backgroundColor: '#E0E7FF', color: '#4F46E5' },
    Weekly: { backgroundColor: '#F3E8FF', color: '#7C3AED' },
    Monthly: { backgroundColor: '#DCFCE7', color: '#22C55E' },
    Yearly: { backgroundColor: '#FEF3C7', color: '#F59E0B' },
  };
  return badgeStyles[period] || {};
};

const CoordinatorAdminSLAComplianceReports = () => {
  const tabs = [
    { label: 'All', value: 'all' },
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Yearly', value: 'yearly' },
  ];

  const reports = useMemo(() => reportSLACompliance, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState({ status: null, startDate: '', endDate: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Apply basic filtering by status/date
  const filteredReports = useMemo(() => {
    return reports.filter(item => {
      if (activeFilters.status && activeFilters.status.label) {
        if (!item.status) return false;
        if (String(item.status).toLowerCase() !== String(activeFilters.status.label).toLowerCase()) return false;
      }
      if (activeFilters.startDate) {
        try {
          const itemDate = new Date(item.dateGenerated);
          const start = new Date(activeFilters.startDate);
          if (itemDate < start) return false;
        } catch (e) {}
      }
      if (activeFilters.endDate) {
        try {
          const itemDate = new Date(item.dateGenerated);
          const end = new Date(activeFilters.endDate);
          end.setHours(23,59,59,999);
          if (itemDate > end) return false;
        } catch (e) {}
      }
      // search term across reportName / generatedBy
      const matchesSearch = searchTerm
        ? (String(item.reportName || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(item.generatedBy || '').toLowerCase().includes(searchTerm.toLowerCase()))
        : true;
      if (!matchesSearch) return false;
      return true;
    });
  }, [reports, activeFilters]);

  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(start, start + itemsPerPage);
  }, [filteredReports, currentPage, itemsPerPage]);

  const renderReportContent = (range) => {
    // render function used by CoordinatorAdminReportsLayout expects to be called with active tab value
    return (active) => {
      // reset page when active tab changes
      if (lastActiveRef.current !== active) {
        setTimeout(() => setCurrentPage(1), 0);
        lastActiveRef.current = active;
      }
      const periodFilter = active === 'all' ? null : active;

      const filtered = reports.filter(item => {
        if (periodFilter) {
          if (!item.period || String(item.period).toLowerCase() !== String(periodFilter).toLowerCase()) return false;
        }

        const matchesSearch = searchTerm
          ? (String(item.reportName || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(item.generatedBy || '').toLowerCase().includes(searchTerm.toLowerCase()))
          : true;
        if (!matchesSearch) return false;

        if (activeFilters.status && activeFilters.status.label) {
          if (!item.status) return false;
          if (String(item.status).toLowerCase() !== String(activeFilters.status.label).toLowerCase()) return false;
        }
        if (activeFilters.startDate) {
          try {
            const itemDate = new Date(item.dateGenerated);
            const start = new Date(activeFilters.startDate);
            if (itemDate < start) return false;
          } catch (e) {}
        }
        if (activeFilters.endDate) {
          try {
            const itemDate = new Date(item.dateGenerated);
            const end = new Date(activeFilters.endDate);
            end.setHours(23,59,59,999);
            if (itemDate > end) return false;
          } catch (e) {}
        }
        return true;
      });

      const page = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

      return (
        <>
          <div className={ticketStyles.tableHeader}>
            <h2>SLA Compliance Reports</h2>
            <div className={ticketStyles.tableActions}>
              <InputField
                placeholder="Search..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                inputStyle={{ width: '260px' }}
              />
            </div>
          </div>
          <div style={{ paddingBottom: 24 }}>
            <div className={ticketStyles.tableWrapper}>
              <table className={ticketStyles.table}>
                <thead>
                  <tr>
                    <th>Report Name</th>
                    <th>Period</th>
                    <th>Date Generated</th>
                    <th>Status</th>
                    <th>Generated By</th>
                    <th>Total Tickets</th>
                    <th>On Time</th>
                    <th>Due Soon</th>
                    <th>Overdue</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {page.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: "center", padding: 40, color: "#6b7280", fontStyle: "italic" }}>
                        No reports found.
                      </td>
                    </tr>
                  ) : (
                    page.map((report) => (
                      <tr key={report.id}>
                        <td>{report.reportName}</td>
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              ...getPeriodBadgeStyle(report.period),
                            }}
                          >
                            {report.period}
                          </span>
                        </td>
                        <td>{report.dateGenerated}</td>
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor: '#DCFCE7',
                              color: '#22C55E',
                            }}
                          >
                            {report.status}
                          </span>
                        </td>
                        <td>{report.generatedBy}</td>
                        <td style={{ fontWeight: 600 }}>{report.totalTickets}</td>
                        <td style={{ color: '#22C55E', fontWeight: 600 }}>{report.onTime}</td>
                        <td style={{ color: '#F59E0B', fontWeight: 600 }}>{report.dueSoon}</td>
                        <td style={{ color: '#EF4444', fontWeight: 600 }}>{report.overdue}</td>
                        <td>
                          <div className={ticketStyles.actionButtonCont}>
                            <button
                              title="View"
                              className={ticketStyles.actionButton}
                              onClick={() => console.log(`View report ${report.id}`)}
                            >
                              <FaEye />
                            </button>
                            <button
                              title="Export"
                              className={ticketStyles.actionButton}
                              onClick={() => console.log(`Export report ${report.id}`)}
                            >
                              <FaDownload />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className={ticketStyles.tablePagination}>
            <TablePagination
              currentPage={currentPage}
              totalItems={filtered.length}
              initialItemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              alwaysShow={true}
            />
          </div>
        </>
      );
    };
  };

  useEffect(() => {
    // reset paging to first page when filters or search change
    setCurrentPage(1);
  }, [searchTerm, activeFilters]);

  const lastActiveRef = useRef(null);

  return (
    <CoordinatorAdminReportsLayout title="SLA Compliance" tabs={tabs} filter={<CoordinatorTicketFilter
      onApply={setActiveFilters}
      onReset={() => setActiveFilters({ status: null, startDate: '', endDate: '' })}
      initialFilters={activeFilters}
    />}>
      {renderReportContent()}
    </CoordinatorAdminReportsLayout>
  );
};

export default CoordinatorAdminSLAComplianceReports;
