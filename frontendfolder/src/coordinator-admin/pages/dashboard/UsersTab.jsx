import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pie, Line } from 'react-chartjs-2';
import chartStyles from './CoordinatorAdminDashboardCharts.module.css';
import tableStyles from './CoordinatorAdminDashboardTable.module.css';
import statCardStyles from './CoordinatorAdminDashboardStatusCards.module.css';
import styles from './CoordinatorAdminDashboard.module.css';
import authService from '../../../utilities/service/authService';
import { backendUserService } from '../../../services/backend/userService.js';

const userPaths = [
  { label: "All Users", path: "/admin/user-access/all-users" },
  { label: "Employees", path: "/admin/user-access/employees" },
  { label: "Ticket Coordinators", path: "/admin/user-access/ticket-coordinators" },
  { label: "System Administrators", path: "/admin/user-access/system-admins" },
  { label: "Pending Accounts", path: "/admin/user-access/pending-users" },
  { label: "Rejected Accounts", path: "/admin/user-access/rejected-users" },
];

const StatCard = ({ label, count, isHighlight, position, onClick, statusType }) => {
  const getStatusClass = (label) => {
    const statusMap = {
      'Pending Users': 'statBadgePending'
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

const DataTable = ({ title, headers, data, maxVisibleRows, loading }) => (
  <div className={tableStyles.tableContainer}>
    <div className={tableStyles.tableHeader}>
      <h3 className={tableStyles.tableTitle}>{title}</h3>
    </div>

    <div
      className={`${tableStyles.tableOverflow} ${maxVisibleRows ? tableStyles.scrollableRows : ''}`}
      style={ maxVisibleRows ? { ['--visible-rows']: maxVisibleRows } : {} }
    >
      {loading ? (
        <table className={tableStyles.table}>
          <thead className={tableStyles.tableHead}>
            <tr>
              {headers.map((header, idx) => (
                <th key={idx} className={tableStyles.tableHeaderCell}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxVisibleRows || 5 }).map((_, i) => (
              <tr key={i} className={tableStyles.tableRow}>
                {headers.map((h, j) => (
                  <td key={j} className={tableStyles.tableCell}>
                    <div style={{ background: '#f3f4f6', height: 16, borderRadius: 4, width: j === 0 ? '60%' : '90%' }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : data.length > 0 ? (
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

const UsersTab = ({ chartRange, setChartRange, pieRange, setPieRange }) => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  const [users, setUsers] = useState([]); // currently displayed users (pending hdts employees)
  const [rawUsers, setRawUsers] = useState([]); // all users from auth service
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState(null);

  // Helpers to read common fields across API shapes
  const getUserCompanyId = (u) => u.companyId || u.company_id || u.companyID || u.company || '';
  const getUserFirstName = (u) => u.firstName || u.first_name || u.first_name || u.first || '';
  const getUserLastName = (u) => u.lastName || u.last_name || u.last_name || u.last || '';
  const getUserDepartment = (u) => u.department || u.dept || u.department_name || '';
  const getUserRole = (u) => u.role || (u.system_roles && u.system_roles[0] && u.system_roles[0].role_name) || u.user_role || '';
  const getUserStatus = (u) => (u.status || u.account_status || u.state || '').toString();
  const getUserJoinedDate = (u) => (u.date_joined || u.dateJoined || u.created_at || u.created || null);

  useEffect(() => {
    // Fetch once on mount. Avoid depending on a freshly-parsed currentUser object
    // (authService.getCurrentUser() returns a new object each call), which caused
    // this effect to re-run every render and produce flickering skeletons.
    let mounted = true;
    setLoadingUsers(true);

    // Read a stable snapshot of current user for local filtering
    const current = authService.getCurrentUser();

    // Try fetching pending HDTS users and all HDTS users (for pie) in parallel
    Promise.allSettled([
      backendUserService.getPendingHdtsUsers(),
      backendUserService.getAllHdtsUsers()
    ]).then((results) => {
      if (!mounted) return;
      const [pendingRes, allHdtsRes] = results;

      // normalize pending users
      let pendingRaw = [];
      if (pendingRes.status === 'fulfilled') {
        const pr = pendingRes.value;
        pendingRaw = Array.isArray(pr) ? pr : (pr.users || pr.results || []);
      }

      // normalize hdts users (for pie)
      let hdtsRaw = [];
      if (allHdtsRes.status === 'fulfilled') {
        const ar = allHdtsRes.value;
        hdtsRaw = Array.isArray(ar) ? ar : (ar.users || ar.results || []);
      }

      const mapUser = (o) => ({
        ...o,
        companyId: getUserCompanyId(o),
        firstName: getUserFirstName(o),
        lastName: getUserLastName(o),
        department: getUserDepartment(o),
        role: getUserRole(o),
        status: getUserStatus(o),
        date_joined: getUserJoinedDate(o),
      });

      const mappedPending = pendingRaw.map(mapUser);
      const mappedHdts = hdtsRaw.map(mapUser);

      // apply visibility filter for Ticket Coordinators
      let visible = mappedPending;
      if (current) {
        if (current.role === 'Ticket Coordinator') {
          visible = mappedPending.filter((m) => m.department === current.department);
        }
      }

      setUsers(visible);
      setRawUsers(mappedHdts);
      setLoadingUsers(false);
    }).catch((e) => {
      console.error('Failed to load users (fallback):', e);
      if (mounted) {
        setUsers([]);
        setUsersError(e);
        setLoadingUsers(false);
      }
    });

    return () => { mounted = false; };
  }, []);

  // Derived UI data
  // Compute counts from HDTS users fetched (rawUsers contains HDTS users mapped)
  const hdtsUsers = rawUsers || [];

  const isEmployeeInHdts = (u) => {
    const roles = Array.isArray(u.system_roles) ? u.system_roles : (u.system_roles ? [u.system_roles] : []);
    return roles.some(r => ((r.system_slug || r.system_name || '').toString().toLowerCase() === 'hdts') && ((r.role_name || r.role || '').toString().toLowerCase() === 'employee'));
  };

  const getStatusLower = (u) => (getUserStatus(u) || '').toString().toLowerCase();

  const inactiveCount = hdtsUsers.filter(u => (u.is_active === false || u.is_active === 0 || u.is_active === '0')).length;

  const pendingCount = hdtsUsers.filter(u => isEmployeeInHdts(u) && getStatusLower(u) === 'pending').length;
  const rejectedCount = hdtsUsers.filter(u => isEmployeeInHdts(u) && /reject|rejected/i.test(getStatusLower(u))).length;

  // Active Users = all HDTS users (admins, coordinators, etc.) except employees who are pending or rejected, and exclude inactive accounts.
  const activeCount = hdtsUsers.filter(u => {
    if (u.is_active === false || u.is_active === 0 || u.is_active === '0') return false; // inactive excluded
    const isEmployee = isEmployeeInHdts(u);
    const st = getStatusLower(u);
    if (isEmployee && (st === 'pending' || /reject|rejected/.test(st))) return false; // exclude employee pending/rejected
    return true; // include admins, coordinators regardless of status, and employees who are not pending/rejected
  }).length;

  const userData = {
    stats: [
      'Pending Users'
    ].map((label, i) => ({
      label,
      count: pendingCount,
      isHighlight: false,
      position: i,
      path: userPaths.find(p => p.label === label)?.path
    })),
    tableData: users.map(u => ({
      companyId: u.companyId || '',
      lastName: u.lastName || '',
      firstName: u.firstName || '',
      department: u.department || '',
      role: u.role || '',
      status: { text: (u.status || '').toString(), statusClass: (
        (/pending/i.test(u.status) ? 'statusPending' : (/approved|active/i.test(u.status) ? 'statusApproved' : (/reject|rejected/i.test(u.status) ? 'statusRejected' : (/inactive/i.test(u.status) ? 'statusInactive' : 'statusApproved'))))
      ) }
    })),
    pieData: [
      { name: 'Active Users', value: activeCount, fill: '#22C55E' },
      { name: 'Pending', value: pendingCount, fill: '#FBBF24' },
      { name: 'Rejected', value: rejectedCount, fill: '#EF4444' },
      { name: 'Inactive', value: inactiveCount, fill: '#9CA3AF' }
    ],
    lineData: (function buildLineData() {
      // Simple monthly buckets for the last 6 months as fallback
      const now = new Date();
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleString('default', { month: 'short' });
        months.push({ label, start: new Date(d.getFullYear(), d.getMonth(), 1), end: new Date(d.getFullYear(), d.getMonth() + 1, 1) });
      }

      return months.map(m => {
        const inBucket = users.filter(u => {
          const dj = getUserJoinedDate(u);
          if (!dj) return false;
          const d = new Date(dj);
          return d >= m.start && d < m.end;
        });
        const activeInBucket = inBucket.filter(u => /approved|active/i.test(getUserStatus(u))).length;
        return { month: m.label, dataset1: inBucket.length, dataset2: activeInBucket };
      });
    })()
  };

  const userActivityTimeline = users
    .slice() // copy
    .sort((a, b) => new Date(getUserJoinedDate(b) || 0) - new Date(getUserJoinedDate(a) || 0))
    .slice(0, 4)
    .map(u => {
      const time = (() => {
        const dj = getUserJoinedDate(u);
        if (!dj) return '';
        const d = new Date(dj);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      })();
      return { time, action: `User ${u.companyId || ''} account created`, type: 'user' };
    });

  return (
    <>
      <div className={styles.statusCardsGrid} style={{ marginTop: 12 }}>
        {userData.stats.map((stat, i) => (
          <StatCard
            key={i}
            {...stat}
            onClick={() => stat.path && navigate(stat.path)}
          />
        ))}
      </div>

      <DataTable
        title="User Approval"
        headers={['Company ID', 'Last Name', 'First Name', 'Department', 'Role', 'Status']}
        data={userData.tableData}
        maxVisibleRows={5}
        loading={loadingUsers}
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
            {currentUser?.role === 'System Admin' && <option value="yearly">Yearly</option>}
          </select>
        </div>

        <div className={chartStyles.chartsGrid}>
          <StatusPieChart
            data={userData.pieData}
            title="User Status"
            activities={userActivityTimeline}
            pieRange={pieRange}
            setPieRange={setPieRange}
            isAdmin={currentUser?.role === 'System Admin'}
            onBrowse={() => navigate('/admin/user-access/all-users')}
          />
          <TrendLineChart
            data={(() => {
              const source = userData.lineData;
              if (chartRange === 'days') return source.slice(-7);
              if (chartRange === 'week') return source.slice(-4);
              return source;
            })()}
            title="Users per Period"
            isTicketChart={false}
          />
        </div>
      </div>
    </>
  );
};

export default UsersTab;
