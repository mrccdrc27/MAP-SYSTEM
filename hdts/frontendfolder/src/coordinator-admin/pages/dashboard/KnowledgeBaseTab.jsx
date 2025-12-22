import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pie, Line } from 'react-chartjs-2';
import chartStyles from './CoordinatorAdminDashboardCharts.module.css';
import tableStyles from './CoordinatorAdminDashboardTable.module.css';
import statCardStyles from './CoordinatorAdminDashboardStatusCards.module.css';
import styles from './CoordinatorAdminDashboard.module.css';
import authService from '../../../utilities/service/authService';
import kbService from '../../../services/kbService';

const kbFeedbackTypes = [
  { label: 'Helpful', type: 'helpful' },
  { label: 'Neutral', type: 'neutral' },
  { label: 'Not Helpful', type: 'notHelpful' }
];

const StatCard = ({ label, count, onClick }) => {
  return (
    <div
      className={`${styles.statusCard} ${statCardStyles.statusCard}`}
      onClick={onClick}
    >
      <div className={`${styles.statCardContent} ${statCardStyles.statCardContent}`}>
        <div className={`${styles.statBadge} ${statCardStyles.statBadge} ${statCardStyles.statBadgeBlue}`}>
          {count}
        </div>
        <span className={`${styles.statLabel} ${statCardStyles.statLabel}`}>{label}</span>
      </div>
    </div>
  );
};

const DataTable = ({ title, headers, data, maxVisibleRows, loading = false }) => (
  <div className={tableStyles.tableContainer}>
    <div className={tableStyles.tableHeader}>
      <h3 className={tableStyles.tableTitle}>{title}</h3>
    </div>

    <div className={`${tableStyles.tableOverflow} ${maxVisibleRows ? tableStyles.scrollableRows : ''}`} style={ maxVisibleRows ? { ['--visible-rows']: maxVisibleRows } : {} }>
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
            {Array.from({ length: maxVisibleRows || 5 }).map((_, rIdx) => (
              <tr key={rIdx} className={tableStyles.tableRow}>
                {headers.map((_, cIdx) => (
                  <td key={cIdx} className={tableStyles.tableCell}>
                    <div style={{ width: '80%', height: 12, background: '#e5e7eb', borderRadius: 4 }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        data.length > 0 ? (
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
                    <td key={j} className={tableStyles.tableCell}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={tableStyles.emptyState}>
            No articles yet.
          </div>
        )
      )}
    </div>
  </div>
);

const FeedbackPieChart = ({ data, title, activities, onBrowse, pieRange, setPieRange }) => {
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
      <h3 className={chartStyles.chartTitle}>{title}</h3>

      {/* Inline range selector for Feedback Distribution (Days/Week/Month) */}
      {setPieRange && (
        <div style={{ position: 'absolute', right: 12, top: 8 }}>
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
      )}

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

const ArticleTrendChart = ({ data, title }) => {
  const chartData = {
    labels: data.map(item => item.month),
    datasets: [
      {
        label: 'Positive Feedback',
        data: data.map(item => item.dataset1),
        fill: false,
        borderColor: '#3B82F6',
        backgroundColor: '#3B82F6',
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Negative Feedback',
        data: data.map(item => item.dataset2),
        fill: false,
        borderColor: '#EF4444',
        backgroundColor: '#EF4444',
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

const KnowledgeBaseTab = ({ chartRange, setChartRange }) => {
  const navigate = useNavigate();
  const [kbDataState, setKbDataState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pieRange, setPieRange] = useState('days');

  const stats = kbDataState ? [
    { label: 'Articles', count: (kbDataState.articles || []).length },
    { label: 'Categories', count: (kbDataState.categories || []).length }
  ] : [{ label: 'Articles', count: 0 }, { label: 'Categories', count: 0 }];

  const kbData = kbDataState || {
    tableData: [],
    pieData: [
      { name: 'Helpful', value: 85, fill: '#3B82F6' },
      { name: 'Neutral', value: 23, fill: '#F59E0B' },
      { name: 'Not Helpful', value: 12, fill: '#EF4444' }
    ],
    lineData: [
      { month: 'Jun', dataset1: 45, dataset2: 8 },
      { month: 'Jul', dataset1: 52, dataset2: 12 },
      { month: 'Aug', dataset1: 38, dataset2: 5 }
    ]
  };

  const activityTimeline = [
    { time: "09:30 AM", action: "Article 'Password Reset' received feedback", type: "feedback" },
    { time: "11:15 AM", action: "5 new positive feedbacks on VPN guide", type: "feedback" },
    { time: "02:45 PM", action: "Article 'Two-Factor Auth' updated", type: "update" },
    { time: "04:20 PM", action: "3 negative feedbacks on troubleshooting guide", type: "feedback" },
  ];

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    Promise.allSettled([kbService.listArticles(), kbService.listCategories()])
      .then(([articlesRes, categoriesRes]) => {
        if (!mounted) return;

        const articles = (articlesRes.status === 'fulfilled' && Array.isArray(articlesRes.value)) ? articlesRes.value : (Array.isArray(articlesRes.value) ? articlesRes.value : []);
        const categories = (categoriesRes.status === 'fulfilled' && Array.isArray(categoriesRes.value)) ? categoriesRes.value : (Array.isArray(categoriesRes.value) ? categoriesRes.value : []);

        // Normalize categories to map id->name for lookup
        const categoryMap = (categories || []).reduce((acc, c) => {
          const id = c.id ?? c.value ?? c.name ?? String(c);
          const name = c.name ?? c.label ?? c.value ?? String(c);
          acc[id] = name;
          return acc;
        }, {});

        const formatDate = (d) => {
          if (!d) return '';
          try {
            const dt = new Date(d);
            if (Number.isNaN(dt.getTime())) return String(d);
            const mm = String(dt.getMonth() + 1).padStart(2, '0');
            const dd = String(dt.getDate()).padStart(2, '0');
            const yyyy = dt.getFullYear();
            return `${mm}/${dd}/${yyyy}`;
          } catch (e) {
            return String(d);
          }
        };

        const tableData = (articles || []).map(a => ({
          id: `A-${String(a.id || a.articleId || '').padStart(3, '0')}`,
          title: a.title || a.subject || a.name || '',
          category: categoryMap[a.category_id] || categoryMap[a.category] || (a.category && (a.category.name || a.category.title)) || a.category || '',
          lastFeedback: formatDate(a.date_modified || a.updated_at || a.dateModified || a.date_created || a.created_at || a.created || ''),
          likes: (a.likes != null) ? a.likes : 0,
          dislikes: (a.dislikes != null) ? a.dislikes : 0,
        }));

        setKbDataState({ articles, categories, tableData, pieData: kbData.pieData, lineData: kbData.lineData });
      })
      .catch((e) => console.warn('[KB] failed to fetch articles/categories', e))
      .finally(() => { if (mounted) setIsLoading(false); });

    return () => { mounted = false; };
  }, []);

  return (
    <>
      <div className={styles.statusCardsGrid} style={{ marginTop: 12 }}>
        {stats.map((stat, i) => (
          <StatCard
            key={i}
            label={stat.label}
            count={stat.count}
            onClick={() => navigate('/admin/knowledge/articles')}
          />
        ))}
      </div>

      <DataTable
        title="Last Feedback Articles"
        headers={['ID', 'Title', 'Category', 'Last Feedback', 'Likes', 'Dislikes']}
        data={kbData.tableData}
        maxVisibleRows={5}
        loading={isLoading}
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
          <FeedbackPieChart
            data={kbData.pieData}
            title="Feedback Distribution"
            activities={activityTimeline}
            onBrowse={() => navigate('/admin/knowledge/articles')}
            pieRange={pieRange}
            setPieRange={setPieRange}
          />
          <ArticleTrendChart
            data={kbData.lineData}
            title="Feedback Trend"
          />
        </div>
      </div>

      
    </>
  );
};

export default KnowledgeBaseTab;
