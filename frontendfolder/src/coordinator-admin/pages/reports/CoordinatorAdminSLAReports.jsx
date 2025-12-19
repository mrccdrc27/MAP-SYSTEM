import { useState, useMemo, useEffect } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import styles from './CoordinatorAdminReports.module.css';
import { backendTicketService } from '../../../services/backend/ticketService';
import Skeleton from '../../../shared/components/Skeleton/Skeleton';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const CoordinatorAdminSLAReports = () => {
  const [dateRange, setDateRange] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [allTickets, setAllTickets] = useState([]);
  // Load tickets from backend
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const fetched = await backendTicketService.getAllTickets();
        const raw = Array.isArray(fetched) ? fetched : (fetched?.results || []);

        const normalized = raw.map(t => {
          const createdAt = t.submit_date || t.created_at || t.createdAt || t.submitDate || null;
          const resolvedAt = t.time_closed || t.resolved_at || t.resolvedAt || t.closedAt || null;
          const priorityLevel = t.priority || t.priorityLevel || t.priority_level || 'Not Set';

          return {
            id: t.id || t.ticket_number || t.ticketNumber || null,
            ticketNumber: t.ticket_number || t.ticketNumber || t.ticket_id || '',
            createdAt,
            resolvedAt,
            priorityLevel,
            status: t.status || '',
            // preserve other fields used by SLA calculations or UI
            resolvedAtRaw: resolvedAt,
            raw: t
          };
        });

        if (mounted) setAllTickets(normalized);
      } catch (err) {
        console.error('Failed to load tickets for SLA reports', err);
        if (mounted) setAllTickets([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  // SLA time limits (in hours)
  const SLA_LIMITS = {
    Critical: 4,
    High: 8,
    Medium: 24,
    Low: 48,
  };

  // Calculate SLA status for a ticket
  const calculateSLAStatus = (ticket) => {
    if (!ticket.priorityLevel || ticket.priorityLevel === 'Not Set') {
      return 'N/A';
    }

    const slaLimit = SLA_LIMITS[ticket.priorityLevel];
    if (!slaLimit) return 'N/A';

  const createdDate = new Date(ticket.createdAt);
    const now = new Date();
    const hoursElapsed = (now - createdDate) / (1000 * 60 * 60);

    // If ticket is resolved or closed, check resolution time
    if (['Resolved', 'Closed'].includes(ticket.status)) {
      const resolvedDate = ticket.resolvedAt ? new Date(ticket.resolvedAt) : now;
      const resolutionTime = (resolvedDate - createdDate) / (1000 * 60 * 60);
      return resolutionTime <= slaLimit ? 'Met' : 'Breached';
    }

    // For active tickets
    if (hoursElapsed <= slaLimit) {
      const remainingHours = slaLimit - hoursElapsed;
      if (remainingHours <= slaLimit * 0.2) { // 20% of time remaining
        return 'Due Soon';
      }
      return 'On Time';
    }

    return 'Overdue';
  };

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

    if (selectedPriority !== 'all') {
      tickets = tickets.filter(t => t.priorityLevel === selectedPriority);
    }

    return tickets;
  }, [allTickets, dateRange, selectedPriority]);

  // SLA Metrics
  const slaMetrics = useMemo(() => {
    const ticketsWithSLA = filteredTickets.filter(t => 
      t.priorityLevel && t.priorityLevel !== 'Not Set'
    );

    const statusCounts = {
      'Met': 0,
      'On Time': 0,
      'Due Soon': 0,
      'Overdue': 0,
      'Breached': 0
    };

    ticketsWithSLA.forEach(ticket => {
      const status = calculateSLAStatus(ticket);
      if (statusCounts[status] !== undefined) {
        statusCounts[status]++;
      }
    });

    const total = ticketsWithSLA.length;
    const compliant = statusCounts['Met'] + statusCounts['On Time'];
    const complianceRate = total > 0 ? ((compliant / total) * 100).toFixed(1) : 0;

    return {
      total,
      ...statusCounts,
      complianceRate
    };
  }, [filteredTickets]);

  // SLA Overview Chart
  const slaOverviewData = {
    labels: ['Met SLA', 'On Time', 'Due Soon', 'Overdue', 'Breached'],
    datasets: [{
      data: [
        slaMetrics['Met'],
        slaMetrics['On Time'],
        slaMetrics['Due Soon'],
        slaMetrics['Overdue'],
        slaMetrics['Breached']
      ],
      backgroundColor: [
        '#16a34a', // Met - Green
        '#3b82f6', // On Time - Blue
        '#f59e0b', // Due Soon - Orange
        '#dc2626', // Overdue - Red
        '#991b1b', // Breached - Dark Red
      ],
      borderWidth: 2,
      borderColor: '#ffffff'
    }]
  };

  // SLA by Priority
  const slaPriorityData = useMemo(() => {
    const priorities = ['Critical', 'High', 'Medium', 'Low'];
    const metCounts = [];
    const breachedCounts = [];

    priorities.forEach(priority => {
      const priorityTickets = filteredTickets.filter(t => t.priorityLevel === priority);
      const met = priorityTickets.filter(t => {
        const status = calculateSLAStatus(t);
        return ['Met', 'On Time'].includes(status);
      }).length;
      const breached = priorityTickets.filter(t => {
        const status = calculateSLAStatus(t);
        return ['Overdue', 'Breached'].includes(status);
      }).length;

      metCounts.push(met);
      breachedCounts.push(breached);
    });

    return {
      labels: priorities,
      datasets: [
        {
          label: 'Met SLA',
          data: metCounts,
          backgroundColor: '#16a34a',
          borderRadius: 6,
        },
        {
          label: 'Breached SLA',
          data: breachedCounts,
          backgroundColor: '#dc2626',
          borderRadius: 6,
        }
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
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  const barOptions = {
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
        ticks: { stepSize: 1 }
      }
    }
  };

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
          <div>Loading SLA reports...</div>
        </div>
      )}
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>⏱️ SLA Compliance</h1>
        <p className={styles.pageSubtitle}>Service Level Agreement performance tracking and metrics</p>
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
          <label>Priority:</label>
          <select 
            value={selectedPriority} 
            onChange={(e) => setSelectedPriority(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Priorities</option>
            <option value="Critical">Critical (4h)</option>
            <option value="High">High (8h)</option>
            <option value="Medium">Medium (24h)</option>
            <option value="Low">Low (48h)</option>
          </select>
        </div>
      </div>

      {/* SLA Compliance Summary */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📋</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{slaMetrics.total}</div>
            <div className={styles.statLabel}>Total Tickets</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>✅</div>
          <div className={styles.statContent}>
            <div className={styles.statValue} style={{ color: '#16a34a' }}>
              {slaMetrics['Met'] + slaMetrics['On Time']}
            </div>
            <div className={styles.statLabel}>On Track / Met</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>⚠️</div>
          <div className={styles.statContent}>
            <div className={styles.statValue} style={{ color: '#f59e0b' }}>
              {slaMetrics['Due Soon']}
            </div>
            <div className={styles.statLabel}>Due Soon</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🎯</div>
          <div className={styles.statContent}>
            <div className={styles.statValue} style={{ color: '#3b82f6' }}>
              {slaMetrics.complianceRate}%
            </div>
            <div className={styles.statLabel}>Compliance Rate</div>
          </div>
        </div>
      </div>

      {/* SLA Violations */}
      <div className={styles.alertSection}>
        <div className={styles.alertCard} style={{ borderColor: '#dc2626' }}>
          <div className={styles.alertIcon}>🔴</div>
          <div className={styles.alertContent}>
            <div className={styles.alertValue}>{slaMetrics['Overdue'] + slaMetrics['Breached']}</div>
            <div className={styles.alertLabel}>SLA Violations</div>
            <div className={styles.alertSubtext}>
              {slaMetrics['Overdue']} currently overdue, {slaMetrics['Breached']} breached on closure
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className={styles.section}>
        <div className={styles.chartsGrid}>
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>SLA Status Overview</h3>
            <div className={styles.chartContainer}>
              <Pie data={slaOverviewData} options={pieOptions} />
            </div>
          </div>
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>SLA Compliance by Priority</h3>
            <div className={styles.chartContainer}>
              <Bar data={slaPriorityData} options={barOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* SLA Guidelines */}
      <div className={styles.section}>
        <div className={styles.guidelinesCard}>
          <h3 className={styles.sectionTitle}>📖 SLA Response Time Guidelines</h3>
          <div className={styles.guidelinesGrid}>
            <div className={styles.guidelineItem}>
              <span className={styles.priorityBadge} style={{ background: '#991b1b' }}>Critical</span>
              <span className={styles.guidelineTime}>4 hours</span>
            </div>
            <div className={styles.guidelineItem}>
              <span className={styles.priorityBadge} style={{ background: '#dc2626' }}>High</span>
              <span className={styles.guidelineTime}>8 hours</span>
            </div>
            <div className={styles.guidelineItem}>
              <span className={styles.priorityBadge} style={{ background: '#d97706' }}>Medium</span>
              <span className={styles.guidelineTime}>24 hours</span>
            </div>
            <div className={styles.guidelineItem}>
              <span className={styles.priorityBadge} style={{ background: '#16a34a' }}>Low</span>
              <span className={styles.guidelineTime}>48 hours</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoordinatorAdminSLAReports;
