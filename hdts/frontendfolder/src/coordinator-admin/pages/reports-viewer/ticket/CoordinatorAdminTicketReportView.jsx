import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Document, Page, Text, View as PDFView, StyleSheet, pdf } from '@react-pdf/renderer';
import reportTicketsData from '../../../../mock-data/reportTickets.json';
import ViewCard from '../../../../shared/components/ViewCard';
import Breadcrumb from '../../../../shared/components/Breadcrumb';
import styles from './CoordinatorAdminTicketReportView.module.css';

// Dynamic report section configuration
const reportSectionConfigs = {
  ticket: {
    title: 'Ticket Report',
    icon: '📋',
    sections: [
      { id: 'volume', label: 'A. Ticket Volume', icon: '📈', type: 'volume' },
      { id: 'categorization', label: 'B. Ticket Categorization', icon: '📊', type: 'categorization' },
      { id: 'status', label: 'C. Ticket Status', icon: '🏷️', type: 'status' },
      { id: 'productivity', label: 'D. Ticket Coordinator Productivity', icon: '👥', type: 'productivity' },
      { id: 'aging', label: 'E. Ticket Aging Analysis', icon: '⏰', type: 'aging' },
    ],
  },
  csat: {
    title: 'CSAT Performance Report',
    icon: '😊',
    sections: [
      { id: 'satisfaction', label: 'A. Overall Satisfaction', icon: '📊', type: 'satisfaction' },
      { id: 'breakdown', label: 'B. Satisfaction Breakdown', icon: '📈', type: 'breakdown' },
      { id: 'trends', label: 'C. Satisfaction Trends', icon: '📉', type: 'trends' },
    ],
  },
  sla: {
    title: 'SLA Compliance Report',
    icon: '⏱️',
    sections: [
      { id: 'compliance', label: 'A. SLA Compliance Overview', icon: '📊', type: 'compliance' },
      { id: 'byPriority', label: 'B. Compliance by Priority', icon: '🎯', type: 'byPriority' },
      { id: 'breaches', label: 'C. SLA Breaches', icon: '⚠️', type: 'breaches' },
    ],
  },
};

// Helper function to convert various date formats to Date object
const toDate = (dateInput) => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'string') {
    const parsed = new Date(dateInput);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(dateInput);
  return isNaN(parsed.getTime()) ? null : parsed;
};

// Determine coordinator/agent name for grouping
const coordinatorName = (t) => {
  if (!t) return 'Unassigned';
  return t.assignedAgent || t.assignedTo || t.assignedCoordinator || t.assigned_to || 'Unassigned';
};

// PDF document component
const PDFDoc = ({ timeframeLabel, volume, categorization, statusBreakdown, coordinatorProductivity, aging, reports = [] }) => {
  const pdfStyles = StyleSheet.create({
    page: { padding: 12, fontSize: 11 },
    header: { fontSize: 16, marginBottom: 8, fontWeight: 'bold' },
    section: { marginBottom: 8 },
    row: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between' },
    small: { fontSize: 9, color: '#666' },
    tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 4 },
    tableRow: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
    col1: { width: '40%' },
    col2: { width: '20%' },
    col3: { width: '20%' },
    col4: { width: '20%' },
  });

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.header}>Ticket Report — {timeframeLabel}</Text>

        <PDFView style={pdfStyles.section}>
          <Text style={{ fontWeight: 'bold' }}>1. Ticket Volume</Text>
          <PDFView style={pdfStyles.row}>
            <Text>Total created: {volume.totalCreated}</Text>
            <Text>Resolved/Closed: {volume.totalResolvedClosed}</Text>
          </PDFView>
          <PDFView style={pdfStyles.row}>
            <Text>Withdrawn: {volume.totalWithdrawn}</Text>
            <Text>Rejected: {volume.totalRejected}</Text>
          </PDFView>
        </PDFView>

        <PDFView style={pdfStyles.section}>
          <Text style={{ fontWeight: 'bold' }}>2. By Category</Text>
          {Object.entries(categorization.byCategory || {}).slice(0, 20).map(([k, v]) => (
            <PDFView key={k} style={pdfStyles.row}>
              <Text>{k}</Text>
              <Text>{v}</Text>
            </PDFView>
          ))}
        </PDFView>

        <PDFView style={pdfStyles.section}>
          <Text style={{ fontWeight: 'bold' }}>3. Status Breakdown (selected)</Text>
          {Object.entries(statusBreakdown || {}).map(([k, v]) => (
            <PDFView key={k} style={pdfStyles.row}>
              <Text>{k}</Text>
              <Text>{v}</Text>
            </PDFView>
          ))}
        </PDFView>

        <PDFView style={pdfStyles.section}>
          <Text style={{ fontWeight: 'bold' }}>4. Coordinator Productivity</Text>
          {Object.entries(coordinatorProductivity || {}).slice(0, 20).map(([name, stats]) => (
            <PDFView key={name} style={{ marginBottom: 4 }}>
              <Text style={{ fontWeight: 'bold' }}>{name}</Text>
              <Text style={pdfStyles.small}>
                Assigned: {stats.assigned} — Resolved: {stats.resolved} — Pending: {stats.pending} — Overdue: {stats.overdue}
              </Text>
            </PDFView>
          ))}
        </PDFView>

        <PDFView style={pdfStyles.section}>
          <Text style={{ fontWeight: 'bold' }}>5. Ticket Aging (New / Pending)</Text>
          <PDFView style={pdfStyles.row}>
            <Text>1-3 days: {aging['1-3']}</Text>
            <Text>4-7 days: {aging['4-7']}</Text>
            <Text>7+ days: {aging['7+']}</Text>
          </PDFView>
        </PDFView>

        <PDFView style={{ marginTop: 8 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Sample Reports</Text>
          <PDFView style={pdfStyles.tableHeader}>
            <Text style={pdfStyles.col1}>Report Name</Text>
            <Text style={pdfStyles.col2}>Period</Text>
            <Text style={pdfStyles.col3}>Total</Text>
            <Text style={pdfStyles.col4}>Generated</Text>
          </PDFView>
          {(reports || []).slice(0, 25).map((t, i) => (
            <PDFView key={i} style={pdfStyles.tableRow}>
              <Text style={pdfStyles.col1}>{String(t.reportName || t.title || t.name || '').slice(0, 60)}</Text>
              <Text style={pdfStyles.col2}>{String(t.period || '').slice(0, 20)}</Text>
              <Text style={pdfStyles.col3}>{String(t.totalTickets || t.count || '')}</Text>
              <Text style={pdfStyles.col4}>{String(t.dateGenerated || t.dateCreated || '').slice(0, 20)}</Text>
            </PDFView>
          ))}
        </PDFView>
      </Page>
    </Document>
  );
};

// Reusable Components
const StatCard = ({ label, value, bgColor = '#E0E7FF', textColor = '#4F46E5' }) => (
  <div 
    className={styles.statCard} 
    style={{ 
      backgroundColor: bgColor,
      borderColor: `${textColor}33`
    }}
  >
    <div className={styles.statCardLabel}>{label}</div>
    <div className={styles.statCardValue} style={{ color: textColor }}>{value}</div>
  </div>
);

const ProgressBar = ({ value, max, color = '#3B82F6' }) => {
  const percentage = (value / max) * 100;
  return (
    <div className={styles.progressBarContainer}>
      <div 
        className={styles.progressBarFill} 
        style={{ 
          width: `${percentage}%`,
          backgroundColor: color 
        }} 
      />
    </div>
  );
};

const TicketReportView = ({
  tickets: incomingTickets = [],
  timeframe: propTimeframe,
  autoGenerate: propAutoGenerate = false,
  reportId: propReportId = '',
  reportType: propReportType = 'ticket',
  reportData: propReportData = null,
}) => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const timeframe = (propTimeframe || params.get('timeframe') || 'daily').toLowerCase();
  const reportId = propReportId || params.get('reportId') || '';
  const autoGenerate = propAutoGenerate || ['1', 'true'].includes(String(params.get('autoGen') || params.get('autogen') || '').toLowerCase());
  const reportType = (propReportType || params.get('reportType') || 'ticket').toLowerCase();

  const reportContainerRef = useRef(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const formatDate = (d) => {
    if (!d) return 'N/A';
    if (typeof d === 'string') return d;
    if (d instanceof Date) return d.toISOString().split('T')[0];
    return 'N/A';
  };

  const handleGenerateReactPdf = async () => {
    if (!reportContainerRef.current) return;
    setIsGenerating(true);
    try {
      const timeframeLabel = timeframe.charAt(0).toUpperCase() + timeframe.slice(1);
      const docElem = (
        <PDFDoc
          timeframeLabel={timeframeLabel}
          volume={volume}
          categorization={categorization}
          statusBreakdown={statusBreakdown}
          coordinatorProductivity={coordinatorProductivity}
          aging={aging}
          reports={filteredReports}
        />
      );

      const blob = await pdf(docElem).toBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (e) {
      console.error('react-pdf generation failed', e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Export to Excel (XLSX format using CSV-like structure)
  const handleExportExcel = () => {
    const timeframeLabel = timeframe.charAt(0).toUpperCase() + timeframe.slice(1);
    const reportName = `${reportType.toUpperCase()}_Report_${timeframeLabel}_${new Date().toISOString().split('T')[0]}`;
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Report Type', reportConfig.title],
      ['Timeframe', timeframeLabel],
      ['Generated', formatDate(new Date())],
      ['Report ID', `${reportType.toUpperCase()}-RPT-${String(reportId || '001').slice(0, 6)}`],
      [],
      ['TICKET VOLUME', ''],
      ['Total Created', volume.totalCreated],
      ['Resolved/Closed', volume.totalResolvedClosed],
      ['Withdrawn', volume.totalWithdrawn],
      ['Rejected', volume.totalRejected],
      ['Backlog', volume.backlogs],
      [],
      ['CATEGORIZATION', ''],
      ...Object.entries(categorization.byCategory).map(([cat, cnt]) => [cat, cnt]),
      [],
      ['STATUS BREAKDOWN', ''],
      ...Object.entries(statusBreakdown).map(([st, cnt]) => [st, cnt]),
    ];

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `${reportName}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to CSV
  const handleExportCsv = () => {
    const timeframeLabel = timeframe.charAt(0).toUpperCase() + timeframe.slice(1);
    const reportName = `${reportType.toUpperCase()}_Report_${timeframeLabel}_${new Date().toISOString().split('T')[0]}`;
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Report Type', reportConfig.title],
      ['Timeframe', timeframeLabel],
      ['Generated', formatDate(new Date())],
      ['Report ID', `${reportType.toUpperCase()}-RPT-${String(reportId || '001').slice(0, 6)}`],
      [],
      ['TICKET VOLUME', ''],
      ['Total Created', volume.totalCreated],
      ['Resolved/Closed', volume.totalResolvedClosed],
      ['Withdrawn', volume.totalWithdrawn],
      ['Rejected', volume.totalRejected],
      ['Backlog', volume.backlogs],
      [],
      ['CATEGORIZATION', ''],
      ...Object.entries(categorization.byCategory).map(([cat, cnt]) => [cat, cnt]),
      [],
      ['STATUS BREAKDOWN', ''],
      ...Object.entries(statusBreakdown).map(([st, cnt]) => [st, cnt]),
      [],
      ['COORDINATOR PRODUCTIVITY', ''],
      ...Object.entries(coordinatorProductivity).map(([name, stats]) => [
        name,
        `Assigned: ${stats.assigned}, Resolved: ${stats.resolved}, Pending: ${stats.pending}, Overdue: ${stats.overdue}`,
      ]),
    ];

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `${reportName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Use incoming tickets if provided, otherwise fall back to the mock dataset
  const reportData = (incomingTickets && incomingTickets.length) ? incomingTickets : reportTicketsData;

  // Filter reports by timeframe
  const filteredReports = useMemo(() => {
    return reportData.filter(report => {
      if (timeframe === 'all') return true;
      return (report.period || '').toLowerCase() === timeframe;
    });
  }, [reportData, timeframe]);

  // Aggregate metrics from filtered reports
  const volume = useMemo(() => {
    const totalCreated = filteredReports.reduce((sum, r) => sum + (r.totalTickets || 0), 0);
    const totalResolvedClosed = filteredReports.reduce((sum, r) => sum + (r.resolved || 0), 0);
    const totalPending = filteredReports.reduce((sum, r) => sum + (r.pending || 0), 0);
    const totalWithdrawn = 0;
    const totalRejected = 0;
    const backlogs = totalPending;

    return {
      totalCreated,
      totalWithdrawn,
      totalResolvedClosed,
      totalRejected,
      backlogs,
    };
  }, [filteredReports]);

  // Categorization - use sample data
  const categorization = useMemo(() => ({
    byCategory: {
      'IT Support': 456,
      'Hardware Issue': 289,
      'Software Issue': 234,
      'Network Issue': 156,
      'Access Request': 110,
    },
    byPriority: {
      'Urgent': 89,
      'High': 234,
      'Medium': 567,
      'Low': 355,
    },
  }), []);

  // Status breakdown
  const statusBreakdown = useMemo(() => {
    const totalTickets = volume.totalCreated || 1;
    return {
      'New': Math.round(totalTickets * 0.036),
      'Pending': Math.round(totalTickets * 0.054),
      'Open': Math.round(totalTickets * 0.071),
      'In Progress': Math.round(totalTickets * 0.099),
      'On Hold': Math.round(totalTickets * 0.045),
      'Resolved': volume.totalResolvedClosed,
      'Withdrawn': Math.round(totalTickets * 0.027),
      'Closed': Math.round(totalTickets * 0.050),
      'Rejected': Math.round(totalTickets * 0.018),
    };
  }, [volume]);

  // Coordinator productivity
  const coordinatorProductivity = useMemo(() => {
    const totalResolved = volume.totalResolvedClosed || 1;
    return {
      'John Smith': {
        assigned: Math.round(totalResolved / 0.88),
        resolved: Math.round(totalResolved * 0.22),
        pending: 22,
        overdue: Math.round(totalResolved * 0.03),
      },
      'Sarah Johnson': {
        assigned: Math.round(totalResolved / 0.91),
        resolved: Math.round(totalResolved * 0.23),
        pending: 14,
        overdue: Math.round(totalResolved * 0.02),
      },
      'Mike Chen': {
        assigned: Math.round(totalResolved / 0.92),
        resolved: Math.round(totalResolved * 0.22),
        pending: 11,
        overdue: Math.round(totalResolved * 0.02),
      },
      'Emma Davis': {
        assigned: Math.round(totalResolved / 0.90),
        resolved: Math.round(totalResolved * 0.20),
        pending: 13,
        overdue: Math.round(totalResolved * 0.03),
      },
      'Alex Wong': {
        assigned: Math.round(totalResolved / 0.90),
        resolved: Math.round(totalResolved * 0.19),
        pending: 13,
        overdue: Math.round(totalResolved * 0.02),
      },
      'Lisa Anderson': {
        assigned: Math.round(totalResolved / 0.88),
        resolved: Math.round(totalResolved * 0.16),
        pending: 14,
        overdue: Math.round(totalResolved * 0.03),
      },
    };
  }, [volume]);

  // Ticket aging
  const aging = useMemo(() => {
    const backlog = volume.backlogs || 1;
    return {
      '1-3': Math.round(backlog * 0.48),
      '4-7': Math.round(backlog * 0.34),
      '7+': Math.round(backlog * 0.18),
    };
  }, [volume]);

  useEffect(() => {
    if (autoGenerate) {
      const t = setTimeout(() => {
        try {
          handleGenerateReactPdf();
        } catch (e) {
          console.error('auto generation failed', e);
        }
      }, 200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [autoGenerate]);

  const totalBacklog = volume.backlogs || 0;
  const getAgingPercentage = (count) => totalBacklog > 0 ? ((count / totalBacklog) * 100).toFixed(1) : 0;
  const getAgingStatus = (days) => {
    if (days === '1-3') return { color: '#10B981', bgColor: '#DCFCE7', message: 'Within acceptable range', icon: '✓' };
    if (days === '4-7') return { color: '#F59E0B', bgColor: '#FEF3C7', message: 'Needs attention', icon: '⚠' };
    if (days === '7+') return { color: '#DC2626', bgColor: '#FEE2E2', message: 'Critical - Immediate action required', icon: '🔴' };
    return { color: '#6B7280', bgColor: '#F3F4F6', message: 'Unknown', icon: '?' };
  };

  // Get config for current report type
  const reportConfig = reportSectionConfigs[reportType] || reportSectionConfigs.ticket;

  // Dynamic section renderer
  const renderSection = (section) => {
    switch (section.type) {
      case 'volume':
        return (
          <section className={styles.section} key={section.id}>
            <h2 className={styles.sectionTitle}>
              {section.icon} {section.label}
            </h2>
            <div className={styles.statCardsGrid}>
              <StatCard label="Total Created" value={volume.totalCreated} bgColor="#E0E7FF" textColor="#4F46E5" />
              <StatCard label="Withdrawn" value={volume.totalWithdrawn} bgColor="#F3E8FF" textColor="#7C3AED" />
              <StatCard label="Resolved" value={volume.totalResolvedClosed} bgColor="#DCFCE7" textColor="#10B981" />
              <StatCard label="Rejected" value={volume.totalRejected} bgColor="#FEE2E2" textColor="#DC2626" />
              <StatCard label="Total Backlog" value={volume.backlogs} bgColor="#FEF3C7" textColor="#F59E0B" />
            </div>
          </section>
        );

      case 'categorization':
        return (
          <section className={styles.section} key={section.id}>
            <h2 className={styles.sectionTitle}>
              {section.icon} {section.label}
            </h2>
            <div className={styles.twoColumnGrid}>
              <div className={styles.card}>
                <div className={styles.cardTitle}>By Category</div>
                <table className={styles.dataTable}>
                  <thead>
                    <tr className={styles.tableHeader}>
                      <th className={styles.tableHeaderCell}>Category</th>
                      <th className={styles.tableHeaderCellCenter}>Count</th>
                      <th className={styles.tableHeaderCellCenter}>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(categorization.byCategory).slice(0, 10).map(([cat, count]) => {
                      const pct = volume.totalCreated > 0 ? ((count / volume.totalCreated) * 100).toFixed(1) : 0;
                      return (
                        <tr key={cat} className={styles.tableRow}>
                          <td className={styles.tableCell}>{cat}</td>
                          <td className={styles.tableCellCenter}>{count}</td>
                          <td className={styles.tableCellPercentage}>{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className={styles.card}>
                <div className={styles.cardTitle}>By Priority</div>
                <table className={styles.dataTable}>
                  <thead>
                    <tr className={styles.tableHeader}>
                      <th className={styles.tableHeaderCell}>Priority</th>
                      <th className={styles.tableHeaderCellCenter}>Count</th>
                      <th className={styles.tableHeaderCellCenter}>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(categorization.byPriority).map(([pri, count]) => {
                      const pct = volume.totalCreated > 0 ? ((count / volume.totalCreated) * 100).toFixed(1) : 0;
                      const colors = {
                        'Urgent': '#DC2626',
                        'High': '#F59E0B',
                        'Medium': '#F59E0B',
                        'Low': '#10B981',
                      };
                      const color = colors[pri] || '#6B7280';
                      return (
                        <tr key={pri} className={styles.tableRow}>
                          <td className={styles.tableCell}>
                            <span className={styles.priorityBadge} style={{ backgroundColor: `${color}22`, color }}>
                              {pri}
                            </span>
                          </td>
                          <td className={styles.tableCellCenter}>{count}</td>
                          <td className={styles.tableCellPercentage}>{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        );

      case 'status':
        return (
          <section className={styles.section} key={section.id}>
            <h2 className={styles.sectionTitle}>
              {section.icon} {section.label}
            </h2>
            <div className={styles.card}>
              <table className={styles.dataTable}>
                <thead>
                  <tr className={styles.tableHeader}>
                    <th className={styles.tableHeaderCell}>Status</th>
                    <th className={styles.tableHeaderCellCenter}>Count</th>
                    <th className={styles.tableHeaderCellCenter}>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(statusBreakdown || {}).map(([st, cnt]) => {
                    const pct = volume.totalCreated > 0 ? ((cnt / volume.totalCreated) * 100).toFixed(1) : 0;
                    return (
                      <tr key={st} className={styles.tableRow}>
                        <td className={styles.tableCell}>{st}</td>
                        <td className={styles.tableCellCenter}>{cnt}</td>
                        <td className={styles.tableCellPercentage}>{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );

      case 'productivity':
        return (
          <section className={styles.section} key={section.id}>
            <h2 className={styles.sectionTitle}>
              {section.icon} {section.label}
            </h2>
            <div className={styles.coordinatorGrid}>
              {Object.entries(coordinatorProductivity || {}).map(([name, stats]) => (
                <div key={name} className={styles.coordinatorCard}>
                  <div className={styles.coordinatorHeader}>
                    <div className={styles.coordinatorName}>{name}</div>
                    <div className={styles.coordinatorStatLabel}>Resolved: {stats.resolved}</div>
                  </div>
                  <div className={styles.coordinatorStats}>
                    <div className={styles.coordinatorStat}>
                      <div className={styles.coordinatorStatLabel}>Assigned</div>
                      <div className={styles.coordinatorStatValue}>{stats.assigned}</div>
                    </div>
                    <div className={styles.coordinatorStat}>
                      <div className={styles.coordinatorStatLabel}>Pending</div>
                      <div className={styles.coordinatorStatValue}>{stats.pending}</div>
                    </div>
                    <div className={styles.coordinatorStat}>
                      <div className={styles.coordinatorStatLabel}>Overdue</div>
                      <div className={styles.coordinatorStatValue} style={{ color: '#DC2626' }}>{stats.overdue}</div>
                    </div>
                  </div>
                  <ProgressBar value={(stats.resolved || 0)} max={(stats.assigned || 1)} color="#10B981" />
                </div>
              ))}
            </div>
          </section>
        );

      case 'aging':
        return (
          <section className={styles.section} key={section.id}>
            <h2 className={styles.sectionTitle}>
              {section.icon} {section.label}
            </h2>
            <div className={styles.agingGrid}>
              {Object.entries(aging || {}).map(([bucket, count]) => {
                const pct = getAgingPercentage(count);
                const s = getAgingStatus(bucket);
                return (
                  <div key={bucket} className={styles.agingCard}>
                    <div className={styles.agingHeader}>
                      <div className={styles.agingDays}>{bucket} days</div>
                      <div className={styles.agingCount} style={{ color: s.color }}>{count}</div>
                    </div>
                    <ProgressBar value={count} max={totalBacklog || 1} color={s.color} />
                    <div className={styles.agingMessage}>{s.message}</div>
                  </div>
                );
              })}
            </div>
          </section>
        );

      default:
        return <div key={section.id}>{section.label} (render not implemented)</div>;
    }
  };

  return (
    <>
      <Breadcrumb
        root="Reports"
        currentPage={reportConfig.title}
        rootNavigatePage={'/admin/reports'}
        title={reportConfig.title}
      />
      <ViewCard>
        <div className={styles.exportControls}>
          <button
            className={styles.exportButton}
            onClick={handleGenerateReactPdf}
            disabled={isGenerating}
            title="Export as PDF"
          >
            {isGenerating ? '⏳ Generating...' : '📄 Export as PDF'}
          </button>
          <button
            className={styles.exportButton}
            onClick={handleExportExcel}
            title="Export as Excel"
          >
            📊 Export as Excel
          </button>
          <button
            className={styles.exportButton}
            onClick={handleExportCsv}
            title="Export as CSV"
          >
            📋 Export as CSV
          </button>
        </div>
        <div className={styles.reportContent}>
          <div className={styles.headerCard}>
            <div>
              <h1 className={styles.headerTitle}>
                {reportConfig.icon} {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} {reportConfig.title}
              </h1>
              <div className={styles.headerMeta}>
                <span>📅 Generated: {formatDate(new Date())}</span>
                <span>📋 Report ID: {String(reportType).toUpperCase()}-RPT-{String(reportId || '001').slice(0, 6)}</span>
                <span>👤 By: System Auto-Generate</span>
              </div>
            </div>
            <div className={styles.headerPeriod}>
              <div className={styles.periodLabel}>Period Type</div>
              <div className={styles.periodValue}>{timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}</div>
            </div>
          </div>

          {reportConfig.sections.map(section => renderSection(section))}

          <section className={styles.footerSection}>
            <div>
              <div className={styles.footerItem}>Report Generated</div>
              <div className={styles.footerValue}>{formatDate(new Date())}</div>
            </div>
            <div>
              <div className={styles.footerItem}>Generated By</div>
              <div className={styles.footerValue}>System Auto-Generate</div>
            </div>
            <div>
              <div className={styles.footerItem}>Report ID</div>
              <div className={styles.footerValue}>
                {String(reportType).toUpperCase()}-RPT-{String(reportId || '001').slice(0, 6)}
              </div>
            </div>
          </section>
        </div>
        <div ref={reportContainerRef} style={{ display: 'none' }} />
      </ViewCard>
    </>
  );
};

export default TicketReportView;