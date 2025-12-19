import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pie, Line } from 'react-chartjs-2';
import chartStyles from './CoordinatorAdminDashboardCharts.module.css';
import tableStyles from './CoordinatorAdminDashboardTable.module.css';
import statCardStyles from './CoordinatorAdminDashboardStatusCards.module.css';
import styles from './CoordinatorAdminDashboard.module.css';
import authService from '../../../utilities/service/authService';
import { backendTicketService } from '../../../services/backend/ticketService';

const ticketPaths = [
  { label: "New Tickets", path: "/admin/ticket-management/new-tickets" },
  { label: "Pending Tickets", path: "/admin/ticket-management/pending-tickets" },
  { label: "Open Tickets", path: "/admin/ticket-management/open-tickets" },
  { label: "In Progress Tickets", path: "/admin/ticket-management/in-progress-tickets" },
  { label: "On Hold Tickets", path: "/admin/ticket-management/on-hold-tickets" }
];

const StatCard = ({ label, count, isHighlight, position, onClick, statusType }) => {
  const getStatusClass = (label) => {
    const statusMap = {
      'New Tickets': 'statBadgeNew',
      'Open Tickets': 'statBadgeOpen', 
      'In Progress Tickets': 'statBadgeInProgress',
      'On Hold Tickets': 'statBadgeOnHold',
      'Pending Tickets': 'statBadgePending'
    };
    return statusMap[label] || (isHighlight ? 'statBadgeRed' : 'statBadgeBlue');
  };

  return (
    <div
      className={`${styles.statusCard} ${statCardStyles.statusCard} ${statCardStyles[`card-position-${position}`]}`}
      onClick={onClick}
    >
      <div className={`${styles.statCardContent} ${statCardStyles.statCardContent}`}>
        <div className={`${styles.statBadge} ${statCardStyles.statBadge} ${statCardStyles[getStatusClass(label)]}`}>
          {count}
        </div>
        <span className={`${styles.statLabel} ${statCardStyles.statLabel}`}>{label}</span>
      </div>
    </div>
  );
};

const DataTable = ({ title, headers, data, maxVisibleRows, loading = false }) => {
  const skeletonRows = maxVisibleRows || 5;
  if (loading) {
    return (
      <div className={tableStyles.tableContainer}>
        <div className={tableStyles.tableHeader}>
          <h3 className={tableStyles.tableTitle}>{title}</h3>
        </div>

        <div
          className={`${tableStyles.tableOverflow} ${maxVisibleRows ? tableStyles.scrollableRows : ''}`}
          style={maxVisibleRows ? { ['--visible-rows']: maxVisibleRows } : {}}
        >
          <table className={tableStyles.table}>
            <thead className={tableStyles.tableHead}>
              <tr>
                {headers.map((header, idx) => (
                  <th key={idx} className={tableStyles.tableHeaderCell}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: skeletonRows }).map((_, rIdx) => (
                <tr key={rIdx} className={tableStyles.tableRow}>
                  {headers.map((_, cIdx) => (
                    <td key={cIdx} className={tableStyles.tableCell}>
                      <div style={{ width: '80%', height: 14, background: '#e5e7eb', borderRadius: 4 }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className={tableStyles.tableContainer}>
      <div className={tableStyles.tableHeader}>
        <h3 className={tableStyles.tableTitle}>{title}</h3>
      </div>

      <div
        className={`${tableStyles.tableOverflow} ${maxVisibleRows ? tableStyles.scrollableRows : ''}`}
        style={maxVisibleRows ? { ['--visible-rows']: maxVisibleRows } : {}}
      >
        {data.length > 0 ? (
          <table className={tableStyles.table}>
            <thead className={tableStyles.tableHead}>
              <tr>
                {headers.map((header, idx) => (
                  <th key={idx} className={tableStyles.tableHeaderCell}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className={tableStyles.tableRow}>
                  {Object.values(row).map((cell, j) => (
                    <td key={j} className={tableStyles.tableCell}>
                      {typeof cell === 'object' ? (
                        <span className={`${tableStyles.statusBadge} ${tableStyles[cell.statusClass]}`}>
                          {cell.text}
                        </span>
                      ) : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={tableStyles.emptyState}>
            No records found.
          </div>
        )}
      </div>
    </div>
  );
};

const TrendLineChart = ({ data, title, isTicketChart = true }) => {
  const chartData = {
    labels: data.map(item => item.month),
    datasets: [
      {
        label: isTicketChart ? 'Submitted Tickets' : 'New Users',
        data: data.map(item => item.dataset1),
        fill: false,
        borderColor: '#3e506cff',
        backgroundColor: '#3e506cff',
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: isTicketChart ? 'Closed Tickets' : 'Active Users',
        data: data.map(item => item.dataset2),
        fill: false,
        borderColor: '#22C55E',
        backgroundColor: '#22C55E',
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  // compute y-axis max from data (round up to sensible step)
  const allValues = (chartData.datasets || []).flatMap(ds => ds.data || []);
  const maxVal = allValues.length ? Math.max(...allValues) : 0;
  const yMax = maxVal <= 5 ? 5 : Math.ceil(maxVal / 5) * 5;
  const yStep = yMax <= 5 ? 1 : Math.ceil(yMax / 5);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          padding: 15,
          font: {
            size: 12,
          },
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      y: {
        beginAtZero: true,
        max: yMax,
        ticks: {
          stepSize: yStep,
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  return (
    <div className={chartStyles.chartContainer}>
      <h3 className={chartStyles.chartTitle}>{title}</h3>
      <div className={chartStyles.chartContent} style={{ height: '300px' }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

const TicketsTab = ({ chartRange, setChartRange, pieRange, setPieRange }) => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const [ticketDataState, setTicketDataState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activityTimeline, setActivityTimeline] = useState([]);
  const [rawTickets, setRawTickets] = useState(null);

  const ticketData = ticketDataState || {
    stats: ticketPaths.map((item, i) => ({
      label: item.label,
      count: 0,
      isHighlight: i >= 7,
      position: i,
      path: item.path
    })),
    tableData: [
      {
        ticketNumber: 'TX0001',
        subject: 'Asset Replacement',
        category: 'IT Support',
        subCategory: 'Hardware',
        status: { text: 'Open', statusClass: 'statusOpen' },
        dateCreated: '06/12/2025 11:00AM'
      },
      {
        ticketNumber: 'TX0002',
        subject: 'Network Problem',
        category: 'IT Support',
        subCategory: 'Network Issue',
        status: { text: 'New', statusClass: 'statusNew' },
        dateCreated: '06/11/2025 1:05PM'
      },
      {
        ticketNumber: 'TX0003',
        subject: 'Software License Request',
        category: 'IT Support',
        subCategory: 'Software',
        status: { text: 'In Progress', statusClass: 'statusInProgress' },
        dateCreated: '06/10/2025 9:20AM'
      },
      {
        ticketNumber: 'TX0004',
        subject: 'Email Issue',
        category: 'IT Support',
        subCategory: 'Email',
        status: { text: 'On Hold', statusClass: 'statusOnHold' },
        dateCreated: '06/09/2025 2:45PM'
      },
      {
        ticketNumber: 'TX0005',
        subject: 'Password Reset',
        category: 'IT Support',
        subCategory: 'Account',
        status: { text: 'New', statusClass: 'statusNew' },
        dateCreated: '06/08/2025 8:15AM'
      }
    ],
    pieData: [],
    lineData: [],
  };

  const normalizeStatus = (raw) => {
    if (!raw) return 'New';
    const s = String(raw).toLowerCase();
    if (s.includes('new') || s.includes('submitted')) return 'New';
    if (s.includes('pending')) return 'Pending';
    if (s.includes('open')) return 'Open';
    if (s.includes('in progress') || s.includes('inprogress')) return 'In Progress';
    if (s.includes('on hold') || s.includes('on-hold')) return 'On Hold';
    if (s.includes('withdraw')) return 'Withdrawn';
    if (s.includes('rejected')) return 'Rejected';
    if (s.includes('closed') || s.includes('resolved')) return 'Closed';
    return String(raw)
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const computeEffectiveStatus = (ticket) => {
    const base = normalizeStatus(ticket.status || 'New');
    if (base === 'New') {
      // Prefer common timestamp fields returned by backend
      const createdRaw = (
        ticket.submit_date || ticket.submitDate || ticket.submit ||
        ticket.createdAt || ticket.created_at || ticket.created ||
        ticket.dateCreated || ticket.date_created || ticket.createdOn || null
      );
      const created = createdRaw ? new Date(createdRaw) : null;
      if (created && !isNaN(created.getTime())) {
        const ageHours = (Date.now() - created.getTime()) / (1000 * 60 * 60);
        if (ageHours >= 24) return 'Pending';
      }
      return 'New';
    }
    return base;
  };

  const getTicketCreatedDate = (t) => {
    const createdRaw = (
      t.submit_date || t.submitDate || t.submit ||
      t.createdAt || t.created_at || t.created ||
      t.dateCreated || t.date_created || t.createdOn || null
    );
    if (!createdRaw) return null;
    const d = new Date(createdRaw);
    return isNaN(d.getTime()) ? null : d;
  };

  const filterByRole = (tickets) => {
    if (currentUser?.role === 'Ticket Coordinator') {
      return tickets.filter(t => t.assignedTo === currentUser.id || t.reviewedById === currentUser.id || t.assignedToName === currentUser?.name);
    }
    return tickets;
  };

  const aggregatePie = (tickets, range) => {
    const buckets = {
      New: 0,
      Pending: 0,
      Open: 0,
      'In Progress': 0,
      'On Hold': 0,
      Withdrawn: 0,
      Closed: 0,
      Rejected: 0,
    };
    let source = tickets;
    if (range) {
      const now = new Date();
      if (range === 'days') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        source = tickets.filter(t => {
          const c = getTicketCreatedDate(t);
          return c && c >= start && c <= now;
        });
      } else if (range === 'week') {
        const dayOfWeek = (now.getDay() + 6) % 7;
        const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        const start = new Date(startOfThisWeek);
        start.setDate(start.getDate() - (3 * 7));
        source = tickets.filter(t => {
          const c = getTicketCreatedDate(t);
          return c && c >= start && c <= now;
        });
      } else if (range === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        source = tickets.filter(t => {
          const c = getTicketCreatedDate(t);
          return c && c >= start && c <= now;
        });
      }
    }

    source.forEach(t => {
      const s = computeEffectiveStatus(t);
      if (buckets[s] !== undefined) {
        buckets[s] += 1;
      } else {
        buckets.Closed += 1;
      }
    });
    const colorMap = {
      New: '#3B82F6',
      Pending: '#FBBF24',
      Open: '#06B6D4',
      'In Progress': '#F59E0B',
      'On Hold': '#EF4444',
      Rejected: '#DC2626',
      Closed: '#10B981'
    };
    const displayMap = {
      New: 'New Tickets',
      Pending: 'Pending Tickets',
      Open: 'Open Tickets',
      'In Progress': 'In Progress Tickets',
      'On Hold': 'On Hold Tickets',
      Withdrawn: 'Withdrawn',
      Closed: 'Closed',
      Rejected: 'Rejected',
    };

    return Object.keys(buckets).map(name => ({ name: displayMap[name] || name, value: buckets[name], fill: colorMap[name] || '#9CA3AF' }));
  };

  const formatMonthLabel = (d) => d.toLocaleString(undefined, { month: 'short' });

  const aggregateLine = (tickets, range = 'month') => {
    const now = new Date();
    if (range === 'days') {
      const days = Array.from({ length: 7 }).map((_, i) => {
        const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
        day.setHours(0,0,0,0);
        return day;
      });
      return days.map(d => {
        const next = new Date(d); next.setDate(d.getDate()+1);
        const submitted = tickets.filter(t => {
          const c = (t.submit_date || t.submitDate || t.createdAt || t.created_at || t.created) ? new Date(t.submit_date || t.submitDate || t.createdAt || t.created_at || t.created) : null;
          return c && c >= d && c < next;
        }).length;
        const closed = tickets.filter(t => {
          const c = (t.time_closed || t.timeClosed || t.closedAt || t.closed_at) ? new Date(t.time_closed || t.timeClosed || t.closedAt || t.closed_at) : null;
          return c && c >= d && c < next;
        }).length;
        const label = `${String(d.getDate()).padStart(2,'0')} ${d.toLocaleString(undefined, { month: 'short' })}`;
        return { month: label, dataset1: submitted, dataset2: closed };
      });
    }
    if (range === 'week') {
      const weeks = [];
      const curr = new Date(now);
      const dayOfWeek = (curr.getDay() + 6) % 7;
      const startOfThisWeek = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() - dayOfWeek);
      for (let i = 3; i >= 0; i--) {
        const start = new Date(startOfThisWeek);
        start.setDate(start.getDate() - (i * 7));
        start.setHours(0,0,0,0);
        const end = new Date(start);
        end.setDate(start.getDate() + 7);
        weeks.push({ start, end });
      }
      return weeks.map((w, idx) => {
        const submitted = tickets.filter(t => { const c = (t.submit_date || t.submitDate || t.createdAt || t.created_at || t.created) ? new Date(t.submit_date || t.submitDate || t.createdAt || t.created_at || t.created) : null; return c && c >= w.start && c < w.end; }).length;
        const closed = tickets.filter(t => { const c = (t.time_closed || t.timeClosed || t.closedAt || t.closed_at) ? new Date(t.time_closed || t.timeClosed || t.closedAt || t.closed_at) : null; return c && c >= w.start && c < w.end; }).length;
        return { month: `W${idx+1}`, dataset1: submitted, dataset2: closed };
      });
    }
    const monthsCount = range === 'yearly' ? 12 : 6;
    const months = Array.from({ length: monthsCount }).map((_, i) => {
      const m = new Date(now.getFullYear(), now.getMonth() - (monthsCount - 1 - i), 1);
      return m;
    });
    return months.map(m => {
      const start = new Date(m.getFullYear(), m.getMonth(), 1);
      const end = new Date(m.getFullYear(), m.getMonth()+1, 1);
      const submitted = tickets.filter(t => { const c = (t.submit_date || t.submitDate || t.createdAt || t.created_at || t.created) ? new Date(t.submit_date || t.submitDate || t.createdAt || t.created_at || t.created) : null; return c && c >= start && c < end; }).length;
      const closed = tickets.filter(t => { const c = (t.time_closed || t.timeClosed || t.closedAt || t.closed_at) ? new Date(t.time_closed || t.timeClosed || t.closedAt || t.closed_at) : null; return c && c >= start && c < end; }).length;
      return { month: formatMonthLabel(m), dataset1: submitted, dataset2: closed };
    });
  };

  useEffect(() => {
    let mounted = true;
    const doLoad = async () => {
      setIsLoading(true);
      try {
        const all = await backendTicketService.getAllTickets();
        const filtered = filterByRole(Array.isArray(all) ? all : (all.results || []));
        if (!mounted) return;
        setRawTickets(filtered);
      } catch (err) {
        console.error('Error loading tickets for dashboard', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    const timer = setTimeout(() => { doLoad(); }, 150);
    return () => { mounted = false; clearTimeout(timer); };
  }, [currentUser]);

  // Recompute derived data (stats, pie, line, table, timeline) whenever
  // the raw tickets or selected ranges change. This avoids re-fetching
  // when the user changes the dropdowns and keeps the data in sync.
  useEffect(() => {
    if (!rawTickets) return;
    const filtered = rawTickets.slice();

    // compute stats
    const stats = ticketPaths.map(p => ({ label: p.label, count: 0, path: p.path }));
    filtered.forEach(t => {
      const s = computeEffectiveStatus(t);
      const mapLabel = ticketPaths.find(p => p.label.toLowerCase().startsWith(s.toLowerCase()));
      if (mapLabel) {
        const target = stats.find(st => st.label === mapLabel.label);
        if (target) target.count += 1;
      }
    });

    const pie = aggregatePie(filtered.concat(), pieRange);
    const line = aggregateLine(filtered.concat(), currentUser?.role === 'System Admin' && chartRange === 'yearly' ? 'yearly' : chartRange);

    // Build activity timeline from tickets (exclude "assigned" events).
    const events = [];
    const pushEvent = (ticketNumber, ts, verb) => {
      if (!ts) return;
      const when = new Date(ts);
      if (isNaN(when.getTime())) return;
      events.push({ ts: when.getTime(), time: formatTimeOnly(when), action: `Ticket ${ticketNumber} ${verb}` });
    };

    filtered.forEach(t => {
      const ticketNumber = t.ticketNumber || t.ticket_number || t.ticketNum || t.ticketNo || t.ticketId || t.id || '';

      const submittedTs = t.submit_date || t.submitDate || t.submit || t.createdAt || t.created_at || t.created || t.dateCreated || t.date_created || t.createdOn || null;
      pushEvent(ticketNumber, submittedTs, 'submitted');

      const closedTs = t.time_closed || t.timeClosed || t.closedAt || t.closed_at || null;
      if (closedTs) {
        pushEvent(ticketNumber, closedTs, t.status && normalizeStatus(t.status).toLowerCase() === 'resolved' ? 'resolved' : 'closed');
      }

      if (normalizeStatus(t.status) === 'Rejected' || t.rejectionReason) {
        const rejTs = t.update_date || t.updateDate || t.updatedAt || t.updated_at || t.update_date || null;
        pushEvent(ticketNumber, rejTs || submittedTs, 'rejected');
      }

      if (normalizeStatus(t.status) === 'Approved' || (t.approved_by && !t.rejectionReason)) {
        const apprTs = t.update_date || t.updateDate || t.updatedAt || t.updated_at || null;
        pushEvent(ticketNumber, apprTs || submittedTs, 'approved');
      }

      if (normalizeStatus(t.status) === 'In Progress') {
        const inprogTs = t.update_date || t.updateDate || t.updatedAt || t.updated_at || null;
        pushEvent(ticketNumber, inprogTs || submittedTs, 'in progress');
      }

      const withdrawnTs = t.withdrawnAt || t.withdrawn_at || t.withdrawn || null;
      if (withdrawnTs) pushEvent(ticketNumber, withdrawnTs, 'withdrawn');
    });

    const computedTimeline = events.sort((a, b) => b.ts - a.ts).slice(0, 4).map(e => ({ time: e.time, action: e.action }));
    setActivityTimeline(computedTimeline);

    // Table: show tickets whose raw/declared status is 'New'.
    const newTickets = filtered.filter(t => normalizeStatus(t.status) === 'New');

    const statusClassMap = {
      'New': 'statusNew',
      'Pending': 'statusPending',
      'Open': 'statusOpen',
      'In Progress': 'statusInProgress',
      'On Hold': 'statusOnHold',
      'Withdrawn': 'statusWithdrawn',
      'Rejected': 'statusRejected',
      'Closed': 'statusClosed'
    };

    const tableData = newTickets.map(t => {
      const created = (
        t.submit_date || t.submitDate || t.submit ||
        t.createdAt || t.created_at || t.created ||
        t.dateCreated || t.date_created || t.createdOn || null
      );
      const ticketNumber = t.ticketNumber || t.ticket_number || t.ticketNum || t.ticketNo || t.ticketId || t.id || '';
      const subject = t.subject || t.title || '';
      const category = t.category || t.assignedDepartment || t.assigned_department || '';
      const subCategory = t.subCategory || t.sub_category || t.subcategory || '';
      const dateCreated = created ? formatDateShort(created) : '';

      const effective = computeEffectiveStatus(t);
      const statusClass = statusClassMap[effective] || 'statusNew';

      return {
        ticketNumber,
        subject,
        category,
        subCategory,
        status: { text: effective, statusClass },
        dateCreated
      };
    });

    setTicketDataState({
      stats,
      tableData,
      pieData: pie,
      lineData: line
    });
  }, [rawTickets, chartRange, pieRange, currentUser]);

  return (
    <>
      <div className={styles.statusCardsGrid} style={{ marginTop: 12 }}>
        {ticketData.stats.map((stat, i) => (
          <StatCard
            key={i}
            {...stat}
            onClick={() => stat.path && navigate(stat.path)}
          />
        ))}
      </div>

      {currentUser?.role === 'Ticket Coordinator' && (
        <DataTable
          title="Tickets to Review"
          headers={['Ticket Number', 'Subject', 'Category', 'Sub-Category', 'Status', 'Date Created']}
          data={ticketData.tableData}
          maxVisibleRows={5}
          loading={isLoading}
        />
      )}

      <div style={{ position: 'relative', marginTop: 12 }}>
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          <select
            value={chartRange}
            onChange={(e) => setChartRange(e.target.value)}
            style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff' }}
          >
            <option value="days">Days</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            {currentUser?.role === 'System Admin' && <option value="yearly">Yearly</option>}
          </select>
        </div>

        <div className={chartStyles.chartsGrid}>
          <StatusPieChart
            data={ticketData.pieData}
            title="Ticket Status"
            activities={activityTimeline}
            pieRange={pieRange}
            setPieRange={setPieRange}
            isAdmin={currentUser?.role === 'System Admin'}
            onBrowse={() => navigate('/admin/ticket-management/all-tickets')}
          />
          <TrendLineChart
            data={(() => {
              const source = ticketData.lineData;
              if (chartRange === 'days') return source.slice(-7);
              if (chartRange === 'week') return source.slice(-4);
              return source;
            })()}
            title="Tickets per Period"
            isTicketChart={true}
          />
        </div>
      </div>
    </>
  );
};

const formatDateShort = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  let hh = d.getHours();
  const min = String(d.getMinutes()).padStart(2, '0');
  const ampm = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12 || 12;
  return `${mm}/${dd}/${yyyy} ${hh}:${min}${ampm}`;
};

const formatTimeOnly = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  let hh = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ampm = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12 || 12;
  return `${hh}:${mm} ${ampm}`;
};

const StatusPieChart = ({ data, title, activities, pieRange, setPieRange, isAdmin, onBrowse }) => {
  const Button = ({ variant, className, onClick, children }) => (
    <button
      className={className}
      onClick={onClick}
      style={{
        padding: '8px 16px',
        backgroundColor: variant === 'primary' ? '#3B82F6' : '#fff',
        color: variant === 'primary' ? '#fff' : '#000',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        cursor: 'pointer'
      }}
    >
      {children}
    </button>
  );

  const chartData = {
    labels: data.map(item => item.name),
    datasets: [
      {
        label: title,
        data: data.map(item => item.value),
        backgroundColor: data.map(item => item.fill),
        borderWidth: 1,
        borderColor: '#fff',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total ? ((value / total) * 100).toFixed(1) : '0.0';
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
  };

  return (
    <div className={chartStyles.chartContainer} style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
        <select
          value={pieRange}
          onChange={(e) => setPieRange(e.target.value)}
          style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff' }}
        >
          <option value="days">Days</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
          {isAdmin && <option value="yearly">Yearly</option>}
        </select>
      </div>
      <h3 className={chartStyles.chartTitle}>{title}</h3>

      <div className={chartStyles.chartContentRow}>
        <div className={chartStyles.statusColumn}>
          {data.map((d, idx) => (
            <div key={idx} className={chartStyles.statusItem}>
              <span className={chartStyles.statusSwatch} style={{ background: d.fill }} />
              <span>{d.name}</span>
            </div>
          ))}
        </div>

        <div style={{ width: '340px', height: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Pie data={chartData} options={options} />
        </div>

        {activities && (
          <ul className={chartStyles.timelineList} style={{ width: '40%' }}>
            {activities.map((item, i) => (
              <li key={i} className={chartStyles.timelineItem}>
                <span className={chartStyles.timelineTime}>{item.time}</span>
                <span className={chartStyles.timelineAction}>{item.action}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TicketsTab;
