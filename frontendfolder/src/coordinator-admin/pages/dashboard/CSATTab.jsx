import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pie, Line } from 'react-chartjs-2';
import chartStyles from './CoordinatorAdminDashboardCharts.module.css';
import tableStyles from './CoordinatorAdminDashboardTable.module.css';
import statCardStyles from './CoordinatorAdminDashboardStatusCards.module.css';
import styles from './CoordinatorAdminDashboard.module.css';
import authService from '../../../utilities/service/authService';
import Skeleton from '../../../shared/components/Skeleton/Skeleton';
import { backendTicketService } from '../../../services/backend/ticketService';

const StatCard = ({ label, count, isHighlight, position, onClick, statusType }) => {
  const getStatusClass = (label) => {
    const statusMap = {};
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

      <Button variant="primary" className={chartStyles.browseButtonFull} onClick={onBrowse}>Browse All</Button>
    </div>
  );
};

const TrendLineChart = ({ data, title, isTicketChart = true }) => {
  const chartData = {
    labels: data.map(item => item.month),
    datasets: [
      {
        label: 'Average Score',
        data: data.map(item => item.dataset1),
        fill: false,
        borderColor: '#3e506cff',
        backgroundColor: '#3e506cff',
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
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
        ticks: {
          autoSkip: true,
          maxRotation: 0,
          minRotation: 0,
        }
      },
      y: {
        beginAtZero: true,
        min: 0,
        max: 5,
        ticks: {
          stepSize: 0.5,
          callback: function(value) { return value.toFixed(1); }
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

const CSATTab = ({ chartRange, setChartRange, pieRange, setPieRange }) => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const [csatTickets, setCSatTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCSATData = async () => {
      try {
        const tickets = await backendTicketService.getAllTickets();
        // Filter tickets with CSAT ratings (closed tickets that have ratings)
        const ratedTickets = tickets.filter(t => t.csat_rating && t.csat_rating > 0);
        setCSatTickets(ratedTickets);
      } catch (error) {
        console.error('Failed to fetch CSAT data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCSATData();
  }, []);

  // Calculate statistics from real data
  const totalResponses = csatTickets.length;
  const averageScore = totalResponses > 0 
    ? (csatTickets.reduce((sum, t) => sum + t.csat_rating, 0) / totalResponses).toFixed(1)
    : '0.0';
  const excellentCount = csatTickets.filter(t => t.csat_rating === 5).length;
  // Count ratings 1-4 as Needs Improvement per user request
  const needsImprovementCount = csatTickets.filter(t => (t.csat_rating >= 1 && t.csat_rating <= 4)).length;

  // Build table data from real tickets
  const formatRating = (rating) => {
    if (!rating && rating !== 0) return 'N/A';
    return `${rating} \u2B50`;
  };

  const formatSubmittedDate = (dateInput) => {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    const datePart = d.toLocaleDateString();
    const timePart = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s(?=[AP]M$)/, '');
    return `${datePart} ${timePart}`;
  };

  // Sort tickets by submitted/updated date (newest first), then take recent 5
  const tableData = csatTickets
    .slice()
    .sort((a, b) => {
      const ta = new Date(a.update_date || a.updatedAt).getTime() || 0;
      const tb = new Date(b.update_date || b.updatedAt).getTime() || 0;
      return tb - ta;
    })
    .slice(0, 5) // Show recent 5
    .map(ticket => {
      const ratingClassDefault = 'ratingExcellent';
      let ratingClass = ratingClassDefault;
      if (ticket.csat_rating === 4) ratingClass = 'ratingGood';
      else if (ticket.csat_rating === 3) ratingClass = 'ratingNeutral';
      else if (ticket.csat_rating <= 2) ratingClass = 'ratingPoor';

      return {
        ticketNumber: ticket.ticket_number || ticket.ticketNumber,
        subject: ticket.subject,
        rating: { text: formatRating(ticket.csat_rating), statusClass: ratingClass },
        feedback: ticket.feedback || 'No feedback provided',
        submittedDate: formatSubmittedDate(ticket.update_date || ticket.updatedAt)
      };
    });

  // Build pie chart data from real ratings
  const ratingCounts = {
    5: csatTickets.filter(t => t.csat_rating === 5).length,
    4: csatTickets.filter(t => t.csat_rating === 4).length,
    3: csatTickets.filter(t => t.csat_rating === 3).length,
    2: csatTickets.filter(t => t.csat_rating === 2).length,
    1: csatTickets.filter(t => t.csat_rating === 1).length,
  };

  const pieData = [
    { name: 'Excellent (5★)', value: ratingCounts[5], fill: '#10B981' },
    { name: 'Good (4★)', value: ratingCounts[4], fill: '#3B82F6' },
    { name: 'Neutral (3★)', value: ratingCounts[3], fill: '#F59E0B' },
    { name: 'Poor (2★)', value: ratingCounts[2], fill: '#EF4444' },
    { name: 'Very Poor (1★)', value: ratingCounts[1], fill: '#7F1D1D' }
  ];

  const csatData = {
    stats: [
      { label: 'Average Score', count: averageScore, path: null },
      { label: 'Total Responses', count: totalResponses, path: null },
      { label: 'Excellent', count: excellentCount, path: null },
      { label: 'Needs Improvement', count: needsImprovementCount, path: null }
    ],
    tableData,
    pieData,
    // lineData will be computed dynamically based on `chartRange` and `csatTickets`
    lineData: []
  };

  // Helpers to build labels and average values per period
  const monthShort = (d) => d.toLocaleString(undefined, { month: 'short' });

  const buildLineData = (range) => {
    const now = new Date();
    const results = [];

    if (range === 'days') {
      // Last 7 days ending today (labels like '15 Nov')
      for (let i = 6; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(now.getDate() - i);
        const label = `${day.getDate()} ${monthShort(day)}`;
        const dayStr = day.toDateString();
        const ticketsForDay = csatTickets.filter(t => {
          const d = new Date(t.update_date || t.updatedAt);
          return d.toDateString() === dayStr;
        });
        const avg = ticketsForDay.length ? (ticketsForDay.reduce((s, x) => s + x.csat_rating, 0) / ticketsForDay.length) : 0;
        results.push({ month: label, dataset1: Number(avg.toFixed(2)) });
      }
      return results;
    }

    if (range === 'week') {
      // Divide current month into 4 buckets: W1..W4
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let w = 0; w < 4; w++) {
        const start = Math.floor((w * daysInMonth) / 4) + 1;
        const end = Math.floor(((w + 1) * daysInMonth) / 4);
        const label = `W${w + 1}`;
        const ticketsForWeek = csatTickets.filter(t => {
          const d = new Date(t.update_date || t.updatedAt);
          return d.getMonth() === month && d.getFullYear() === year && d.getDate() >= start && d.getDate() <= end;
        });
        const avg = ticketsForWeek.length ? (ticketsForWeek.reduce((s, x) => s + x.csat_rating, 0) / ticketsForWeek.length) : 0;
        results.push({ month: label, dataset1: Number(avg.toFixed(2)) });
      }
      return results;
    }

    if (range === 'month') {
      // Last 6 months including current month
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = monthShort(d);
        const monthIndex = d.getMonth();
        const year = d.getFullYear();
        const ticketsForMonth = csatTickets.filter(t => {
          const td = new Date(t.update_date || t.updatedAt);
          return td.getMonth() === monthIndex && td.getFullYear() === year;
        });
        const avg = ticketsForMonth.length ? (ticketsForMonth.reduce((s, x) => s + x.csat_rating, 0) / ticketsForMonth.length) : 0;
        results.push({ month: label, dataset1: Number(avg.toFixed(2)) });
      }
      return results;
    }

    // yearly: last 12 months ending with current month (previous 11 + current)
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = monthShort(d);
      const monthIndex = d.getMonth();
      const year = d.getFullYear();
      const ticketsForMonth = csatTickets.filter(t => {
        const td = new Date(t.update_date || t.updatedAt);
        return td.getMonth() === monthIndex && td.getFullYear() === year;
      });
      const avg = ticketsForMonth.length ? (ticketsForMonth.reduce((s, x) => s + x.csat_rating, 0) / ticketsForMonth.length) : 0;
      results.push({ month: label, dataset1: Number(avg.toFixed(2)) });
    }
    return results;
  };

  // Update csatData.lineData dynamically based on current chartRange
  csatData.lineData = buildLineData(chartRange);

  const csatActivityTimeline = csatTickets
    .slice()
    .sort((a, b) => {
      const ta = new Date(a.update_date || a.updatedAt).getTime() || 0;
      const tb = new Date(b.update_date || b.updatedAt).getTime() || 0;
      return tb - ta;
    })
    .slice(0, 5)
    .map(ticket => {
    const time = new Date(ticket.update_date || ticket.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s(?=[AP]M$)/, '');
    let ratingText = '';
    switch (ticket.csat_rating) {
      case 5:
        ratingText = `${formatRating(5)} Excellent Feedback`;
        break;
      case 4:
        ratingText = `${formatRating(4)} Good Feedback`;
        break;
      case 3:
        ratingText = `${formatRating(3)} Neutral Feedback`;
        break;
      case 2:
        ratingText = `${formatRating(2)} Poor Feedback`;
        break;
      case 1:
        ratingText = `${formatRating(1)} Very Poor Feedback`;
        break;
      default:
        ratingText = `${formatRating(ticket.csat_rating)} Feedback`;
    }

    return {
      time,
      action: `CSAT ${ticket.ticket_number || ticket.ticketNumber} - ${ratingText}`,
      type: 'csat'
    };
  });

  if (isLoading) {
    return (
      <>
        <div className={styles.statusCardsGrid} style={{ marginTop: 12 }}>
          {csatData.stats.map((stat, i) => (
            <StatCard
              key={i}
              label={stat.label}
              count={stat.count}
              onClick={() => stat.path && navigate(stat.path)}
            />
          ))}
        </div>

        <DataTable
          title="Recent CSAT Feedback"
          headers={['Ticket Number', 'Subject', 'Rating', 'Feedback', 'Date Submitted']}
          data={[]}
          loading={true}
          maxVisibleRows={5}
        />
        <div style={{ position: 'relative', marginTop: 12 }}>
          <div style={{ position: 'absolute', top: 8, right: 8 }}>
            <select
              value={chartRange}
              onChange={(e) => setChartRange(e.target.value)}
              disabled
              style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff' }}
            >
              <option value="days">Days</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              {(currentUser?.role === 'System Admin' || currentUser?.role === 'Ticket Coordinator') && <option value="yearly">Yearly</option>}
            </select>
          </div>

          <div className={chartStyles.chartsGrid}>
            <div style={{ width: '340px', height: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Skeleton width="100%" height="340px" borderRadius="8px" />
            </div>
            <div style={{ width: '100%', minHeight: '300px' }}>
              <Skeleton width="100%" height="300px" borderRadius="8px" />
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={styles.statusCardsGrid} style={{ marginTop: 12 }}>
        {csatData.stats.map((stat, i) => (
          <StatCard
            key={i}
            label={stat.label}
            count={stat.count}
            onClick={() => stat.path && navigate(stat.path)}
          />
        ))}
      </div>

      <DataTable
        title="Recent CSAT Feedback"
        headers={['Ticket Number', 'Subject', 'Rating', 'Feedback', 'Date Submitted']}
        data={csatData.tableData}
        maxVisibleRows={5}
      />

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
            {(currentUser?.role === 'System Admin' || currentUser?.role === 'Ticket Coordinator') && <option value="yearly">Yearly</option>}
          </select>
        </div>

        <div className={chartStyles.chartsGrid}>
          <StatusPieChart
            data={csatData.pieData}
            title="CSAT Rating Distribution"
            activities={csatActivityTimeline}
            pieRange={pieRange}
            setPieRange={setPieRange}
            isAdmin={currentUser?.role === 'System Admin' || currentUser?.role === 'Ticket Coordinator'}
            onBrowse={() => navigate('/admin/csat/all')}
          />
          <TrendLineChart
            data={(() => {
              const source = csatData.lineData;
              if (chartRange === 'days') return source.slice(-7);
              if (chartRange === 'week') return source.slice(-4);
              return source;
            })()}
            title="Average Score & Responses per Period"
            isTicketChart={false}
          />
        </div>
      </div>
    </>
  );
};

export default CSATTab;
