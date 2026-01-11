import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pie, Line } from 'react-chartjs-2';
import chartStyles from './CoordinatorAdminDashboardCharts.module.css';
import tableStyles from './CoordinatorAdminDashboardTable.module.css';
import statCardStyles from './CoordinatorAdminDashboardStatusCards.module.css';
import styles from './CoordinatorAdminDashboard.module.css';
import authService from '../../../utilities/service/authService';
import { backendTicketService } from '../../../services/backend/ticketService';

const myTicketPaths = [
  { label: "Critical", path: "/admin/my-tickets/critical" },
  { label: "High", path: "/admin/my-tickets/high" },
  { label: "Medium", path: "/admin/my-tickets/medium" },
  { label: "Low", path: "/admin/my-tickets/low" }
];

const StatCard = ({ label, count, isHighlight, position, onClick, statusType }) => {
  const getStatusClass = (label) => {
    const statusMap = {
      'Critical': 'statBadgeCritical',
      'High': 'statBadgeHigh',
      'Medium': 'statBadgeMedium', 
      'Low': 'statBadgeLow',
      'Very Low': 'statBadgeVeryLow'
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

const DataTable = ({ title, headers, data, maxVisibleRows, loading = false, onRowClick }) => {
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
              {data.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className={`${tableStyles.tableRow} ${onRowClick ? tableStyles.clickableRow : ''}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={onRowClick ? { cursor: 'pointer' } : undefined}
                >
                  <td className={tableStyles.tableCell}>{row.ticketNumber}</td>
                  <td className={tableStyles.tableCell}>{row.subject}</td>
                  <td className={tableStyles.tableCell}>{row.category}</td>
                  <td className={tableStyles.tableCell}>{row.subCategory}</td>
                  <td className={tableStyles.tableCell}>
                    <span className={`${tableStyles.statusBadge} ${tableStyles[row.status.statusClass]}`}>
                      {row.status.text}
                    </span>
                  </td>
                  <td className={tableStyles.tableCell}>{row.dateCreated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
            No data available
          </div>
        )}
      </div>
    </div>
  );
};

const StatusPieChart = ({ data, title, activities, pieRange, setPieRange }) => {
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

const TrendLineChart = ({ data, title }) => {
  const chartData = {
    labels: data.map(item => item.month),
    datasets: [
      {
        label: 'Submitted Tickets',
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
        label: 'Closed Tickets',
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

const MyTicketsTab = ({ chartRange = 'month', setChartRange, pieRange = 'month', setPieRange }) => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const [ticketDataState, setTicketDataState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activityTimeline, setActivityTimeline] = useState([]);

  // Default empty data
  const defaultData = {
    stats: myTicketPaths.map((item, i) => ({
      label: item.label,
      count: 0,
      isHighlight: i >= 7,
      position: i,
      path: item.path
    })),
    tableData: [],
    pieData: [
      { name: 'Critical', value: 0, fill: '#DC2626' },
      { name: 'High', value: 0, fill: '#EA580C' },
      { name: 'Medium', value: 0, fill: '#F59E0B' },
      { name: 'Low', value: 0, fill: '#2563EB' }
    ],
    lineData: []
  };

  const ticketData = ticketDataState || defaultData;

  // Fetch owned tickets from the backend
  useEffect(() => {
    let mounted = true;
    
    const fetchMyTickets = async () => {
      try {
        setIsLoading(true);
        
        // Call the my-tickets endpoint which filters by ticket_owner_id
        const response = await backendTicketService.getMyTickets();
        
        if (!mounted) return;
        
        // Process the response data
        const tickets = Array.isArray(response) ? response : [];
        
        // Calculate priority stats
        const priorityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
        tickets.forEach(ticket => {
          if (ticket.priority && priorityCounts[ticket.priority] !== undefined) {
            priorityCounts[ticket.priority]++;
          }
        });
        
        const stats = myTicketPaths.map((item, i) => ({
          label: item.label,
          count: priorityCounts[item.label] || 0,
          isHighlight: i >= 7,
          position: i,
          path: item.path
        }));
        
        // Status class mapping
        const statusClassMap = {
          'New': 'statusNew',
          'Open': 'statusOpen',
          'In Progress': 'statusInProgress',
          'On Hold': 'statusOnHold',
          'Pending': 'statusPending',
          'Resolved': 'statusResolved',
          'Closed': 'statusClosed',
          'Rejected': 'statusRejected',
          'Withdrawn': 'statusWithdrawn'
        };
        
        // Transform tickets to table data
        const tableData = tickets.map(ticket => ({
          ticketNumber: ticket.ticket_number,
          subject: ticket.subject || 'N/A',
          category: ticket.category || 'N/A',
          subCategory: ticket.sub_category || 'N/A',
          status: {
            text: ticket.status || 'Unknown',
            statusClass: statusClassMap[ticket.status] || 'statusNew'
          },
          dateCreated: ticket.submit_date ? new Date(ticket.submit_date).toLocaleString() : 'N/A'
        }));
        
        // Pie data for priority distribution
        const pieData = [
          { name: 'Critical', value: priorityCounts.Critical, fill: '#DC2626' },
          { name: 'High', value: priorityCounts.High, fill: '#EA580C' },
          { name: 'Medium', value: priorityCounts.Medium, fill: '#F59E0B' },
          { name: 'Low', value: priorityCounts.Low, fill: '#2563EB' }
        ];
        
        // Generate activity timeline from recent tickets
        const recentTickets = tickets.slice(0, 5);
        const timeline = recentTickets.map(ticket => ({
          time: ticket.submit_date ? new Date(ticket.submit_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          action: `Ticket ${ticket.ticket_number} assigned to you`
        }));
        
        setTicketDataState({
          stats,
          tableData,
          pieData,
          lineData: [] // TODO: Generate line data from ticket history if needed
        });
        setActivityTimeline(timeline);
        setIsLoading(false);
        
      } catch (error) {
        console.error('Error fetching my tickets:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchMyTickets();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Handle row click to navigate to ticket detail
  const handleRowClick = (row) => {
    if (row && row.ticketNumber) {
      navigate(`/admin/owned-tickets/${row.ticketNumber}`);
    }
  };

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

      <DataTable
        title="My Assigned Tickets"
        headers={['Ticket Number', 'Subject', 'Category', 'Sub-Category', 'Status', 'Date Created']}
        data={ticketData.tableData}
        maxVisibleRows={5}
        loading={isLoading}
        onRowClick={handleRowClick}
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
          </select>
        </div>

        <div className={chartStyles.chartsGrid}>
          <StatusPieChart
            data={ticketData.pieData}
            title="My Tickets by Priority"
            activities={activityTimeline}
            pieRange={pieRange}
            setPieRange={setPieRange}
          />
          <TrendLineChart
            data={(() => {
              const source = ticketData.lineData;
              if (chartRange === 'days') return source.slice(-7);
              if (chartRange === 'week') return source.slice(-4);
              return source;
            })()}
            title="My Tickets per Period"
          />
        </div>
      </div>
    </>
  );
};

export default MyTicketsTab;
