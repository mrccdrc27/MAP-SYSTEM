import { useState, useMemo, useEffect, useRef } from 'react';
import { Pie, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import styles from './CoordinatorAdminReports.module.css';
import { backendTicketService } from '../../../services/backend/ticketService';
import { TICKET_CATEGORIES } from '../../../shared/constants/ticketCategories';
import Skeleton from '../../../shared/components/Skeleton/Skeleton';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const CoordinatorAdminTicketReports = () => {
  const [dateRange, setDateRange] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [priorityRange, setPriorityRange] = useState('auto');
  const [categoryRange, setCategoryRange] = useState('auto');
  const [allTickets, setAllTickets] = useState([]);

  // Load tickets from backend and normalize them for the reports
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const fetched = await backendTicketService.getAllTickets();
        const raw = Array.isArray(fetched) ? fetched : (fetched?.results || []);

        const normalized = raw.map(t => {
          // Normalize backend shapes to the report's expected shape (createdAt/resolvedAt etc.)
          const createdAt = t.submit_date || t.created_at || t.createdAt || t.submitDate || t.createdAt || null;
          const resolvedAt = t.time_closed || t.resolved_at || t.resolvedAt || t.closedAt || t.closed_at || null;
          const priority = t.priority || t.priorityLevel || t.priority_level || 'Not Set';
          const category = t.category || t.category_name || t.cat || 'Unknown';

          const employeeName = (t.employee && (t.employee.first_name || t.employee.last_name)) ? `${t.employee.first_name || ''} ${t.employee.last_name || ''}`.trim() : (t.employeeName || t.employee_name || '');

          return {
            id: t.id || t.ticket_number || t.ticketNumber || null,
            ticketNumber: t.ticket_number || t.ticketNumber || t.ticket_id || '',
            employeeId: (t.employee && t.employee.id) || t.employeeId || t.employee_id || null,
            employeeName: employeeName,
            employeeDepartment: (t.employee && t.employee.department) || t.department || t.employeeDepartment || '',
            subject: t.subject || t.title || '',
            category: category,
            subcategory: t.sub_category || t.subcategory || t.subCategory || '',
            priority: priority,
            description: t.description || '',
            assignedDepartment: t.department || t.assignedDepartment || '',
            status: t.status || '',
            assignedToName: (t.assigned_to && (t.assigned_to_name || t.assignedToName)) || t.assignedToName || t.assigned_to || null,
            reviewedBy: t.reviewedBy || t.reviewed_by || null,
            createdAt: createdAt,
            updatedAt: t.update_date || t.updatedAt || t.updated_at || null,
            resolvedAt: resolvedAt,
            closedAt: t.time_closed || t.closedAt || t.closed_at || null,
            rejectionReason: t.rejection_reason || t.rejectionReason || t.rejectionReason || null,
            slaStatus: t.sla_status || t.slaStatus || null,
            raw: t
          };
        });

        if (mounted) setAllTickets(normalized);
      } catch (err) {
        console.error('Failed to load tickets for reports', err);
        if (mounted) setAllTickets([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  // Filter tickets by date range
  const filteredTickets = useMemo(() => {
    let tickets = [...allTickets];
    const now = new Date();

    // Note: tickets in local storage use `createdAt`
    if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      tickets = tickets.filter(t => new Date(t.createdAt) >= weekAgo);
    } else if (dateRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      tickets = tickets.filter(t => new Date(t.createdAt) >= monthAgo);
    } else if (dateRange === 'quarter') {
      const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      tickets = tickets.filter(t => new Date(t.createdAt) >= quarterAgo);
    }

    if (selectedCategory !== 'all') {
      // The ticket form shows 'Others' but stored tickets use 'General Request'.
      const filterCategory = selectedCategory === 'Others' ? 'General Request' : selectedCategory;
      tickets = tickets.filter(t => t.category === filterCategory);
    }

    return tickets;
  }, [allTickets, dateRange, selectedCategory]);

  // For charts we must exclude 'New' tickets per requirement
  const filteredTicketsForCharts = useMemo(() => {
    return (filteredTickets || []).filter(t => t.status !== 'New');
  }, [filteredTickets]);

  // Status Distribution (exclude 'New' tickets)
  const statusData = useMemo(() => {
    const tickets = filteredTicketsForCharts || [];
    const statusCount = {};
    tickets.forEach(ticket => {
      const status = ticket.status || 'Unknown';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    const labels = Object.keys(statusCount);
    const defaultColors = [
      '#2563eb', // New (shouldn't appear because we excluded it)
      '#0284c7', // Open
      '#7c3aed', // In Progress
      '#b35000', // On Hold
      '#059669', // Resolved
      '#16a34a', // Closed
      '#dc2626', // Rejected
      '#6b7280', // Withdrawn
    ];
    const backgroundColor = labels.map((_, i) => defaultColors[i % defaultColors.length]);

    return {
      labels,
      datasets: [{
        data: Object.values(statusCount),
        backgroundColor,
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };
  }, [filteredTicketsForCharts]);

  // Priority Distribution (based on currently filtered tickets and excluding 'New')
  const priorityData = useMemo(() => {
    const tickets = filteredTicketsForCharts || [];
    const counts = {};
    tickets.forEach(ticket => {
      const priority = ticket.priorityLevel || ticket.priority || 'Not Set';
      counts[priority] = (counts[priority] || 0) + 1;
    });

    const priorityOrder = ['Critical', 'High', 'Medium', 'Low', 'Not Set'];
    const colorMap = {
      Critical: '#991b1b',
      High: '#dc2626',
      Medium: '#d97706',
      Low: '#16a34a',
      'Not Set': '#6b7280'
    };

    // Always use the fixed priority order for X axis; missing entries show as 0
    const labels = priorityOrder;
    const data = labels.map(l => counts[l] || 0);
    const backgroundColor = labels.map(l => colorMap[l] || '#6b7280');

    return {
      labels,
      datasets: [{ label: 'Tickets', data, backgroundColor, borderRadius: 6 }]
    };
  }, [filteredTicketsForCharts]);

  

  // Category breakdown (exclude 'New')
  const categoryData = useMemo(() => {
    // Ensure the X axis always shows all categories available in the ticket form
    const labels = TICKET_CATEGORIES;
    // Tickets stored as 'General Request' correspond to the 'Others' label in the form
    const storageKeyFor = (label) => (label === 'Others' ? 'General Request' : label);

    const counts = {};
    (filteredTicketsForCharts || []).forEach(ticket => {
      const cat = ticket.category || 'Unknown';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const data = labels.map(l => counts[storageKeyFor(l)] || 0);

    return {
      labels,
      datasets: [{
        label: 'Tickets by Category',
        data,
        backgroundColor: '#3b82f6',
        borderRadius: 6,
      }]
    };
  }, [filteredTicketsForCharts]);

  // Chart options (base bar options used by category/priority charts)
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `Tickets: ${context.parsed?.y ?? context.parsed}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 }
      }
    }
  };

  // Category chart options (allow fixed or auto Y range like Priority)
  const categoryBarOptions = useMemo(() => {
    const dataMax = (categoryData?.datasets?.[0]?.data || []).reduce((a, b) => Math.max(a, b), 0);

    let yMax = null;
    if (categoryRange !== 'auto') {
      const parts = categoryRange.split('-').map(s => parseInt(s.replace(/,/g, ''), 10));
      if (parts.length === 2 && !isNaN(parts[1])) yMax = parts[1];
    }

    const suggestedMax = categoryRange === 'auto' ? Math.max(10, Math.ceil(dataMax / 10) * 10) : undefined;

    return {
      ...barOptions,
      scales: {
        x: {},
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
          ...(yMax ? { max: yMax } : {}),
          ...(suggestedMax ? { suggestedMax } : {})
        }
      }
    };
  }, [categoryRange, categoryData]);


  // Tickets over time (compute from actual createdAt/resolvedAt dates)
  const timelineData = useMemo(() => {
    // Bucket by week labels based on the filteredTickets range
    if (!filteredTickets || filteredTickets.length === 0) {
      return {
        labels: [],
        datasets: [
          { label: 'Created', data: [], borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', tension: 0.4 },
          { label: 'Resolved', data: [], borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.1)', tension: 0.4 }
        ]
      };
    }

  // Determine date buckets (weeks) across filteredTicketsForCharts
  const createdDates = filteredTicketsForCharts.map(t => new Date(t.createdAt));
  const resolvedDates = filteredTicketsForCharts.map(t => t.resolvedAt ? new Date(t.resolvedAt) : null).filter(Boolean);

    const minDate = new Date(Math.min(...createdDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...createdDates.map(d => d.getTime())));

    // Create weekly buckets from minDate to maxDate
    const buckets = [];
    const labels = [];
    const startOfWeek = (d) => {
      const copy = new Date(d);
      copy.setHours(0,0,0,0);
      const day = copy.getDay();
      const diff = copy.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
      copy.setDate(diff);
      return copy;
    };

    let cursor = startOfWeek(minDate);
    const endCursor = startOfWeek(maxDate);
    while (cursor <= endCursor) {
      const next = new Date(cursor);
      next.setDate(next.getDate() + 7);
      labels.push(`${cursor.toLocaleDateString()} - ${new Date(next.getTime()-1).toLocaleDateString()}`);
      buckets.push({ start: new Date(cursor), end: new Date(next.getTime()-1) });
      cursor = next;
    }

    const createdCounts = buckets.map(b => filteredTicketsForCharts.filter(t => {
      const dt = new Date(t.createdAt);
      return dt >= b.start && dt <= b.end;
    }).length);

    const resolvedCounts = buckets.map(b => filteredTicketsForCharts.filter(t => {
      if (!t.resolvedAt) return false;
      const dt = new Date(t.resolvedAt);
      return dt >= b.start && dt <= b.end;
    }).length);

    return {
      labels,
      datasets: [
        { label: 'Created', data: createdCounts, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', tension: 0.4 },
        { label: 'Resolved', data: resolvedCounts, borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.1)', tension: 0.4 }
      ]
    };
  }, [filteredTickets]);

  // Chart options
  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: { size: 12 },
          usePointStyle: true,
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };
  // Dynamic priority chart options depending on selected priorityRange
  const priorityBarOptions = useMemo(() => {
    // compute data max from priorityData
    const dataMax = (priorityData?.datasets?.[0]?.data || []).reduce((a, b) => Math.max(a, b), 0);

    let yMax = null;
    if (priorityRange !== 'auto') {
      const parts = priorityRange.split('-').map(s => parseInt(s.replace(/,/g, ''), 10));
      if (parts.length === 2 && !isNaN(parts[1])) yMax = parts[1];
    }

    // If auto, set suggestedMax to a rounded value of dataMax (for nicer ticks)
    const suggestedMax = priorityRange === 'auto' ? Math.max(10, Math.ceil(dataMax / 10) * 10) : undefined;

    return {
      ...barOptions,
      scales: {
        x: {},
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
          ...(yMax ? { max: yMax } : {}),
          ...(suggestedMax ? { suggestedMax } : {})
        }
      }
    };
  }, [priorityRange, priorityData]);

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 5 }
      }
    }
  };

  // Use the full list of categories from the ticket form (so all options are visible)
  const categories = ['all', ...TICKET_CATEGORIES];

  // Ref for charts grid container (used for potential measurements/animations)
  const chartsGridRef = useRef(null);

  // Summary stats
  const stats = useMemo(() => {
  // Total tickets should reflect all tickets except 'New' tickets (exclude 'New' from total)
  const total = filteredTickets.filter(t => t.status !== 'New').length;
  const open = filteredTickets.filter(t => t.status === 'Open').length;
    const resolved = filteredTickets.filter(t => t.status === 'Resolved').length;
    const closed = filteredTickets.filter(t => t.status === 'Closed').length;

    return { total, open, resolved, closed };
  }, [filteredTickets]);

  if (isLoading) {
    return (
      <div className={styles.reportsPage}>
        <div className={styles.pageHeader}>
          <Skeleton width="300px" height="40px" style={{ marginBottom: '12px' }} />
          <Skeleton width="500px" height="20px" />
        </div>

        <div className={styles.filtersSection}>
          <Skeleton width="200px" height="36px" style={{ marginBottom: '12px' }} />
          <Skeleton width="200px" height="36px" />
        </div>

        <div className={styles.statsContainer} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '24px' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ padding: '12px', borderRadius: '8px', background: '#f9fafb' }}>
              <Skeleton width="80px" height="24px" style={{ marginBottom: '8px' }} />
              <Skeleton width="100px" height="32px" />
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
          {[1, 2].map(i => (
            <Skeleton key={i} width="100%" height="400px" borderRadius="8px" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.reportsPage}>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div>Loading ticket reports...</div>
        </div>
      )}
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>📊 Ticket Reports</h1>
        <p className={styles.pageSubtitle}>Comprehensive ticket analytics and performance metrics</p>
      </div>

      {/* Filters */}
      <div className={styles.filtersSection}>
        <div className={styles.filterGroup}>
          <label>Date Range:</label>
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Time</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 90 Days</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Category:</label>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={styles.filterSelect}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
        
        <div className={styles.filterGroup}>
          <label>Priority Range:</label>
          <select
            value={priorityRange}
            onChange={(e) => setPriorityRange(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="auto">Auto</option>
            <option value="0-50">0 - 50</option>
            <option value="50-100">50 - 100</option>
            <option value="100-1000">100 - 1,000</option>
            <option value="1000-10000">1,000 - 10,000</option>
            <option value="10000-100000">10,000 - 100,000</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Category Range:</label>
          <select
            value={categoryRange}
            onChange={(e) => setCategoryRange(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="auto">Auto</option>
            <option value="0-50">0 - 50</option>
            <option value="50-100">50 - 100</option>
            <option value="100-1000">100 - 1,000</option>
            <option value="1000-10000">1,000 - 10,000</option>
            <option value="10000-100000">10,000 - 100,000</option>
          </select>
        </div>
      </div>
      

      {/* Summary Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📊</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Total Tickets</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🔄</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.open}</div>
            <div className={styles.statLabel}>Open Tickets</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>✅</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.resolved}</div>
            <div className={styles.statLabel}>Resolved</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🎯</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.closed}</div>
            <div className={styles.statLabel}>Closed</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className={styles.section}>
  <div className={styles.chartsGrid} ref={chartsGridRef}>
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Status Distribution</h3>
            <div className={styles.chartContainer}>
              <Pie data={statusData} options={pieOptions} />
            </div>
          </div>
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Priority Breakdown</h3>
            <div className={styles.chartContainer}>
              <Bar data={priorityData} options={priorityBarOptions} />
            </div>
          </div>
        </div>
        
        <div className={styles.chartsGrid}>
          {/* Show Tickets by Category only when 'All Categories' is selected */}
          {/** Tickets by Category: collapsible with smooth transition **/}
          {/* Tickets by Category: fades out when a specific category is selected */}
          <div
            className={styles.chartCard}
            aria-hidden={selectedCategory === 'all' ? 'false' : 'true'}
            style={{ display: selectedCategory === 'all' ? 'block' : 'none', gridRow: 1 }}
          >
            <h3 className={styles.chartTitle}>Tickets by Category</h3>
            <div className={styles.chartContainer}>
              <Bar data={categoryData} options={categoryBarOptions} />
            </div>
          </div>

          {/* Timeline acts as the sliding door/gate: expands from its slot to span two columns */}
          <div
            className={`${styles.chartCard} ${styles['slidingDoor']}`}
            style={{ gridColumn: selectedCategory === 'all' ? 'auto' : '1 / span 2', gridRow: 1 }}
          >
            <h3 className={styles.chartTitle}>Ticket Trends Over Time</h3>
            <div className={styles.chartContainer}>
              <Line data={timelineData} options={lineOptions} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoordinatorAdminTicketReports;
